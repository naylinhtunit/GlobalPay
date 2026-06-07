"use client";

import React, { useState, useEffect } from "react";
import { Shield, LayoutDashboard, Users, FileText, LogOut, Menu, User, Globe, Sun, Moon, Calendar as CalendarIcon } from "lucide-react";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export function Navbar() {
  const { country, setCountry } = useCountry();
  const { user } = useUser();
  const auth = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Employees", href: "/employees", icon: Users },
    { name: "Payroll", href: "/payroll", icon: FileText },
    { name: "Calendar", href: "/calendar", icon: CalendarIcon },
  ];

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast({ title: "Signed Out", description: "Logged out successfully." });
      router.replace("/login");
    } catch (error) {
      toast({ title: "Error", description: "Failed to sign out.", variant: "destructive" });
    }
  };

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <div className="space-y-1.5 mt-8">
      {navItems.map((item) => (
        <Link key={item.href} href={item.href} onClick={onClick}>
          <span
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer",
              pathname === item.href
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
            )}
          >
            <item.icon size={16} strokeWidth={2.5} />
            {item.name}
          </span>
        </Link>
      ))}
    </div>
  );

  const CountrySwitcher = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-start gap-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all rounded-xl h-11">
          <Globe size={16} className="text-primary" />
          <span className="flex-1 text-left font-bold text-xs uppercase tracking-wider truncate dark:text-slate-200">{country}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 border-none shadow-2xl rounded-xl dark:bg-slate-900">
        <DropdownMenuItem onClick={() => setCountry("Japan")} className="gap-2 cursor-pointer py-3 font-bold text-xs uppercase tracking-wider dark:hover:bg-slate-800">
          <span className="text-lg">🇯🇵</span> Japan (JPY)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setCountry("Myanmar")} className="gap-2 cursor-pointer py-3 font-bold text-xs uppercase tracking-wider dark:hover:bg-slate-800">
          <span className="text-lg">🇲🇲</span> Myanmar (MMK)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const ThemeToggle = () => {
    if (!mounted) return <div className="h-11 w-11" />;
    const isDark = resolvedTheme === "dark";
    return (
      <Button 
        variant="outline" 
        size="icon" 
        className="shrink-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all rounded-xl h-11 w-11"
        onClick={() => setTheme(isDark ? "light" : "dark")}
      >
        <Sun className={cn(
          "h-5 w-5 transition-all duration-500",
          isDark ? "-rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
        )} />
        <Moon className={cn(
          "absolute h-5 w-5 transition-all duration-500",
          isDark ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-0 opacity-0"
        )} />
      </Button>
    );
  };

  return (
    <>
      <nav className="hidden md:flex fixed left-0 top-0 h-full w-64 bg-background dark:bg-slate-950 border-r border-slate-100 dark:border-slate-900 flex flex-col z-50 shadow-sm transition-colors duration-300">
        <div className="p-8">
          <div className="flex items-center gap-3 text-primary">
            <Shield size={32} strokeWidth={2.5} />
            <h1 className="text-2xl font-black tracking-tighter">GlobalPay</h1>
          </div>
        </div>
        <div className="flex-1 px-4">
          <NavLinks />
        </div>
        <div className="p-6 border-t border-slate-50 dark:border-slate-900 space-y-4 bg-slate-50/50 dark:bg-slate-900/30">
          {user && (
            <div className="px-3 py-3 flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <User size={20} strokeWidth={2.5} />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-black truncate capitalize text-slate-900 dark:text-slate-100">{user.email?.split('@')[0]}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Admin Level</p>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <CountrySwitcher />
            <ThemeToggle />
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-2 text-slate-400 dark:text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 font-black text-xs uppercase tracking-widest rounded-xl"
            onClick={handleSignOut}
          >
            <LogOut size={16} strokeWidth={2.5} />
            Sign Out
          </Button>
        </div>
      </nav>
      <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-background dark:bg-slate-950 border-b border-slate-100 dark:border-slate-900 flex items-center justify-between px-4 z-50 shadow-sm">
        <Link href="/">
          <div className="flex items-center gap-2 text-primary">
            <Shield size={28} strokeWidth={2.5} />
            <h1 className="text-xl font-black tracking-tight">GlobalPay</h1>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="hover:bg-slate-50 dark:hover:bg-slate-900">
                <Menu size={24} />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 flex flex-col border-none shadow-2xl dark:bg-slate-950">
              <SheetHeader className="p-6 text-left border-b border-slate-50 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/30">
                <SheetTitle className="flex items-center gap-2 text-primary">
                  <Shield size={28} strokeWidth={2.5} />
                  <span className="text-xl font-black">GlobalPay</span>
                </SheetTitle>
              </SheetHeader>
              <div className="flex-1 px-4">
                <NavLinks onClick={() => setIsOpen(false)} />
              </div>
              <div className="p-6 border-t border-slate-50 dark:border-slate-900 space-y-4 bg-slate-50/50 dark:bg-slate-900/30">
                {user && (
                  <div className="flex items-center gap-3 px-3 py-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm">
                    <User size={18} className="text-primary" />
                    <p className="text-xs font-black truncate dark:text-slate-200">{user.email}</p>
                  </div>
                )}
                <CountrySwitcher />
                <Button 
                  variant="ghost" 
                  className="w-full justify-start gap-2 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 font-black text-xs uppercase tracking-widest"
                  onClick={handleSignOut}
                >
                  <LogOut size={16} strokeWidth={2.5} />
                  Sign Out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>
    </>
  );
}
