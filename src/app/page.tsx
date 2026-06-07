"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCountry } from "@/context/CountryContext";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { Users, CreditCard, CalendarCheck, TrendingUp, ArrowUpRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { country, currency } = useCountry();
  const { user } = useUser();
  const firestore = useFirestore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const empQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, "employees"), 
      where("country", "==", country),
      where("companyId", "==", user.uid)
    );
  }, [firestore, country, user]);

  const payrollQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, "payrollRecords"), 
      where("country", "==", country),
      where("companyId", "==", user.uid)
    );
  }, [firestore, country, user]);

  const { data: employees } = useCollection(empQuery);
  const { data: payrollRecords } = useCollection(payrollQuery);

  const sortedRecentRecords = useMemo(() => {
    if (!payrollRecords) return [];
    return [...payrollRecords].sort((a: any, b: any) => 
      (b.payPeriodStartDate || "").localeCompare(a.payPeriodStartDate || "")
    ).slice(0, 3);
  }, [payrollRecords]);

  const employeeCount = employees?.length || 0;
  const totalPayroll = (employees || []).reduce((acc, emp: any) => acc + (emp.baseSalary || 0), 0);

  if (!mounted) return null;

  return (
    <div className="md:pl-64 pt-16 md:pt-0 min-h-screen bg-[#F8FAFC]">
      <Navbar />
      <main className="p-4 md:p-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">GlobalPay Overview for {country}</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {[
            { title: "Active Employees", value: employeeCount, sub: `In ${country} region`, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
            { title: "Total Base Salary", value: `${totalPayroll.toLocaleString()} ${currency}`, sub: "Monthly total", icon: CreditCard, color: "text-emerald-600", bg: "bg-emerald-50" },
            { title: "Payroll Runs", value: payrollRecords?.length || 0, sub: "Historical records", icon: CalendarCheck, color: "text-amber-600", bg: "bg-amber-50" },
            { title: "Compliance", value: "100%", sub: "All regions", icon: TrendingUp, color: "text-indigo-600", bg: "bg-indigo-50" },
          ].map((stat, idx) => (
            <Card key={idx} className="border-none shadow-sm hover:shadow-md transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{stat.title}</CardTitle>
                <div className={cn("p-2 rounded-lg", stat.bg)}>
                  <stat.icon className={cn("h-4 w-4", stat.color)} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-slate-900">{stat.value}</div>
                <p className="text-[11px] font-medium text-slate-400 mt-1">{stat.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          <Card className="lg:col-span-2 border-none shadow-sm overflow-hidden">
            <CardHeader className="border-b bg-white/50 py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Clock size={16} className="text-slate-400" /> Recent Activity
                </CardTitle>
                <button className="text-[11px] font-bold text-primary hover:underline">View All</button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {sortedRecentRecords.map((rec: any, i) => (
                  <div key={rec.id} className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors">
                    <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">Payroll for {(employees || []).find(e => e.id === rec.employeeId)?.fullName || 'Employee'}</p>
                      <p className="text-[11px] font-medium text-slate-400">{rec.payPeriodStartDate?.substring(0, 7) || 'Date N/A'}</p>
                    </div>
                    <ArrowUpRight size={14} className="text-slate-300" />
                  </div>
                ))}
                {sortedRecentRecords.length === 0 && (
                   <p className="text-sm text-slate-400 text-center py-12 italic">No recent activity recorded.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-primary text-primary-foreground">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-white/90">Regional Compliance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
               <div className="space-y-4">
                  {[
                    { label: "Tax Filings", status: "Verified", progress: 100 },
                    { label: "Social Security", status: "Active", progress: 100 },
                    { label: "Labor Standards", status: "Compliant", progress: 100 }
                  ].map((item, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider">
                        <span className="text-white/70">{item.label}</span>
                        <span>{item.status}</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                        <div className="h-full bg-white w-full" />
                      </div>
                    </div>
                  ))}
               </div>
               <div className="pt-4 border-t border-white/10">
                 <p className="text-[10px] leading-relaxed opacity-70 italic font-medium">All payroll calculations are processed according to the latest regional tax laws and employment regulations.</p>
               </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
