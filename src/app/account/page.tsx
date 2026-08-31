"use client";

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

export default function AccountPage() {
  const { country, setCountry } = useCountry();
  const { user } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const { toast } = useToast();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const handleSignOut = async () => {
    try {
      if (!auth) throw new Error("Authentication service is not ready");
      await signOut(auth);
      toast({ title: "Signed Out", description: "Logged out successfully." });
      router.replace("/login");
    } catch {
      toast({ title: "Error", description: "Failed to sign out.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="md:pl-64 pt-4 md:pt-8 pb-24 md:pb-8">
        <div className="max-w-2xl mx-auto px-4 md:px-6 space-y-6">
          <div className="flex items-center gap-3 pt-2">
            <Shield size={28} strokeWidth={2.5} className="text-primary" />
            <h1 className="text-xl font-black">Account</h1>
          </div>

          {user && (
            <div className="flex items-center gap-3 px-4 py-4 bg-card border rounded-2xl shadow-sm">
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <User size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black truncate">{user.email}</p>
                <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">Admin Level</p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="px-1 text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">Country</p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-start gap-2 h-12 rounded-xl">
                  <Globe size={16} className="text-primary" />
                  <span className="flex-1 text-left font-bold text-xs uppercase tracking-wider truncate">{country}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl">
                <DropdownMenuItem onClick={() => setCountry("Japan")} className="gap-2 py-3 font-bold text-xs uppercase tracking-wider">
                  <span className="text-lg">🇯🇵</span> Japan (JPY)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCountry("Myanmar")} className="gap-2 py-3 font-bold text-xs uppercase tracking-wider">
                  <span className="text-lg">🇲🇲</span> Myanmar (MMK)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="space-y-2">
            <p className="px-1 text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">Appearance</p>
            <Button
              variant="outline"
              className="w-full h-12 justify-between rounded-xl"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              disabled={!mounted}
            >
              <span className="flex items-center gap-2 text-xs font-bold">
                {resolvedTheme === "dark" ? <Moon size={17} /> : <Sun size={17} />}
                Dark Mode
              </span>
              <span className={cn("text-[11px] font-black uppercase tracking-wider", resolvedTheme === "dark" ? "text-primary" : "text-muted-foreground")}>
                {resolvedTheme === "dark" ? "On" : "Off"}
              </span>
            </Button>
          </div>

          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 font-black text-xs uppercase tracking-widest rounded-xl h-12"
            onClick={handleSignOut}
          >
            <LogOut size={16} strokeWidth={2.5} />
            Sign Out
          </Button>
        </div>
      </main>
    </div>
  );
}
