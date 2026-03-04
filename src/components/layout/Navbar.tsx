"use client";

import React, { useState } from "react";
import { Shield, LayoutDashboard, Users, FileText, LogOut, Menu, User, Globe } from "lucide-react";
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
    <div className="space-y-1 mt-4">
      {navItems.map((item) => (
        <Link key={item.href} href={item.href} onClick={onClick}>
          <span
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer",
              pathname === item.href
                ? "bg-primary text-primary-foreground"
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
        <Button variant="outline" className="w-full justify-start gap-2 border-primary/20">
          <Globe size={16} className="text-primary" />
          <span className="flex-1 text-left">{country}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => setCountry("Japan")} className="gap-2 cursor-pointer">
          <span className="text-lg">🇯🇵</span> Japan (JPY)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setCountry("Myanmar")} className="gap-2 cursor-pointer">
          <span className="text-lg">🇲🇲</span> Myanmar (MMK)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <nav className="hidden md:flex fixed left-0 top-0 h-full w-64 bg-card border-r flex flex-col z-50">
        <div className="p-6">
          <div className="flex items-center gap-2 text-primary">
            <Shield size={24} />
            <h1 className="text-xl font-bold tracking-tight">GlobalPay</h1>
          </div>
          <p className="text-[10px] text-muted-foreground font-semibold uppercase mt-1">Enterprise Edition</p>
        </div>

        <div className="flex-1 px-4">
          <NavLinks />
        </div>

        <div className="p-4 border-t space-y-4">
          {user && (
            <div className="px-3 py-2 flex items-center gap-3 bg-muted/50 rounded-lg">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <User size={16} />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-semibold truncate">{user.email?.split('@')[0]}</p>
              </div>
            </div>
          )}
          <CountrySwitcher />
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/5"
            onClick={handleSignOut}
          >
            <LogOut size={18} />
            Sign Out
          </Button>
        </div>
      </nav>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b flex items-center justify-between px-4 z-50">
        <Link href="/">
          <div className="flex items-center gap-2 text-primary">
            <Shield size={24} />
            <h1 className="text-xl font-bold tracking-tight">GlobalPay</h1>
          </div>
        </Link>

        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu size={24} />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 flex flex-col">
            <SheetHeader className="p-6 text-left border-b">
              <SheetTitle className="flex items-center gap-2 text-primary">
                <Shield size={24} />
                <span>GlobalPay</span>
              </SheetTitle>
            </SheetHeader>
            <div className="flex-1 px-4">
              <NavLinks onClick={() => setIsOpen(false)} />
            </div>
            <div className="p-4 border-t space-y-4">
              {user && (
                <div className="flex items-center gap-3 px-3 py-2 border rounded-lg">
                  <User size={16} className="text-primary" />
                  <p className="text-xs font-medium truncate">{user.email}</p>
                </div>
              )}
              <CountrySwitcher />
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
                onClick={handleSignOut}
              >
                <LogOut size={18} />
                Sign Out
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </header>
    </>
  );
}