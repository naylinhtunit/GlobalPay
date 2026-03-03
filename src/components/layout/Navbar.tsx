
"use client";

import React from "react";
import { Globe, LayoutDashboard, Users, FileText, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCountry } from "@/context/CountryContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { country, setCountry } = useCountry();
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Employees", href: "/employees", icon: Users },
    { name: "Payroll", href: "/payroll", icon: FileText },
  ];

  return (
    <nav className="fixed left-0 top-0 h-full w-64 bg-card border-r flex flex-col z-50">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-primary tracking-tight">GlobalPay</h1>
      </div>

      <div className="flex-1 px-4 space-y-2 mt-4">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
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

      <div className="p-4 border-t space-y-4">
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

        <div className="flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground hover:text-destructive cursor-pointer transition-colors">
          <LogOut size={18} />
          Sign Out
        </div>
      </div>
    </nav>
  );
}
