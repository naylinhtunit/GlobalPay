"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface JapanData {
  ot125Hours: number;
  nightShiftHours: number;
  lateNightOTHours: number;
  nightShiftAllowance: number;
  housingAllowance: number;
  healthInsurance: number;
  pension: number;
  incomeTax: number;
  employmentInsurance: number;
  hostelFee: number;
}

interface Props {
  data: JapanData;
  onChange: (data: JapanData) => void;
  baseSalary: number;
}

export function JapanPayrollForm({ data, onChange, baseSalary }: Props) {
  const updateField = (field: keyof JapanData, value: string) => {
    const numValue = value === "" ? 0 : Number(value);
    onChange({ ...data, [field]: numValue });
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value === "0") {
      e.target.select();
    }
  };

  const hourlyRate = baseSalary / 160;
  const otPay = (data.ot125Hours * hourlyRate * 1.25) + 
                (data.nightShiftHours * hourlyRate * 0.25) + 
                (data.lateNightOTHours * hourlyRate * 1.5);
  
  const totalEarnings = baseSalary + otPay + (data.nightShiftAllowance || 0) + (data.housingAllowance || 0);
  const totalDeductions = (data.healthInsurance || 0) + 
                          (data.pension || 0) + 
                          (data.incomeTax || 0) + 
                          (data.employmentInsurance || 0) + 
                          (data.hostelFee || 0);
  
  const netPay = totalEarnings - totalDeductions;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Earnings (支給)</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>普通残業 1.25x (Hours)</Label>
            <Input 
              type="number" 
              value={data.ot125Hours} 
              onFocus={handleFocus}
              onChange={e => updateField("ot125Hours", e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <Label>深夜残業 1.5x (Hours)</Label>
            <Input 
              type="number" 
              value={data.lateNightOTHours} 
              onFocus={handleFocus}
              onChange={e => updateField("lateNightOTHours", e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <Label>深夜手当 (Night Shift Amt)</Label>
            <Input 
              type="number" 
              value={data.nightShiftAllowance} 
              onFocus={handleFocus}
              onChange={e => updateField("nightShiftAllowance", e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <Label>住宅手当 (Housing Allowance)</Label>
            <Input 
              type="number" 
              value={data.housingAllowance} 
              onFocus={handleFocus}
              onChange={e => updateField("housingAllowance", e.target.value)} 
            />
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Deductions (控除)</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Health Insurance (健康保険)</Label>
            <Input 
              type="number" 
              value={data.healthInsurance} 
              onFocus={handleFocus}
              onChange={e => updateField("healthInsurance", e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <Label>Pension (厚生年金)</Label>
            <Input 
              type="number" 
              value={data.pension} 
              onFocus={handleFocus}
              onChange={e => updateField("pension", e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <Label>Income Tax (所得税)</Label>
            <Input 
              type="number" 
              value={data.incomeTax} 
              onFocus={handleFocus}
              onChange={e => updateField("incomeTax", e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <Label>雇用保険 (Employment Ins)</Label>
            <Input 
              type="number" 
              value={data.employmentInsurance} 
              onFocus={handleFocus}
              onChange={e => updateField("employmentInsurance", e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <Label>Hostel Fee (寮費)</Label>
            <Input 
              type="number" 
              value={data.hostelFee} 
              onFocus={handleFocus}
              onChange={e => updateField("hostelFee", e.target.value)} 
            />
          </div>
        </div>
      </div>

      <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 space-y-2">
        <div className="flex justify-between font-medium">
          <span className="text-muted-foreground">Total Earnings (総支給額):</span>
          <span>{totalEarnings.toLocaleString()} JPY</span>
        </div>
        <div className="flex justify-between text-destructive">
          <span className="text-muted-foreground">Total Deductions (控除合計):</span>
          <span>-{totalDeductions.toLocaleString()} JPY</span>
        </div>
        <div className="flex justify-between text-xl font-bold border-t border-primary/20 pt-2 mt-2">
          <span>Net Salary (手取り):</span>
          <span className="text-primary">{netPay.toLocaleString()} JPY</span>
        </div>
      </div>
    </div>
  );
}
