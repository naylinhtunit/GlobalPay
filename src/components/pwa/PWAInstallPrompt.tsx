
"use client";

import React, { useState, useEffect } from "react";
import { Download, X, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed or running as standalone
    const checkStandalone = () => {
      if (typeof window === 'undefined') return false;
      return (
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true
      );
    };

    setIsStandalone(checkStandalone());

    const handler = (e: any) => {
      // Prevent the default browser prompt
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      // Show our custom UI if not already in standalone mode
      if (!checkStandalone()) {
        setShowPrompt(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handler);

    window.addEventListener("appinstalled", () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
      console.log("PWA was installed");
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the browser install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);

    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  if (!showPrompt || isStandalone) return null;

  return (
    <div className="fixed bottom-6 left-0 right-0 z-[100] px-4 animate-in slide-in-from-bottom-10 duration-500">
      <Card className="max-w-md mx-auto p-4 shadow-2xl border-primary/20 bg-card/95 backdrop-blur-sm flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20">
          <Shield size={28} />
        </div>
        <div className="flex-1 overflow-hidden">
          <h3 className="text-sm font-bold truncate">Install GlobalPay App</h3>
          <p className="text-xs text-muted-foreground truncate">Add to home screen for quick access</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            onClick={handleInstallClick}
            className="bg-primary hover:bg-primary/90 text-xs font-bold gap-1.5 h-9"
          >
            <Download size={14} />
            Install
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setShowPrompt(false)}
            className="h-9 w-9 text-muted-foreground hover:bg-muted"
          >
            <X size={16} />
          </Button>
        </div>
      </Card>
    </div>
  );
}
