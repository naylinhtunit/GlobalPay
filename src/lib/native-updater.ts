import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

export type UpdatePlatform = "android" | "macos" | "windows";
export interface UpdateInfo { available: boolean; version: string; platform: UpdatePlatform }
interface AndroidUpdater {
  checkForUpdate(): Promise<UpdateInfo>;
  downloadUpdate(): Promise<void>;
  installUpdate(): Promise<void>;
  addListener(name: "downloadProgress", listener: (value: { percent: number }) => void): Promise<PluginListenerHandle>;
}
const android = registerPlugin<AndroidUpdater>("AppUpdater");

export function isNativeUpdaterAvailable(): boolean {
  if (typeof window === "undefined") return false;
  if (Capacitor.isNativePlatform()) return Capacitor.getPlatform() === "android";
  return "__TAURI_INTERNALS__" in window;
}

export async function checkNativeUpdate(): Promise<UpdateInfo> {
  if (!isNativeUpdaterAvailable()) throw new Error("update_platform_unavailable");
  if (Capacitor.isNativePlatform()) return android.checkForUpdate();
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<UpdateInfo>("update_check");
}

export async function downloadNativeUpdate(onProgress: (percent: number) => void): Promise<void> {
  if (!isNativeUpdaterAvailable()) throw new Error("update_platform_unavailable");
  const report = ({ percent }: { percent: number }) => {
    if (Number.isFinite(percent)) onProgress(Math.max(0, Math.min(100, Math.round(percent))));
  };
  if (Capacitor.isNativePlatform()) {
    const listener = await android.addListener("downloadProgress", report);
    try { await android.downloadUpdate(); } finally { await listener.remove(); }
  } else {
    const { invoke, Channel } = await import("@tauri-apps/api/core");
    const progress = new Channel<{ percent: number }>();
    progress.onmessage = report;
    await invoke("update_download", { progress });
  }
  onProgress(100);
}

export async function installNativeUpdate(): Promise<void> {
  if (!isNativeUpdaterAvailable()) throw new Error("update_platform_unavailable");
  if (Capacitor.isNativePlatform()) return android.installUpdate();
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke("update_install");
}

export function updateErrorKey(error: unknown): string {
  const code = error instanceof Error ? error.message : String(error);
  if (code.includes("install_permission_required")) return "Allow GlobalPay to install updates in Android Settings, then try again.";
  if (code.includes("update_move_to_applications")) return "Move GlobalPay to Applications and open it there before updating.";
  if (code.includes("update_location_readonly")) return "The app folder is read-only. Move GlobalPay to a writable Applications folder.";
  if (code.includes("update_invalid") || code.includes("release_invalid")) return "The update could not be verified. Nothing was installed. Please try again.";
  if (code.includes("update_platform_unavailable")) return "An update package for this device is not available yet.";
  if (code.includes("update_install_failed")) return "Unable to open the installer. Please try again.";
  return "Unable to update. Check your connection and try again.";
}
