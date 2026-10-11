"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, LoaderCircle, RefreshCw } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { checkNativeUpdate, downloadNativeUpdate, installNativeUpdate, isNativeUpdaterAvailable, updateErrorKey, type UpdateInfo } from "@/lib/native-updater";

type Phase = "idle" | "checking" | "available" | "downloading" | "installing" | "ready" | "latest" | "error";
const CHECK_EVENT = "globalpay:check-update";

/** One updater at the root: changing routes/languages never starts a second download. */
export function AppUpdater() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [percent, setPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const operation = useRef(false);
  const downloaded = useRef(false);
  const dismissed = useRef<string | null>(null);
  const lastCheck = useRef(0);
  const active = useRef(true);

  const check = useCallback(async (manual = false) => {
    if (!isNativeUpdaterAvailable() || operation.current || downloaded.current) {
      if (manual && downloaded.current) setOpen(true);
      return;
    }
    if (!manual && Date.now() - lastCheck.current < 10 * 60 * 1000) return;
    operation.current = true;
    if (manual) { setOpen(true); setPhase("checking"); setError(null); }
    try {
      const next = await checkNativeUpdate();
      if (!active.current) return;
      lastCheck.current = Date.now();
      setInfo(next.available ? next : null);
      setPhase(next.available ? "available" : "latest");
      setError(null); setConsent(false);
      if (manual || (next.available && dismissed.current !== next.version)) setOpen(true);
    } catch (error) {
      if (active.current && manual) { setError(updateErrorKey(error)); setPhase("error"); }
    } finally { operation.current = false; }
  }, []);

  useEffect(() => {
    active.current = true;
    void check();
    const manual = () => { void check(true); };
    const visible = () => { if (document.visibilityState === "visible") void check(); };
    const online = () => { void check(); };
    const interval = window.setInterval(online, 6 * 60 * 60 * 1000);
    window.addEventListener(CHECK_EVENT, manual);
    window.addEventListener("online", online);
    document.addEventListener("visibilitychange", visible);
    return () => {
      active.current = false;
      window.clearInterval(interval);
      window.removeEventListener(CHECK_EVENT, manual);
      window.removeEventListener("online", online);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [check]);

  const start = async () => {
    if (!info || operation.current) return;
    operation.current = true;
    setError(null); setConsent(false);
    try {
      if (!downloaded.current) {
        setPhase("downloading"); setPercent(0);
        await downloadNativeUpdate(value => { if (active.current) setPercent(value); });
        downloaded.current = true;
      }
      setPhase("installing");
      await installNativeUpdate();
      // Android installer is external OS UI. This is not a claim of installation success.
      if (active.current) setPhase("ready");
    } catch (error) {
      if (active.current) {
        const message = updateErrorKey(error);
        if (message === "The update could not be verified. Nothing was installed. Please try again.") downloaded.current = false;
        setError(message); setPhase("error");
      }
    } finally { operation.current = false; }
  };
  const busy = phase === "checking" || phase === "downloading" || phase === "installing";
  const close = () => {
    if (busy) return;
    dismissed.current = info?.version || null;
    setOpen(false); setConsent(false);
  };

  return (
    <Dialog open={open} onOpenChange={value => { if (!value) close(); }}>
      <DialogContent className={`z-[200] w-[calc(100%-2rem)] rounded-2xl max-w-md max-h-[90dvh] overflow-y-auto ${busy ? "[&>button:last-child]:hidden" : ""}`} onEscapeKeyDown={event => { if (busy) event.preventDefault(); }} onInteractOutside={event => { if (busy) event.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle>{info ? t("GlobalPay {version} is ready", { version: info.version }) : t("App Updates")}</DialogTitle>
          <DialogDescription>
            {!info ? t("Check for a newer GlobalPay version without leaving the app.") : info.platform === "android" ? t("Download here, then confirm installation in Android. Your login and saved data stay on this device.")
              : info.platform === "macos" ? t("GlobalPay will download, replace the app and restart. Your login and saved data are kept.")
              : t("GlobalPay will download and open the Windows installer. Your login and saved data are kept.")}
          </DialogDescription>
        </DialogHeader>
        {phase === "checking" && <p role="status" className="text-sm">{t("Checking for updates…")}</p>}
        {phase === "latest" && <p role="status" className="text-sm">{t("You are using the latest version.")}</p>}
        {(phase === "downloading" || phase === "installing" || phase === "ready") && <div aria-live="polite" className="space-y-2">
          <p className="text-sm font-semibold">{phase === "downloading" ? t("Downloading update — {percent}%", { percent }) : phase === "installing" ? t("Preparing installation…") : t("Installer opened. Confirm the update in the system installer.")}</p>
          <div role="progressbar" aria-label={t("Update download")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className="h-2 rounded-full overflow-hidden bg-muted">
            <div className="h-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />
          </div>
        </div>}
        {error && <p role="alert" className="text-sm text-destructive break-words">{t(error)}</p>}
        {consent && <p className="rounded-xl bg-muted p-3 text-sm">{t("Save any unfinished payroll forms before continuing. Updating may close and restart GlobalPay.")}</p>}
        {info && !busy && <Button className="w-full gap-2" onClick={() => { if (consent) void start(); else setConsent(true); }}>
          <Download size={17} />
          {consent ? t("Save completed — continue") : downloaded.current ? t("Install update") : info.platform === "macos" ? t("Update and restart") : t("Update now")}
        </Button>}
        {busy && <Button disabled className="w-full gap-2"><LoaderCircle className="animate-spin" size={17} />{t("Please wait…")}</Button>}
        {phase === "error" && !info && <Button onClick={() => void check(true)}>{t("Try again")}</Button>}
        {!busy && <Button variant="ghost" onClick={close}>{t("Close")}</Button>}
      </DialogContent>
    </Dialog>
  );
}

export function CheckForUpdatesButton() {
  const { t } = useLanguage();
  const [native, setNative] = useState(false);
  useEffect(() => setNative(isNativeUpdaterAvailable()), []);
  if (!native) return null;
  return <Button variant="outline" className="w-full gap-2" onClick={() => window.dispatchEvent(new Event(CHECK_EVENT))}><RefreshCw size={16} />{t("Check for updates")}</Button>;
}
