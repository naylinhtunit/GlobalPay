"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export interface JapanData {
  ot125Hours: number;
  nightShiftHours: number;
  lateNightOTHours: number;
  nightShiftAllowance: number;
  housingAllowance: number;
  familyAllowance: number;
  commutingAllowance: number;
  absenceDeduction: number;
  lateEarlyDeduction: number;
  healthInsurance: number;
  nursingCareInsurance: number;
  pension: number;
  incomeTax: number;
  employmentInsurance: number;
  residentTax: number;
  hostelFee: number;
  beddingFee: number;
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
  const otPay125 = data.ot125Hours * hourlyRate * 1.25;
  const nightShiftDiff = data.nightShiftHours * hourlyRate * 0.25;
  const lateNightOTPay = data.lateNightOTHours * hourlyRate * 1.5;
  
  const totalEarnings = baseSalary + 
                        otPay125 + 
                        nightShiftDiff + 
                        lateNightOTPay + 
                        (data.nightShiftAllowance || 0) + 
                        (data.housingAllowance || 0) + 
                        (data.familyAllowance || 0) + 
                        (data.commutingAllowance || 0) -
                        (data.absenceDeduction || 0) -
                        (data.lateEarlyDeduction || 0);

  const totalDeductions = (data.healthInsurance || 0) + 
                          (data.nursingCareInsurance || 0) +
                          (data.pension || 0) + 
                          (data.incomeTax || 0) + 
                          (data.employmentInsurance || 0) + 
                          (data.residentTax || 0) +
                          (data.hostelFee || 0) +
                          (data.beddingFee || 0);
  
  const netPay = totalEarnings - totalDeductions;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-primary uppercase tracking-wider border-b pb-1">Earnings (支給)</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-[11px]">普通残業 1.25x (Hours)</Label>
            <Input type="number" value={data.ot125Hours} onFocus={handleFocus} onChange={e => updateField("ot125Hours", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-[11px]">深夜残業 1.5x (Hours)</Label>
            <Input type="number" value={data.lateNightOTHours} onFocus={handleFocus} onChange={e => updateField("lateNightOTHours", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-[11px]">深夜勤務 (Night Hrs)</Label>
            <Input type="number" value={data.nightShiftHours} onFocus={handleFocus} onChange={e => updateField("nightShiftHours", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-[11px]">深夜手当 (Night Alw)</Label>
            <Input type="number" value={data.nightShiftAllowance} onFocus={handleFocus} onChange={e => updateField("nightShiftAllowance", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-[11px]">住宅手당 (Housing)</Label>
            <Input type="number" value={data.housingAllowance} onFocus={handleFocus} onChange={e => updateField("housingAllowance", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-[11px]">家族手当 (Family)</Label>
            <Input type="number" value={data.familyAllowance} onFocus={handleFocus} onChange={e => updateField("familyAllowance", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-[11px]">通勤費 (Commuting)</Label>
            <Input type="number" value={data.commutingAllowance} onFocus={handleFocus} onChange={e => updateField("commutingAllowance", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-[11px] text-destructive">欠勤控除 (Absence Ded)</Label>
            <Input type="number" className="border-destructive/30" value={data.absenceDeduction} onFocus={handleFocus} onChange={e => updateField("absenceDeduction", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-[11px] text-destructive">遅刻早退 (Late/Early Ded)</Label>
            <Input type="number" className="border-destructive/30" value={data.lateEarlyDeduction} onFocus={handleFocus} onChange={e => updateField("lateEarlyDeduction", e.target.value)} />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-sm font-bold text-destructive uppercase tracking-wider border-b pb-1">Deductions (控除)</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-[11px]">健康保険 (Health Ins)</Label>
            <Input type="number" value={data.healthInsurance} onFocus={handleFocus} onChange={e => updateField("healthInsurance", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-[11px]">介護保険 (Nursing Care)</Label>
            <Input type="number" value={data.nursingCareInsurance} onFocus={handleFocus} onChange={e => updateField("nursingCareInsurance", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-[11px]">厚生年金 (Pension)</Label>
            <Input type="number" value={data.pension} onFocus={handleFocus} onChange={e => updateField("pension", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-[11px]">所得税 (Income Tax)</Label>
            <Input type="number" value={data.incomeTax} onFocus={handleFocus} onChange={e => updateField("incomeTax", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-[11px]">住民税 (Resident Tax)</Label>
            <Input type="number" value={data.residentTax} onFocus={handleFocus} onChange={e => updateField("residentTax", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-[11px]">雇用保険 (Employment)</Label>
            <Input type="number" value={data.employmentInsurance} onFocus={handleFocus} onChange={e => updateField("employmentInsurance", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-[11px]">寮費 (Hostel Fee)</Label>
            <Input type="number" value={data.hostelFee} onFocus={handleFocus} onChange={e => updateField("hostelFee", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-[11px]">布団代 (Bedding Fee)</Label>
            <Input type="number" value={data.beddingFee} onFocus={handleFocus} onChange={e => updateField("beddingFee", e.target.value)} />
          </div>
        </div>
      </div>

      <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 space-y-2">
        <div className="flex justify-between font-medium">
          <span className="text-muted-foreground text-sm">Gross Total (支給計):</span>
          <span>{Math.round(totalEarnings).toLocaleString()} JPY</span>
        </div>
        <div className="flex justify-between text-destructive">
          <span className="text-muted-foreground text-sm">Total Deductions (控除計):</span>
          <span>-{Math.round(totalDeductions).toLocaleString()} JPY</span>
        </div>
        <div className="flex justify-between text-xl font-bold border-t border-primary/20 pt-2 mt-2">
          <span>Net Salary (差引支給額):</span>
          <span className="text-primary">{Math.round(netPay).toLocaleString()} JPY</span>
        </div>
      </div>
    </div>
  );
}
