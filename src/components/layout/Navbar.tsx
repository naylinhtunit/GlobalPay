
"use client";

import React, { useState } from "react";
import { Globe, LayoutDashboard, Users, FileText, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCountry } from "@/context/CountryContext";
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
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { country, setCountry } = useCountry();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Employees", href: "/employees", icon: Users },
    { name: "Payroll", href: "/payroll", icon: FileText },
  ];

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <div className="space-y-2 mt-4">
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
        <Button variant="outline" className="w-full justify-start gap-3">
          <Globe size={18} className="text-accent" />
          <span className="flex-1 text-left">{country} ({country === "Japan" ? "JPY" : "MMK"})</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => setCountry("Japan")} className="gap-2">
          🇯🇵 Japan (JPY)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setCountry("Myanmar")} className="gap-2">
          🇲🇲 Myanmar (MMK)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <nav className="hidden md:flex fixed left-0 top-0 h-full w-64 bg-card border-r flex flex-col z-50">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-primary tracking-tight">GlobalPay</h1>
        </div>

        <div className="flex-1 px-4">
          <NavLinks />
        </div>

        <div className="p-4 border-t space-y-4">
          <CountrySwitcher />
          <div className="flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground hover:text-destructive cursor-pointer transition-colors">
            <LogOut size={18} />
            Sign Out
          </div>
        </div>
      </nav>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b flex items-center justify-between px-4 z-50">
        <Link href="/">
          <h1 className="text-xl font-bold text-primary tracking-tight">GlobalPay</h1>
        </Link>

        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu size={24} />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 flex flex-col">
            <SheetHeader className="p-6 text-left border-b">
              <SheetTitle className="text-2xl font-bold text-primary">GlobalPay</SheetTitle>
            </SheetHeader>
            <div className="flex-1 px-4 overflow-y-auto">
              <NavLinks onClick={() => setIsOpen(false)} />
            </div>
            <div className="p-4 border-t space-y-4 bg-muted/20">
              <CountrySwitcher />
              <div className="flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground hover:text-destructive cursor-pointer transition-colors">
                <LogOut size={18} />
                Sign Out
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </header>
    </>
  );
}
