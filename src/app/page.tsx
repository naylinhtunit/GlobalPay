
"use client";

import React, { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCountry } from "@/context/CountryContext";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Users, CreditCard, CalendarCheck, TrendingUp } from "lucide-react";

export default function Dashboard() {
  const { country, currency } = useCountry();
  const [stats, setStats] = useState({
    employees: 0,
    totalPayroll: 0,
    pendingReviews: 0
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const empQuery = query(collection(db, "employees"), where("country", "==", country));
        const empSnapshot = await getDocs(empQuery);
        
        // Simulating some stats based on available data
        setStats({
          employees: empSnapshot.size,
          totalPayroll: empSnapshot.size * (country === "Japan" ? 250000 : 450000),
          pendingReviews: 2
        });
      } catch (e) {
        console.error("Error fetching dashboard data", e);
      }
    }
    fetchData();
  }, [country]);

  return (
    <div className="pl-64 min-h-screen">
      <Navbar />
      <main className="p-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-primary">Welcome Back</h2>
          <p className="text-muted-foreground">GlobalPay Overview for {country}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
              <Users className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.employees}</div>
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
                {stats.totalPayroll.toLocaleString()} {currency}
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
              <div className="text-2xl font-bold">{stats.pendingReviews}</div>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-lg border bg-muted/30">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {i}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Payroll generated for employee #{100+i}</p>
                      <p className="text-xs text-muted-foreground">2 hours ago</p>
                    </div>
                  </div>
                ))}
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
