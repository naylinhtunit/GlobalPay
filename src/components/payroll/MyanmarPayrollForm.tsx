
"use client";

import React, { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface MyanmarData {
  otHours: number;
  attendanceBonus: number;
  mealAllowance: number;
  ssbAmount: number;
  incomeTax: number;
}

interface Props {
  data: MyanmarData;
  onChange: (data: MyanmarData) => void;
  baseSalary: number;
}

export function MyanmarPayrollForm({ data, onChange, baseSalary }: Props) {
  const updateField = (field: keyof MyanmarData, value: string) => {
    const numValue = value === "" ? 0 : Number(value);
    onChange({ ...data, [field]: numValue });
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value === "" || e.target.value === "0") {
      e.target.select();
    }
  };

  // Myanmar Tax Calculation Logic
  useEffect(() => {
    const hourlyRate = (baseSalary / 30 / 8);
    const otPay = data.otHours * hourlyRate * 2;
    const monthlyGross = baseSalary + otPay + (data.attendanceBonus || 0) + (data.mealAllowance || 0);
    
    // 1. Calculate Annual Gross
    const annualGross = monthlyGross * 12;
    
    // 2. Deduction: Personal Allowance 20% (Max 10,000,000 MMK)
    const personalAllowance = Math.min(annualGross * 0.20, 10000000);
    
    // Taxable Income
    const taxableIncome = Math.max(0, annualGross - personalAllowance);

    // 3. Progressive Tax Brackets (Myanmar PIT 2024-2025 Standard)
    let totalAnnualTax = 0;
    if (taxableIncome > 30000000) {
      totalAnnualTax += (taxableIncome - 30000000) * 0.25;
      totalAnnualTax += 10000000 * 0.20; // 20-30m
      totalAnnualTax += 10000000 * 0.15; // 10-20m
      totalAnnualTax += 5000000 * 0.10;  // 5-10m
      totalAnnualTax += 3000000 * 0.05;  // 2-5m
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
    
    // 4. Auto SSB (2%, Max 6,000 MMK)
    const calculatedSSB = Math.min(Math.round(baseSalary * 0.02), 6000);

    // Only trigger onChange if values actually changed to avoid infinite loops
    if (data.ssbAmount !== calculatedSSB || data.incomeTax !== monthlyTax) {
      onChange({
        ...data,
        ssbAmount: calculatedSSB,
        incomeTax: monthlyTax
      });
    }
  }, [baseSalary, data.otHours, data.attendanceBonus, data.mealAllowance]);

  const hourlyRate = (baseSalary / 30 / 8);
  const otPay = data.otHours * hourlyRate * 2;
  const grossPay = baseSalary + otPay + (data.attendanceBonus || 0) + (data.mealAllowance || 0);
  const netPay = grossPay - (data.ssbAmount || 0) - (data.incomeTax || 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">OT Hours (2x Rate)</Label>
          <Input 
            type="number" 
            placeholder="0"
            className="h-11 bg-background"
            value={data.otHours === 0 ? "" : data.otHours} 
            onFocus={handleFocus}
            onChange={e => updateField("otHours", e.target.value)} 
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Attendance Bonus</Label>
          <Input 
            type="number" 
            placeholder="0"
            className="h-11 bg-background"
            value={data.attendanceBonus === 0 ? "" : data.attendanceBonus} 
            onFocus={handleFocus}
            onChange={e => updateField("attendanceBonus", e.target.value)} 
          />
        </div>
        <div className="space-y-2 col-span-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Meal Allowance</Label>
          <Input 
            type="number" 
            placeholder="0"
            className="h-11 bg-background"
            value={data.mealAllowance === 0 ? "" : data.mealAllowance} 
            onFocus={handleFocus}
            onChange={e => updateField("mealAllowance", e.target.value)} 
          />
        </div>
      </div>

      <Separator className="bg-border/50" />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-primary">SSB (2% Auto)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <button className="text-muted-foreground hover:text-primary transition-colors">
                  <Info size={14} />
                </button>
              </PopoverTrigger>
              <PopoverContent className="text-xs p-3 space-y-2 w-64 shadow-xl">
                <p className="font-bold border-b pb-1">လူမှုဖူလုံရေးကြေး (SSB)</p>
                <p className="leading-relaxed">အခြေခံလစာ၏ ၂% ဖြစ်ပြီး တစ်လလျှင် အများဆုံး ၆,၀၀၀ ကျပ်အထိသာ အလိုအလျောက် သတ်မှတ်တွက်ချက်ပေးပါသည်။</p>
              </PopoverContent>
            </Popover>
          </div>
          <Input 
            type="number" 
            readOnly
            className="h-11 bg-muted/30 font-bold"
            placeholder="0"
            value={data.ssbAmount === 0 ? "" : data.ssbAmount} 
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-primary">Income Tax (Progressive)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <button className="text-muted-foreground hover:text-primary transition-colors">
                  <Info size={14} />
                </button>
              </PopoverTrigger>
              <PopoverContent className="text-xs p-3 space-y-2 w-72 shadow-xl">
                <p className="font-bold border-b pb-1">ဝင်ငွေခွန် တွက်ချက်ပုံ (PIT)</p>
                <p className="leading-relaxed">၁။ တစ်နှစ်စာ စုစုပေါင်းဝင်ငွေကို အရင်တွက်ပါသည်။</p>
                <p className="leading-relaxed">၂။ အခြေခံသက်သာခွင့် ၂၀% (အများဆုံး ၁၀၀ သိန်း) ကို နှုတ်ပါသည်။</p>
                <p className="leading-relaxed">၃။ ကျန်ရှိသော ပမာဏအပေါ် ၅% မှ ၂၅% အထိ အဆင့်ဆင့်သော အခွန်နှုန်းထားများဖြင့် တွက်ချက်ထားပါသည်။</p>
              </PopoverContent>
            </Popover>
          </div>
          <Input 
            type="number" 
            readOnly
            className="h-11 bg-muted/30 font-bold"
            placeholder="0"
            value={data.incomeTax === 0 ? "" : data.incomeTax} 
          />
        </div>
      </div>

      <div className="p-5 bg-primary/5 dark:bg-primary/10 rounded-xl border border-primary/20 space-y-3 shadow-inner">
        <div className="flex justify-between items-center text-sm">
          <span className="font-medium">Gross Total:</span>
          <span className="font-bold text-lg">{grossPay.toLocaleString()} MMK</span>
        </div>
        <div className="flex justify-between items-center text-sm text-destructive">
          <span className="font-medium">Deductions (SSB + Tax):</span>
          <span className="font-bold">-{((data.ssbAmount || 0) + (data.incomeTax || 0)).toLocaleString()} MMK</span>
        </div>
        <Separator className="bg-primary/20" />
        <div className="flex justify-between items-center text-xl font-black">
          <span className="text-primary uppercase tracking-tighter">Net Salary:</span>
          <span className="text-primary">{netPay.toLocaleString()} MMK</span>
        </div>
      </div>
    </div>
  );
}
