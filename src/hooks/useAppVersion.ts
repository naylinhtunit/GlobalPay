"use client";

import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { APP_VERSION } from "@/lib/app-version";

export function useAppVersion() {
  const [version, setVersion] = useState(APP_VERSION);
  useEffect(() => {
    let active = true;
    if (Capacitor.isNativePlatform()) {
      App.getInfo().then(info => { if (active && info.version) setVersion(info.version); }).catch(() => {});
    }
    // Tauri packages and web/PWA use the version bundled with this frontend.
    return () => { active = false; };
  }, []);
  return version;
}
