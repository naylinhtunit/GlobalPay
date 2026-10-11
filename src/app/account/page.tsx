"use client";
import { useLanguage } from "@/context/LanguageContext";

import React from "react";
import { Shield, User, Globe, LogOut, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCountry } from "@/context/CountryContext";
import { useAuth, useUser } from "@/firebase";
import { signOut } from "firebase/auth";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Navbar } from "@/components/layout/Navbar";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAppVersion } from "@/hooks/useAppVersion";
import { PayrollSettings } from "@/components/payroll/PayrollSettings";
import { LanguageSelector } from "@/components/LanguageSelector";
import { CheckForUpdatesButton } from "@/components/updater/AppUpdater";
import { CompanyProfileSettings } from "@/components/CompanyProfileSettings";

export default function AccountPage() {
  const { t } = useLanguage();
  const { country, setCountry } = useCountry();
  const { user } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const { toast } = useToast();
  const [mounted, setMounted] = React.useState(false);
  const appVersion = useAppVersion();

  React.useEffect(() => setMounted(true), []);

  const handleSignOut = async () => {
    try {
      if (!auth) throw new Error("Authentication service is not ready");
      await signOut(auth);
      toast({ title: t("Signed Out"), description: t("Logged out successfully.") });
      router.replace("/login");
    } catch {
      toast({ title: t("Error"), description: t("Failed to sign out."), variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="md:pl-64 pt-4 md:pt-8 pb-24 md:pb-8">
        <div className="max-w-2xl mx-auto px-4 md:px-6 space-y-6">
          <div className="flex items-center gap-3 pt-2">
            <Shield size={28} strokeWidth={2.5} className="text-primary" />
            <h1 className="text-xl font-black">{t("Account")}</h1>
          </div>

          {user && (
            <div className="flex items-center gap-3 px-4 py-4 bg-card border rounded-2xl shadow-sm">
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <User size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black truncate">{user.email}</p>
                <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">{t("Admin Level")}</p>
              </div>
            </div>
          )}

          <CompanyProfileSettings />
          <LanguageSelector />
          <div className="space-y-2">
            <p className="px-1 text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">{t("Country")}</p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-start gap-2 h-12 rounded-xl">
                  <Globe size={16} className="text-primary" />
                  <span className="flex-1 text-left font-bold text-xs uppercase tracking-wider truncate">{t(country)}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl">
                <DropdownMenuItem onClick={() => setCountry("Japan")} className="gap-2 py-3 font-bold text-xs uppercase tracking-wider">
                  <span className="text-lg">🇯🇵</span> {t("Japan (JPY)")} </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCountry("Myanmar")} className="gap-2 py-3 font-bold text-xs uppercase tracking-wider">
                  <span className="text-lg">🇲🇲</span> {t("Myanmar (MMK)")} </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="space-y-2">
            <p className="px-1 text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">{t("Appearance")}</p>
            <Button
              variant="outline"
              className="w-full h-12 justify-between rounded-xl"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              disabled={!mounted}
            >
              <span className="flex items-center gap-2 text-xs font-bold">
                {resolvedTheme === "dark" ? <Moon size={17} /> : <Sun size={17} />} {t("Dark Mode")} </span>
              <span className={cn("text-[11px] font-black uppercase tracking-wider", resolvedTheme === "dark" ? "text-primary" : "text-muted-foreground")}>
                {resolvedTheme === "dark" ? t("On") : t("Off")}
              </span>
            </Button>
          </div>

          {country === "Japan" && <PayrollSettings />}

          <div className="rounded-xl border bg-card px-4 py-3 flex items-center justify-between gap-3">
            <span className="text-sm font-semibold">{t("App Version")}</span>
            <span className="text-sm font-mono text-muted-foreground">{t("v")}{appVersion}</span>
          </div>
          <CheckForUpdatesButton />

          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 font-black text-xs uppercase tracking-widest rounded-xl h-12"
            onClick={handleSignOut}
          >
            <LogOut size={16} strokeWidth={2.5} /> {t("Sign Out")} </Button>
        </div>
      </main>
    </div>
  );
}
