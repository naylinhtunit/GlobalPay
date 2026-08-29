"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Shield,
  Download,
  Smartphone,
  Monitor,
  Laptop,
  CheckCircle2,
  Users,
  FileText,
  Calculator,
  Globe,
  Lock,
  Zap,
  ArrowRight,
  ChevronDown,
  Building2,
  FileSpreadsheet,
} from "lucide-react";

function isNativeApp() {
  if (typeof window === "undefined") return false;
  // Capacitor
  if ((window as any).Capacitor?.isNativePlatform?.()) return true;
  // Tauri
  if ((window as any).__TAURI__ || (window as any).__TAURI_INTERNALS__) return true;
  // Electron
  if ((navigator as any).userAgent?.includes("Electron")) return true;
  return false;
}

export default function LandingPage() {
  const router = useRouter();
  const [isNative] = useState(() => isNativeApp());

  useLayoutEffect(() => {
    if (isNative) router.replace("/login");
  }, [isNative, router]);

  if (isNative) return null;

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 dark:bg-slate-950/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2 text-primary">
            <Shield size={28} strokeWidth={2.5} />
            <span className="text-xl font-black tracking-tight">GlobalPay</span>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 font-bold text-xs md:text-sm h-9 rounded-xl">
                  <Download size={16} />
                  <span className="hidden sm:inline">Download</span>
                  <ChevronDown size={14} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 rounded-xl p-2">
                <DropdownMenuItem asChild className="p-0">
                  <a
                    href="https://github.com/naylinhtunit/GlobalPay/releases/latest/download/GlobalPay.apk"
                    target="_blank"
                    rel="noopener"
                    className="flex items-center gap-3 w-full px-3 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg"
                  >
                    <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <Smartphone size={18} className="text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold">Android App</p>
                      <p className="text-[11px] text-muted-foreground">APK Direct Download</p>
                    </div>
                    <Download size={14} className="text-muted-foreground" />
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="p-0">
                  <a
                    href="https://github.com/naylinhtunit/GlobalPay/releases/latest/download/GlobalPay.dmg"
                    target="_blank"
                    rel="noopener"
                    className="flex items-center gap-3 w-full px-3 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg"
                  >
                    <div className="h-9 w-9 rounded-lg bg-slate-900/10 dark:bg-white/10 flex items-center justify-center">
                      <Monitor size={18} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold">macOS App</p>
                      <p className="text-[11px] text-muted-foreground">.dmg Unsigned</p>
                    </div>
                    <Download size={14} className="text-muted-foreground" />
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="p-0">
                  <a
                    href="https://github.com/naylinhtunit/GlobalPay/releases/latest/download/GlobalPay.exe"
                    target="_blank"
                    rel="noopener"
                    className="flex items-center gap-3 w-full px-3 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg"
                  >
                    <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Laptop size={18} className="text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold">Windows App</p>
                      <p className="text-[11px] text-muted-foreground">.exe Unsigned</p>
                    </div>
                    <Download size={14} className="text-muted-foreground" />
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button asChild className="font-bold rounded-xl h-9 px-5">
              <Link href="/login">Login</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto max-w-7xl px-4 md:px-6 py-12 md:py-20">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border bg-slate-50 dark:bg-slate-900 px-3 py-1 text-xs font-bold">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              Trusted by teams in Japan & Myanmar
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1]">
              Global Payroll,
              <span className="text-primary"> Simplified.</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
              Specialized payroll for <span className="font-bold text-foreground">Japan (JPY)</span> &{" "}
              <span className="font-bold text-foreground">Myanmar (MMK)</span>. Compliance, payslips,
              and workforce management — all in one secure platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg" className="rounded-xl h-12 px-8 font-bold text-base">
                <Link href="/login">
                  Get Started — Login <ArrowRight size={18} className="ml-2" />
                </Link>
              </Button>
            </div>
            <div className="flex items-center gap-6 pt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-green-600" /> No credit card
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-green-600" /> Secure & Compliant
              </span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-blue-500/20 rounded-3xl blur-2xl" />
            <Card className="relative overflow-hidden rounded-3xl border-2 shadow-2xl">
              <div className="bg-slate-900 text-white px-4 py-3 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-red-500" />
                  <span className="h-3 w-3 rounded-full bg-yellow-500" />
                  <span className="h-3 w-3 rounded-full bg-green-500" />
                </div>
                <span className="text-xs font-mono text-slate-400 ml-3">GlobalPay Dashboard — Preview</span>
              </div>
              <CardContent className="p-6 space-y-4 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Employees", value: "248", icon: Users, color: "text-blue-600" },
                    { label: "Payroll Runs", value: "1,240", icon: FileSpreadsheet, color: "text-emerald-600" },
                    { label: "Compliance", value: "100%", icon: Shield, color: "text-primary" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-2xl bg-white dark:bg-slate-900 border p-3 shadow-sm">
                      <s.icon size={16} className={s.color} />
                      <p className="text-lg font-black mt-2">{s.value}</p>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl bg-primary text-primary-foreground p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs opacity-80">Net Pay (This Month)</p>
                    <p className="text-2xl font-black">¥ 248,517</p>
                  </div>
                  <Calculator size={28} className="opacity-60" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-slate-50 dark:bg-slate-900/50 border-y">
        <div className="container mx-auto max-w-7xl px-4 md:px-6 py-16">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-3xl font-black tracking-tight">Built for Japan & Myanmar</h2>
            <p className="text-muted-foreground mt-3">Everything you need to run compliant payroll across borders.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Building2,
                title: "Japan Payroll (JPY)",
                desc: "170.5h divisor, OT 1.25/1.50, Holiday 1.35, Night Alw, Health/Pension/Employment insurance, Income & Resident tax.",
              },
              {
                icon: Globe,
                title: "Myanmar Payroll (MMK)",
                desc: "OT ×2, SSB, progressive income tax, USD↔MMK exchange, attendance & meal allowances.",
              },
              {
                icon: Lock,
                title: "Secure & Compliant",
                desc: "Firebase Auth, Firestore rules, historical salary rates, audit logs, encrypted payslips (PDF/Excel).",
              },
              {
                icon: FileText,
                title: "Payslip Generation",
                desc: "Professional payslips with attendance, earnings, deductions, and net pay — download as PDF or Excel.",
              },
              {
                icon: Zap,
                title: "Calendar & Holidays",
                desc: "Company holidays auto-detected, AI calendar scan (Gemini), Sat/Sun holiday split with shift auto-calc.",
              },
              {
                icon: Users,
                title: "Employee Management",
                desc: "Profiles, salary history, paid leave tracking, department assignment, multi-country support.",
              },
            ].map((f) => (
              <Card key={f.title} className="rounded-2xl border-none shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <f.icon size={22} className="text-primary" />
                  </div>
                  <h3 className="font-black">{f.title}</h3>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>



      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto max-w-7xl px-4 md:px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 font-black text-foreground">
            <Shield size={20} className="text-primary" /> GlobalPay
            <span className="font-normal text-muted-foreground">© 2026 GlobalPay Enterprise</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
