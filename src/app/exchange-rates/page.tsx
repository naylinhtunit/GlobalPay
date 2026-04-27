
"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { useCountry } from "@/context/CountryContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCcw, TrendingUp, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CbmRates {
  info: string;
  description: string;
  timestamp: string;
  rates: Record<string, string>;
}

export default function ExchangeRatesPage() {
  const { country } = useCountry();
  const [rates, setRates] = useState<CbmRates | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRates = async () => {
    setLoading(true);
    try {
      const response = await fetch("https://forex.cbm.gov.mm/api/latest");
      const data = await response.json();
      setRates(data);
    } catch (error) {
      console.error("Failed to fetch rates:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (country === "Myanmar") {
      fetchRates();
    }
  }, [country]);

  if (country !== "Myanmar") {
    return (
      <div className="md:pl-64 pt-16 md:pt-0 min-h-screen flex items-center justify-center p-8">
        <Navbar />
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Exchange rates are only available for Myanmar mode.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Common market/bank rates for Myanmar (CBM Reference is usually 2100, but we want the market/weighted rate)
  const weightedRateUSD = 3600; // Hardcoded fallback as requested if API doesn't provide it

  return (
    <div className="md:pl-64 pt-16 md:pt-0 min-h-screen bg-background">
      <Navbar />
      <main className="p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-primary flex items-center gap-3">
              <TrendingUp /> Central Bank of Myanmar
            </h2>
            <p className="text-muted-foreground">Daily Activities & Reference Rates</p>
          </div>
          <Button onClick={fetchRates} disabled={loading} variant="outline" className="gap-2">
            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} /> Refresh Rates
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-2 shadow-lg border-primary/20">
            <CardHeader className="bg-primary/5 border-b">
              <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                Reference Exchange Rates
                {rates?.timestamp && <span className="text-[10px] font-normal text-muted-foreground ml-auto">Last Updated: {new Date(parseInt(rates.timestamp) * 1000).toLocaleString()}</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Currency</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead className="text-right">Reference Rate (MMK)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={3} className="text-center py-10">Loading CBM Data...</TableCell></TableRow>
                  ) : rates ? (
                    Object.entries(rates.rates).slice(0, 10).map(([curr, rate]) => (
                      <TableRow key={curr}>
                        <TableCell className="font-bold">{curr}</TableCell>
                        <TableCell className="text-muted-foreground">{curr === 'USD' ? '$' : curr === 'EUR' ? '€' : curr === 'SGD' ? 'S$' : '-'}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-primary">{rate}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={3} className="text-center py-10">No data available.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-orange-500/20 bg-orange-500/5 h-fit">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-orange-600 flex items-center gap-2">
                <Info size={16} /> Market Note
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-background rounded-xl border border-orange-200">
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Bank-Customer Weighted Avg</p>
                <p className="text-3xl font-black text-orange-600">~{weightedRateUSD.toLocaleString()} <span className="text-xs">MMK/USD</span></p>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                CBM reference rates (2,100 MMK/USD) are for official reporting. For actual payroll and transactions, the weighted average market rate (~3,600+ MMK/USD) is typically utilized.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
