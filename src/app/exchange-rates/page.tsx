
"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { useCountry } from "@/context/CountryContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCcw, TrendingUp, Info, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCbmRates } from "@/app/actions/exchange-rates";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
  const [error, setError] = useState<string | null>(null);

  const fetchRates = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCbmRates();
      if (data) {
        setRates(data);
      } else {
        setError("Could not retrieve data from Central Bank of Myanmar. Please try again later.");
      }
    } catch (err) {
      console.error("Failed to update rates:", err);
      setError("An unexpected error occurred while fetching exchange rates.");
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
      <div className="md:pl-64 pt-16 md:pt-0 min-h-screen flex items-center justify-center p-8 bg-background">
        <Navbar />
        <Card className="max-w-md w-full border-primary/20">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Exchange rates are only available for Myanmar mode.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Common market/bank rates for Myanmar fallback
  const weightedRateUSD = 3600;

  return (
    <div className="md:pl-64 pt-16 md:pt-0 min-h-screen bg-background">
      <Navbar />
      <main className="p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-primary flex items-center gap-3">
              <TrendingUp className="text-primary" /> Central Bank of Myanmar
            </h2>
            <p className="text-muted-foreground">Daily Activities & Reference Rates</p>
          </div>
          <Button onClick={fetchRates} disabled={loading} variant="outline" className="gap-2 border-primary/20">
            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} /> Refresh Rates
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6 bg-destructive/5 border-destructive/20 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>API Connection Issue</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-2 shadow-lg border-primary/10 overflow-hidden bg-card">
            <CardHeader className="bg-primary/5 border-b">
              <CardTitle className="text-sm font-bold uppercase tracking-wider flex flex-wrap items-center gap-2">
                Reference Exchange Rates
                {rates?.timestamp && (
                  <span className="text-[10px] font-normal text-muted-foreground ml-auto bg-background px-2 py-1 rounded-full border">
                    Last Updated: {new Date(parseInt(rates.timestamp) * 1000).toLocaleString()}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-bold">Currency</TableHead>
                    <TableHead className="font-bold">Symbol</TableHead>
                    <TableHead className="text-right font-bold">Reference Rate (MMK)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={3} className="text-center py-20 text-muted-foreground animate-pulse">Fetching latest CBM Data...</TableCell></TableRow>
                  ) : rates ? (
                    Object.entries(rates.rates).slice(0, 15).map(([curr, rate]) => (
                      <TableRow key={curr} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-bold">{curr}</TableCell>
                        <TableCell className="text-muted-foreground">{curr === 'USD' ? '$' : curr === 'EUR' ? '€' : curr === 'SGD' ? 'S$' : curr === 'THB' ? '฿' : '-'}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-primary">{rate}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-20 text-muted-foreground">
                        {error ? "Service Unavailable" : "No exchange rate data found."}
                      </TableCell>
                    </TableRow>
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
              <div className="p-4 bg-background rounded-xl border border-orange-200 shadow-sm">
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Bank-Customer Weighted Avg</p>
                <p className="text-3xl font-black text-orange-600">~{weightedRateUSD.toLocaleString()} <span className="text-xs">MMK/USD</span></p>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground italic">
                CBM reference rates (2,100 MMK/USD) are for official government reporting. For actual private sector payroll and commercial transactions, the weighted average market rate (~3,600+ MMK/USD) is standard practice.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
