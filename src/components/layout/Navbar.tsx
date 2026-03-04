
"use client";

import React, { useState } from "react";
import { Globe, LayoutDashboard, Users, FileText, LogOut, Menu, User, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCountry } from "@/context/CountryContext";
import { useAuth, useUser } from "@/firebase";
import { signOut } from "firebase/auth";
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
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

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
    <div className="space-y-1.5 mt-6">
      {navItems.map((item) => (
        <Link key={item.href} href={item.href} onClick={onClick}>
          <span
            className={cn(
              "flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer group",
              pathname === item.href
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <item.icon size={19} className={cn(pathname === item.href ? "scale-110" : "group-hover:scale-110 transition-transform")} />
            {item.name}
          </span>
        </Link>
      ))}
    </div>
  );

  const CountrySwitcher = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-start gap-3 border-accent/20 h-11 hover:bg-accent/5">
          <Globe size={18} className="text-accent" />
          <span className="flex-1 text-left font-medium">{country}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl">
        <DropdownMenuItem onClick={() => setCountry("Japan")} className="gap-3 py-2.5 cursor-pointer rounded-lg">
          <span className="text-lg">🇯🇵</span> Japan (JPY)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setCountry("Myanmar")} className="gap-3 py-2.5 cursor-pointer rounded-lg">
          <span className="text-lg">🇲🇲</span> Myanmar (MMK)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <nav className="hidden md:flex fixed left-0 top-0 h-full w-64 bg-card border-r flex flex-col z-50 shadow-2xl">
        <div className="p-8">
          <div className="flex items-center gap-2 text-primary mb-1">
            <Shield size={24} />
            <h1 className="text-2xl font-black tracking-tighter">GlobalPay</h1>
          </div>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] opacity-50">Enterprise Edition</p>
        </div>

        <div className="flex-1 px-4">
          <NavLinks />
        </div>

        <div className="p-5 border-t space-y-4 bg-muted/20">
          {user && (
            <div className="px-4 py-3 flex items-center gap-3 bg-card rounded-2xl border shadow-sm">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <User size={18} />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-bold truncate text-primary">{user.email?.split('@')[0]}</p>
                <p className="text-[10px] text-muted-foreground font-medium truncate">Company Account</p>
              </div>
            </div>
          )}
          <CountrySwitcher />
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/5 h-11 font-semibold rounded-xl"
            onClick={handleSignOut}
          >
            <LogOut size={18} />
            Sign Out
          </Button>
        </div>
      </nav>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b flex items-center justify-between px-5 z-50 shadow-md">
        <Link href="/">
          <div className="flex items-center gap-2 text-primary">
            <Shield size={20} />
            <h1 className="text-xl font-black tracking-tighter">GlobalPay</h1>
          </div>
        </Link>

        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden hover:bg-muted rounded-xl">
              <Menu size={24} />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[85%] p-0 flex flex-col border-r-0 rounded-r-3xl">
            <SheetHeader className="p-8 text-left border-b bg-primary/5">
              <SheetTitle className="flex items-center gap-2 text-primary">
                <Shield size={22} />
                <span className="text-2xl font-black tracking-tighter">GlobalPay</span>
              </SheetTitle>
            </SheetHeader>
            <div className="flex-1 px-5 overflow-y-auto">
              <NavLinks onClick={() => setIsOpen(false)} />
            </div>
            <div className="p-6 border-t space-y-4 bg-muted/20">
              {user && (
                <div className="flex items-center gap-3 px-4 py-3 border border-primary/10 rounded-2xl bg-card shadow-sm">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <User size={18} />
                  </div>
                  <p className="text-xs font-bold truncate flex-1">{user.email}</p>
                </div>
              )}
              <CountrySwitcher />
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/5 h-12 font-bold rounded-2xl"
                onClick={handleSignOut}
              >
                <LogOut size={20} />
                Sign Out
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </header>
    </>
  );
}
