"use client";
import { useLanguage } from "@/context/LanguageContext";

import React, { useState, useEffect } from "react";
import { Download, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Capacitor } from "@capacitor/core";
import { useAppVersion } from "@/hooks/useAppVersion";
import { isNewerVersion } from "@/lib/app-version";

const GITHUB_REPO = "naylinhtunit/GlobalPay-Releases";
export function AppUpdater() {
  const { t } = useLanguage();
  const [show, setShow] = useState(false);
  const [latestTag, setLatestTag] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const currentVersion = useAppVersion();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Detect native platform: Capacitor Android OR Tauri desktop
    const capPlatform = (() => {
      try { return Capacitor.getPlatform(); } catch { return "web"; }
    })();
    const isCapNative = (() => {
      try { return Capacitor.isNativePlatform(); } catch { return false; }
    })();
    const isTauri = typeof (window as any).__TAURI__ !== "undefined" || typeof (window as any).__TAURI_INTERNALS__ !== "undefined";
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";

    let assetName: string | null = null;
    if (isCapNative && capPlatform === "android") {
      assetName = "GlobalPay.apk";
    } else if (isTauri) {
      // Detect OS for Tauri: use UA
      if (/Mac/i.test(ua) || /Darwin/i.test(ua)) assetName = "GlobalPay.dmg";
      else if (/Win/i.test(ua)) assetName = "GlobalPay.exe";
      else assetName = "GlobalPay.dmg"; // fallback to dmg
    } else {
      return; // not a native app - no update check
    }

    let cancelled = false;

    async function check() {
      try {
        const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
          headers: { Accept: "application/vnd.github+json" },
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        const tag = data?.tag_name as string | undefined;
        const asset = (data?.assets as any[])?.find((a: any) => a.name === assetName);
        if (!tag || !asset) return;

        // Don't show if already on latest or dismissed
        const dismissed = localStorage.getItem("globalpay_update_dismissed");
        if (dismissed === tag) return;

        if (isNewerVersion(tag, currentVersion)) {
          if (!cancelled) {
            setLatestTag(tag);
            setDownloadUrl(asset.browser_download_url || `https://github.com/${GITHUB_REPO}/releases/download/${tag}/${assetName}`);
            setShow(true);
          }
        }
      } catch (e) {
        console.warn("AppUpdater check failed", e);
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [currentVersion]);

  const handleDismiss = () => {
    if (latestTag) localStorage.setItem("globalpay_update_dismissed", latestTag);
    setShow(false);
  };

  const handleUpdate = () => {
    if (!downloadUrl) return;
    // Open in system browser / download
    window.open(downloadUrl, "_blank");
    // Keep prompt until installed - user can dismiss
  };

  if (!show || !latestTag) return null;

  return (
    <div className="fixed bottom-6 left-0 right-0 z-[100] px-4 animate-in slide-in-from-bottom-10 duration-500">
      <Card className="max-w-md mx-auto p-4 shadow-2xl border-primary/20 bg-card/95 backdrop-blur-sm flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20">
          <RefreshCw size={24} />
        </div>
        <div className="flex-1 overflow-hidden">
          <h3 className="text-sm font-bold truncate">{t("Update Available —")} {latestTag}</h3>
          <p className="text-xs text-muted-foreground truncate">{t("Tap to download & install")} {latestTag}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleUpdate} className="bg-primary hover:bg-primary/90 text-xs font-bold gap-1.5 h-9">
            <Download size={14} /> {t("Update")} </Button>
          <Button variant="ghost" size="icon" onClick={handleDismiss} className="h-9 w-9 text-muted-foreground hover:bg-muted">
            <X size={16} />
          </Button>
        </div>
      </Card>
    </div>
  );
}
