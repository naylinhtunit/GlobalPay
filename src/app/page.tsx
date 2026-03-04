
"use client";

import React from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCountry } from "@/context/CountryContext";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { Users, CreditCard, CalendarCheck, TrendingUp } from "lucide-react";

export default function Dashboard() {
  const { country, currency } = useCountry();
  const { user } = useUser();
  const firestore = useFirestore();

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

  const employeeCount = employees?.length || 0;
  const pendingRecords = (payrollRecords || []).filter(r => r.status === "Calculated").length;
  const totalPayroll = (employees || []).reduce((acc, emp: any) => acc + (emp.baseSalary || 0), 0);

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
              <CardTitle className="text-sm font-medium">Total Base Salary</CardTitle>
              <CreditCard className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalPayroll.toLocaleString()} {currency}
              </div>
              <p className="text-xs text-muted-foreground">Monthly total</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Payroll Runs</CardTitle>
              <CalendarCheck className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{payrollRecords?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Historical records</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Compliance</CardTitle>
              <TrendingUp className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">100%</div>
              <p className="text-xs text-muted-foreground">All regions</p>
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
                {(payrollRecords || []).slice(0, 3).map((rec: any, i) => (
                  <div key={rec.id} className="flex items-center gap-4 p-3 rounded-lg border bg-muted/30">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Payroll for {(employees || []).find(e => e.id === rec.employeeId)?.fullName || 'Employee'}</p>
                      <p className="text-xs text-muted-foreground">{rec.payPeriodStartDate.substring(0, 7)}</p>
                    </div>
                  </div>
                ))}
                {(!payrollRecords || payrollRecords.length === 0) && (
                   <p className="text-sm text-muted-foreground text-center py-4">No recent activity.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Regional Compliance</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="space-y-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-sm">
                      <span>Tax Filings</span>
                      <span className="text-green-600 font-medium">Verified</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 w-[100%]" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-sm">
                      <span>Social Security</span>
                      <span className="text-green-600 font-medium">Active</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 w-[100%]" />
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
