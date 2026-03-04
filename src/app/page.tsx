"use client";

import React from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCountry } from "@/context/CountryContext";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { Users, CreditCard, CalendarCheck, TrendingUp } from "lucide-react";

export default function Dashboard() {
  const { country, currency } = useCountry();
  const { firestore } = useFirestore();

  const empQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "employees"), where("country", "==", country));
  }, [firestore, country]);

  const payrollQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "payrollRecords"), where("country", "==", country));
  }, [firestore, country]);

  const { data: employees } = useCollection(empQuery);
  const { data: payrollRecords } = useCollection(payrollQuery);

  const employeeCount = employees?.length || 0;
  const pendingRecords = (payrollRecords || []).filter(r => r.status === "Calculated").length;
  const totalPayroll = employeeCount * (country === "Japan" ? 250000 : 450000);

  return (
    <div className="md:pl-64 pt-16 md:pt-0 min-h-screen">
      <Navbar />
      <main className="p-4 md:p-8">
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-primary">Welcome Back</h2>
          <p className="text-muted-foreground">GlobalPay Overview for {country}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
              <Users className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{employeeCount}</div>
              <p className="text-xs text-muted-foreground">In {country} region</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Est. Monthly Payroll</CardTitle>
              <CreditCard className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalPayroll.toLocaleString()} {currency}
              </div>
              <p className="text-xs text-muted-foreground">Average projection</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Pending Records</CardTitle>
              <CalendarCheck className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingRecords}</div>
              <p className="text-xs text-muted-foreground">Requires attention</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+12%</div>
              <p className="text-xs text-muted-foreground">From last quarter</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(payrollRecords || []).slice(0, 3).map((rec, i) => (
                  <div key={rec.id} className="flex items-center gap-4 p-3 rounded-lg border bg-muted/30">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Payroll generated for employee {rec.employeeId.substring(0, 8)}</p>
                      <p className="text-xs text-muted-foreground">Recent update</p>
                    </div>
                  </div>
                ))}
                {(!payrollRecords || payrollRecords.length === 0) && (
                   <p className="text-sm text-muted-foreground text-center py-4">No recent payroll activity.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Compliance Status</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="space-y-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-sm">
                      <span>Social Security Filing</span>
                      <span className="text-green-600 font-medium">On Track</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 w-[95%]" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-sm">
                      <span>Tax Deductions</span>
                      <span className="text-green-600 font-medium">Compliant</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 w-[100%]" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-sm">
                      <span>Hostel Fee Audits (JP)</span>
                      <span className="text-amber-600 font-medium">Reviewing</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 w-[65%]" />
                    </div>
                  </div>
               </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
