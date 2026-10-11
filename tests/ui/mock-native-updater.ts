import { updateErrorKey } from "../../src/lib/native-updater";
export { updateErrorKey };
export type UpdateInfo = { available: boolean; version: string; platform: "android" | "macos" | "windows" };
export const fixture = { native: true, platform: "android" as UpdateInfo["platform"], error: "", latest: false, downloads: 0, installs: 0, checks: 0 };
export const isNativeUpdaterAvailable = () => fixture.native;
export async function checkNativeUpdate(): Promise<UpdateInfo> {
  fixture.checks++;
  await new Promise(resolve => setTimeout(resolve, 100));
  if (fixture.error === "check") throw new Error("offline");
  return { available: !fixture.latest, version: "1.0.23", platform: fixture.platform };
}
export async function downloadNativeUpdate(progress: (value: number) => void) {
  fixture.downloads++;
  for (const value of [0, 25, 70, 100]) {
    await new Promise(resolve => setTimeout(resolve, 300)); progress(value);
    if (fixture.error === "download" && value === 25) throw new Error("update_invalid");
  }
}
export async function installNativeUpdate() {
  fixture.installs++;
  if (fixture.error === "permission") throw new Error("install_permission_required");
  if (fixture.error === "install") throw new Error("update_install_failed");
}
