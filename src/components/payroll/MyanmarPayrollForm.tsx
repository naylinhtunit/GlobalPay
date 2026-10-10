"use client";
import { useLanguage } from "@/context/LanguageContext";

import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Info, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface MyanmarData {
  otHours: number;
  attendanceBonus: number;
  mealAllowance: number;
  ssbAmount: number;
  incomeTax: number;
  exchangeRate?: number;
  isUsdSalary?: boolean;
}

interface Props {
  data: MyanmarData;
  onChange: (data: MyanmarData) => void;
  baseSalary: number;
  salaryCurrency?: string;
}

export function MyanmarPayrollForm({ data, onChange, baseSalary, salaryCurrency }: Props) {
  const { t } = useLanguage();
  const [effectiveBaseMMK, setEffectiveBaseMMK] = useState(baseSalary);
  
  const isUsd = salaryCurrency === "USD" || (baseSalary > 0 && baseSalary < 10000);

  const updateField = (field: keyof MyanmarData, value: string) => {
    const numValue = value === "" ? 0 : Number(value);
    onChange({ ...data, [field]: numValue });
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value === "" || e.target.value === "0") {
      e.target.select();
    }
  };

  useEffect(() => {
    const rate = data.exchangeRate || 1;
    const baseMMK = isUsd ? baseSalary * rate : baseSalary;
    setEffectiveBaseMMK(baseMMK);

    const hourlyRate = (baseMMK / 30 / 8);
    const otPay = data.otHours * hourlyRate * 2;
    const monthlyGross = baseMMK + otPay + (data.attendanceBonus || 0) + (data.mealAllowance || 0);
    
    const annualGross = monthlyGross * 12;
    const personalAllowance = Math.min(annualGross * 0.20, 10000000);
    const taxableIncome = Math.max(0, annualGross - personalAllowance);

    let totalAnnualTax = 0;
    if (taxableIncome > 30000000) {
      totalAnnualTax += (taxableIncome - 30000000) * 0.25;
      totalAnnualTax += 10000000 * 0.20;
      totalAnnualTax += 10000000 * 0.15;
      totalAnnualTax += 5000000 * 0.10;
      totalAnnualTax += 3000000 * 0.05;
    } else if (taxableIncome > 20000000) {
      totalAnnualTax += (taxableIncome - 20000000) * 0.20;
      totalAnnualTax += 10000000 * 0.15;
      totalAnnualTax += 5000000 * 0.10;
      totalAnnualTax += 3000000 * 0.05;
    } else if (taxableIncome > 10000000) {
      totalAnnualTax += (taxableIncome - 10000000) * 0.15;
      totalAnnualTax += 5000000 * 0.10;
      totalAnnualTax += 3000000 * 0.05;
    } else if (taxableIncome > 5000000) {
      totalAnnualTax += (taxableIncome - 5000000) * 0.10;
      totalAnnualTax += 3000000 * 0.05;
    } else if (taxableIncome > 2000000) {
      totalAnnualTax += (taxableIncome - 2000000) * 0.05;
    }

    const monthlyTax = Math.round(totalAnnualTax / 12);
    const calculatedSSB = Math.min(Math.round(baseMMK * 0.02), 6000);

    if (data.ssbAmount !== calculatedSSB || data.incomeTax !== monthlyTax) {
      onChange({
        ...data,
        ssbAmount: calculatedSSB,
        incomeTax: monthlyTax
      });
    }
  }, [baseSalary, data.otHours, data.attendanceBonus, data.mealAllowance, data.exchangeRate, isUsd, salaryCurrency]);

  const hourlyRate = (effectiveBaseMMK / 30 / 8);
  const otPay = data.otHours * hourlyRate * 2;
  const grossPay = effectiveBaseMMK + otPay + (data.attendanceBonus || 0) + (data.mealAllowance || 0);
  const netPay = grossPay - (data.ssbAmount || 0) - (data.incomeTax || 0);

  return (
    <div className="space-y-6">
      {isUsd && (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe size={16} className="text-primary" />
                <span className="text-sm font-bold text-primary tracking-tight">{t("Currency Conversion")}</span>
              </div>
              <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-widest px-2 py-0">{t("USD Profile")}</Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t("Base Salary")}</Label>
                <Input 
                  readOnly 
                  className="h-10 bg-muted/20 text-lg font-bold border-dashed"
                  value={`$${baseSalary.toLocaleString()}`} 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t("Exchange Rate")}</Label>
                <Input 
                  type="number" 
                  placeholder="0.00"
                  className="h-10 bg-background text-lg font-bold"
                  value={data.exchangeRate === 0 ? "" : data.exchangeRate} 
                  onFocus={handleFocus}
                  onChange={e => updateField("exchangeRate", e.target.value)} 
                />
              </div>
            </div>
          </div>

          <div className="px-4 py-3 flex justify-between items-center bg-muted/50 border-t">
            <span className="text-xs font-semibold text-muted-foreground">{t("Effective Basic Salary:")}</span>
            <div className="text-right flex items-baseline gap-1">
              <span className="text-xl font-bold text-primary tracking-tight">{Math.round(effectiveBaseMMK).toLocaleString()}</span>
              <span className="text-[10px] font-bold text-primary/60 uppercase">MMK</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("OT Hours (2x Rate)")}</Label>
          <Input 
            type="number" 
            placeholder="0"
            className="h-10 bg-background"
            value={data.otHours === 0 ? "" : data.otHours} 
            onFocus={handleFocus}
            onChange={e => updateField("otHours", e.target.value)} 
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("Attendance Bonus")}</Label>
          <Input 
            type="number" 
            placeholder="0"
            className="h-10 bg-background"
            value={data.attendanceBonus === 0 ? "" : data.attendanceBonus} 
            onFocus={handleFocus}
            onChange={e => updateField("attendanceBonus", e.target.value)} 
          />
        </div>
        <div className="space-y-2 col-span-1 sm:col-span-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("Meal Allowance")}</Label>
          <Input 
            type="number" 
            placeholder="0"
            className="h-10 bg-background"
            value={data.mealAllowance === 0 ? "" : data.mealAllowance} 
            onFocus={handleFocus}
            onChange={e => updateField("mealAllowance", e.target.value)} 
          />
        </div>
      </div>

      <Separator className="bg-border/50" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-primary">{t("SSB (2% Auto)")}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <button className="text-muted-foreground hover:text-primary transition-colors p-1 -m-1" aria-label={t("SSB Information")}>
                  <Info size={14} />
                </button>
              </PopoverTrigger>
              <PopoverContent className="text-xs p-4 space-y-3 w-[280px] max-w-[calc(100vw-40px)] shadow-2xl rounded-xl border-primary/20">
                <p className="font-bold border-b border-primary/10 pb-2 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary" /> {t("Social security contribution (SSB)")} </p>
                <p className="leading-relaxed text-muted-foreground">{t("Automatically calculates 2% of basic salary, capped at MMK 6,000 per month.")}</p>
              </PopoverContent>
            </Popover>
          </div>
          <Input 
            type="number" 
            readOnly
            className="h-10 bg-muted/30 font-bold"
            placeholder="0"
            value={data.ssbAmount === 0 ? "" : data.ssbAmount} 
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-primary">{t("Income Tax (PIT)")}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <button className="text-muted-foreground hover:text-primary transition-colors p-1 -m-1" aria-label={t("Income Tax Information")}>
                  <Info size={14} />
                </button>
              </PopoverTrigger>
              <PopoverContent className="text-xs p-4 space-y-3 w-[320px] max-w-[calc(100vw-40px)] shadow-2xl rounded-xl border-primary/20">
                <p className="font-bold border-b border-primary/10 pb-2 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary" /> {t("Income tax calculation")} </p>
                <div className="space-y-2.5 text-muted-foreground">
                  <p className="leading-relaxed">{t("1. Calculate total annual income.")}</p>
                  <p className="leading-relaxed">{t("2. Deduct the 20% basic relief (maximum MMK 10 million).")}</p>
                  <p className="leading-relaxed">{t("3. Apply progressive rates of 5% to 25% (above MMK 30 million) to the remaining amount.")}</p>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <Input 
            type="number" 
            readOnly
            className="h-10 bg-muted/30 font-bold"
            placeholder="0"
            value={data.incomeTax === 0 ? "" : data.incomeTax} 
          />
        </div>
      </div>

      <div className="p-5 bg-primary/5 dark:bg-primary/10 rounded-xl border border-primary/10 space-y-3 shadow-inner">
        <div className="flex justify-between items-center text-sm">
          <span className="font-medium text-muted-foreground">{t("Gross Total:")}</span>
          <span className="font-bold">{Math.round(grossPay).toLocaleString()} MMK</span>
        </div>
        <div className="flex justify-between items-center text-sm text-destructive/80">
          <span className="font-medium">{t("Total Deductions:")}</span>
          <span className="font-bold">-{((data.ssbAmount || 0) + (data.incomeTax || 0)).toLocaleString()} MMK</span>
        </div>
        <Separator className="bg-primary/10" />
        <div className="flex justify-between items-center text-xl font-black">
          <span className="text-primary tracking-tight">{t("Net Salary:")}</span>
          <div className="flex items-baseline gap-1">
            <span className="text-primary">{Math.round(netPay).toLocaleString()}</span>
            <span className="text-[10px] text-primary/60 font-bold">MMK</span>
          </div>
        </div>
      </div>
    </div>
  );
}
