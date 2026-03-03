
"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface JapanData {
  ot125Hours: number;
  nightShiftHours: number;
  lateNightOTHours: number;
  healthInsurance: number;
  pension: number;
  incomeTax: number;
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

  // Simple calculation logic for Japanese slips
  const hourlyRate = baseSalary / 160; // Assume 160 work hours
  const otPay = data.ot125Hours * hourlyRate * 1.25;
  const nightPay = data.nightShiftHours * hourlyRate * 0.25;
  const lateNightOTPay = data.lateNightOTHours * hourlyRate * 1.5;
  
  const totalDeductions = data.healthInsurance + data.pension + data.incomeTax + data.hostelFee;
  const grossPay = baseSalary + otPay + nightPay + lateNightOTPay;
  const netPay = grossPay - totalDeductions;

  return (
    <div className="space-y-6">
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
          <Label>深夜手当 0.25x (Hours)</Label>
          <Input 
            type="number" 
            value={data.nightShiftHours} 
            onFocus={handleFocus}
            onChange={e => updateField("nightShiftHours", e.target.value)} 
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
      </div>

      <Separator />

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
          <Label>Hostel Fee (寮費)</Label>
          <Input 
            type="number" 
            value={data.hostelFee} 
            onFocus={handleFocus}
            onChange={e => updateField("hostelFee", e.target.value)} 
          />
        </div>
      </div>

      <div className="p-4 bg-muted rounded-lg space-y-2">
        <div className="flex justify-between font-medium">
          <span>Gross Pay (支給額):</span>
          <span>{grossPay.toLocaleString()} JPY</span>
        </div>
        <div className="flex justify-between text-destructive">
          <span>Total Deductions (控除額):</span>
          <span>-{totalDeductions.toLocaleString()} JPY</span>
        </div>
        <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
          <span>Net Salary (手取り):</span>
          <span className="text-primary">{netPay.toLocaleString()} JPY</span>
        </div>
      </div>
    </div>
  );
}
