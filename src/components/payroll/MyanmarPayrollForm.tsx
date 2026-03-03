
"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface MyanmarData {
  otHours: number;
  attendanceBonus: number;
  mealAllowance: number;
  ssbAmount: number; // calculated 2% or manual override
  incomeTax: number;
}

interface Props {
  data: MyanmarData;
  onChange: (data: MyanmarData) => void;
  baseSalary: number;
}

export function MyanmarPayrollForm({ data, onChange, baseSalary }: Props) {
  const updateField = (field: keyof MyanmarData, value: number) => {
    onChange({ ...data, [field]: value });
  };

  // Myanmar OT Logic: usually (Salary / 30 / 8) * 2 * OT Hours
  const hourlyRate = (baseSalary / 30 / 8);
  const otPay = data.otHours * hourlyRate * 2;
  
  // SSB is fixed at 2% capped at some point, but we'll use a simple 2% calculation
  const calculatedSSB = Math.min(baseSalary * 0.02, 6000); // 6000 MMK is often max cap

  const grossPay = baseSalary + otPay + data.attendanceBonus + data.mealAllowance;
  const netPay = grossPay - data.ssbAmount - data.incomeTax;

  const handleApplySSB = () => {
    updateField("ssbAmount", calculatedSSB);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>OT Hours (2x Rate)</Label>
          <Input type="number" value={data.otHours} onChange={e => updateField("otHours", Number(e.target.value))} />
        </div>
        <div className="space-y-2">
          <Label>Attendance Bonus</Label>
          <Input type="number" value={data.attendanceBonus} onChange={e => updateField("attendanceBonus", Number(e.target.value))} />
        </div>
        <div className="space-y-2">
          <Label>Meal Allowance</Label>
          <Input type="number" value={data.mealAllowance} onChange={e => updateField("mealAllowance", Number(e.target.value))} />
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label>SSB (2%)</Label>
            <button type="button" onClick={handleApplySSB} className="text-[10px] text-accent hover:underline">Auto Calc</button>
          </div>
          <Input type="number" value={data.ssbAmount} onChange={e => updateField("ssbAmount", Number(e.target.value))} />
        </div>
        <div className="space-y-2">
          <Label>Income Tax</Label>
          <Input type="number" value={data.incomeTax} onChange={e => updateField("incomeTax", Number(e.target.value))} />
        </div>
      </div>

      <div className="p-4 bg-muted rounded-lg space-y-2">
        <div className="flex justify-between font-medium">
          <span>Gross Total:</span>
          <span>{grossPay.toLocaleString()} MMK</span>
        </div>
        <div className="flex justify-between text-destructive">
          <span>Deductions:</span>
          <span>-{(data.ssbAmount + data.incomeTax).toLocaleString()} MMK</span>
        </div>
        <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
          <span>Net Salary:</span>
          <span className="text-primary">{netPay.toLocaleString()} MMK</span>
        </div>
      </div>
    </div>
  );
}
