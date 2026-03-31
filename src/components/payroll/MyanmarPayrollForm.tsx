"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

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

  const hourlyRate = (baseSalary / 30 / 8);
  const otPay = data.otHours * hourlyRate * 2;
  
  const calculatedSSB = Math.min(baseSalary * 0.02, 6000);

  const grossPay = baseSalary + otPay + (data.attendanceBonus || 0) + (data.mealAllowance || 0);
  const netPay = grossPay - (data.ssbAmount || 0) - (data.incomeTax || 0);

  const handleApplySSB = () => {
    onChange({ ...data, ssbAmount: calculatedSSB });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>OT Hours (2x Rate)</Label>
          <Input 
            type="number" 
            placeholder="0"
            value={data.otHours === 0 ? "" : data.otHours} 
            onFocus={handleFocus}
            onChange={e => updateField("otHours", e.target.value)} 
          />
        </div>
        <div className="space-y-2">
          <Label>Attendance Bonus</Label>
          <Input 
            type="number" 
            placeholder="0"
            value={data.attendanceBonus === 0 ? "" : data.attendanceBonus} 
            onFocus={handleFocus}
            onChange={e => updateField("attendanceBonus", e.target.value)} 
          />
        </div>
        <div className="space-y-2">
          <Label>Meal Allowance</Label>
          <Input 
            type="number" 
            placeholder="0"
            value={data.mealAllowance === 0 ? "" : data.mealAllowance} 
            onFocus={handleFocus}
            onChange={e => updateField("mealAllowance", e.target.value)} 
          />
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label>SSB (2%)</Label>
            <button type="button" onClick={handleApplySSB} className="text-[10px] text-accent hover:underline">Auto Calc</button>
          </div>
          <Input 
            type="number" 
            placeholder="0"
            value={data.ssbAmount === 0 ? "" : data.ssbAmount} 
            onFocus={handleFocus}
            onChange={e => updateField("ssbAmount", e.target.value)} 
          />
        </div>
        <div className="space-y-2">
          <Label>Income Tax</Label>
          <Input 
            type="number" 
            placeholder="0"
            value={data.incomeTax === 0 ? "" : data.incomeTax} 
            onFocus={handleFocus}
            onChange={e => updateField("incomeTax", e.target.value)} 
          />
        </div>
      </div>

      <div className="p-4 bg-muted rounded-lg space-y-2">
        <div className="flex justify-between font-medium">
          <span>Gross Total:</span>
          <span>{grossPay.toLocaleString()} MMK</span>
        </div>
        <div className="flex justify-between text-destructive">
          <span>Deductions:</span>
          <span>-{((data.ssbAmount || 0) + (data.incomeTax || 0)).toLocaleString()} MMK</span>
        </div>
        <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
          <span>Net Salary:</span>
          <span className="text-primary">{netPay.toLocaleString()} MMK</span>
        </div>
      </div>
    </div>
  );
}
