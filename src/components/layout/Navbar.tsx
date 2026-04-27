
"use client";

import React, { useState, useEffect } from "react";
import { Shield, LayoutDashboard, Users, FileText, LogOut, Menu, User, Globe, Sun, Moon, Monitor } from "lucide-react";
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
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => setMounted(true), []);

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Employees", href: "/employees", icon: Users },
    { name: "Payroll", href: "/payroll", icon: FileText },
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
    <div className="space-y-1 mt-4">
      {navItems.map((item) => (
        <Link key={item.href} href={item.href} onClick={onClick}>
          <span
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer",
              pathname === item.href
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <item.icon size={18} />
            {item.name}
          </span>
        </Link>
      ))}
    </div>
  );

  const CountrySwitcher = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-start gap-2 border-primary/20 bg-background hover:bg-muted transition-all">
          <Globe size={16} className="text-primary" />
          <span className="flex-1 text-left font-medium">{country}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => setCountry("Japan")} className="gap-2 cursor-pointer py-2">
          <span className="text-lg">🇯🇵</span> Japan (JPY)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setCountry("Myanmar")} className="gap-2 cursor-pointer py-2">
          <span className="text-lg">🇲🇲</span> Myanmar (MMK)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const ThemeToggle = () => {
    if (!mounted) return <div className="h-10 w-10" />;
    
    const isDark = resolvedTheme === "dark";
    
    return (
      <Button 
        variant="outline" 
        size="icon" 
        className="shrink-0 border-primary/20 bg-background hover:bg-muted transition-all duration-300 relative group overflow-hidden"
        onClick={() => setTheme(isDark ? "light" : "dark")}
      >
        <Sun className={cn(
          "h-[1.2rem] w-[1.2rem] transition-all duration-500",
          isDark ? "-rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
        )} />
        <Moon className={cn(
          "absolute h-[1.2rem] w-[1.2rem] transition-all duration-500",
          isDark ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-0 opacity-0"
        )} />
        <span className="sr-only">Toggle theme</span>
      </Button>
    );
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <nav className="hidden md:flex fixed left-0 top-0 h-full w-64 bg-card border-r flex flex-col z-50 shadow-sm">
        <div className="p-8">
          <div className="flex items-center gap-3 text-primary">
            <Shield size={32} strokeWidth={2} />
            <h1 className="text-2xl font-bold tracking-tighter text-slate-900 dark:text-slate-100">GlobalPay</h1>
          </div>
          <p className="text-[10px] text-primary/70 font-bold uppercase mt-2 tracking-widest bg-primary/5 px-2 py-1 rounded inline-block">Enterprise</p>
        </div>

        <div className="flex-1 px-4">
          <NavLinks />
        </div>

        <div className="p-6 border-t space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
          {user && (
            <div className="px-3 py-3 flex items-center gap-3 bg-white dark:bg-slate-800 border rounded-xl shadow-sm">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <User size={18} />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate capitalize">{user.email?.split('@')[0]}</p>
                <p className="text-[10px] text-muted-foreground truncate">Administrator</p>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <CountrySwitcher />
            <ThemeToggle />
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/5 font-medium"
            onClick={handleSignOut}
          >
            <LogOut size={18} />
            Sign Out
          </Button>
        </div>
      </nav>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b flex items-center justify-between px-4 z-50 shadow-sm">
        <Link href="/">
          <div className="flex items-center gap-2 text-primary">
            <Shield size={28} />
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">GlobalPay</h1>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="hover:bg-muted">
                <Menu size={24} />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 flex flex-col border-none">
              <SheetHeader className="p-6 text-left border-b bg-slate-50 dark:bg-slate-900">
                <SheetTitle className="flex items-center gap-2 text-primary">
                  <Shield size={28} />
                  <span className="text-xl font-bold text-slate-900 dark:text-slate-100">GlobalPay</span>
                </SheetTitle>
              </SheetHeader>
              <div className="flex-1 px-4">
                <NavLinks onClick={() => setIsOpen(false)} />
              </div>
              <div className="p-6 border-t space-y-4 bg-slate-50 dark:bg-slate-900">
                {user && (
                  <div className="flex items-center gap-3 px-3 py-3 bg-white dark:bg-slate-800 border rounded-xl shadow-sm">
                    <User size={18} className="text-primary" />
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{user.email}</p>
                  </div>
                )}
                <CountrySwitcher />
                <Button 
                  variant="ghost" 
                  className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive font-medium"
                  onClick={handleSignOut}
                >
                  <LogOut size={18} />
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
