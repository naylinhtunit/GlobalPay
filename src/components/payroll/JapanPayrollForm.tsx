"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export interface JapanData {
  // Attendance (勤怠)
  scheduledDays: number;
  absenceHours: number;
  lateEarlyHours: number;
  regularOTHours: number;
  lateNightOTHours: number;
  holidayWorkHours: number;
  holidayNightHours: number;
  nightShiftHours: number;
  nightShiftHoursExtra: number;
  paidLeaveDays: number;
  lunchCount: number;
  scheduledHours: number;
  remainingPaidLeave: number;

  // Earnings (支給)
  otAllowance: number;
  lateNightOTAllowance: number;
  nightShiftAllowance: number;
  nightShiftAllowanceExtra: number;
  holidayWorkAllowance: number;
  holidayNightAllowance: number;
  familyAllowance: number;
  housingAllowance: number;
  nonTaxableCommuting: number;
  taxableCommuting: number;
  absenceDeduction: number;
  lateEarlyDeduction: number;
  prevMonthAdj: number;
  leaveAllowance: number;

  // Deductions (控除)
  healthInsurance: number;
  nursingCareInsurance: number;
  pension: number;
  socInsAdj: number;
  employmentInsurance: number;
  incomeTax: number;
  residentTax: number;
  lunchFee: number;
  hostelFee: number;
  beddingFee: number;

  // Others (その他)
  yearEndAdj: number;
  otherAdj1: number;
  otherAdj2: number;
  paidLeaveBuyback: number;
  cashPayment: number;
  kindPayment: number;
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

  // Calculations
  const totalEarnings = baseSalary + 
                        (data.otAllowance || 0) + 
                        (data.lateNightOTAllowance || 0) + 
                        (data.nightShiftAllowance || 0) + 
                        (data.nightShiftAllowanceExtra || 0) + 
                        (data.holidayWorkAllowance || 0) + 
                        (data.holidayNightAllowance || 0) + 
                        (data.familyAllowance || 0) + 
                        (data.housingAllowance || 0) + 
                        (data.nonTaxableCommuting || 0) + 
                        (data.taxableCommuting || 0) + 
                        (data.prevMonthAdj || 0) + 
                        (data.leaveAllowance || 0) -
                        (data.absenceDeduction || 0) -
                        (data.lateEarlyDeduction || 0);

  const totalDeductions = (data.healthInsurance || 0) + 
                          (data.nursingCareInsurance || 0) +
                          (data.pension || 0) + 
                          (data.socInsAdj || 0) + 
                          (data.employmentInsurance || 0) + 
                          (data.incomeTax || 0) + 
                          (data.residentTax || 0) +
                          (data.lunchFee || 0) +
                          (data.hostelFee || 0) +
                          (data.beddingFee || 0);
  
  const netPay = totalEarnings - totalDeductions + (data.yearEndAdj || 0) + (data.otherAdj1 || 0) + (data.otherAdj2 || 0) + (data.paidLeaveBuyback || 0);

  return (
    <div className="space-y-8">
      {/* Attendance Section */}
      <div className="space-y-4 bg-slate-50 p-4 rounded-lg border">
        <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider border-b pb-1">勤怠 (Attendance)</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "所定就労日", en: "Sch. Work Days", field: "scheduledDays" },
            { label: "欠勤日時間", en: "Absence Days/Hrs", field: "absenceHours" },
            { label: "遅刻早退時間", en: "Late/Early Hrs", field: "lateEarlyHours" },
            { label: "普通残業時間", en: "Regular OT Hrs", field: "regularOTHours" },
            { label: "深夜残業時間", en: "Late Night OT Hrs", field: "lateNightOTHours" },
            { label: "休日勤務時間", en: "Holiday Work Hrs", field: "holidayWorkHours" },
            { label: "休日深夜時間", en: "Holiday Night Hrs", field: "holidayNightHours" },
            { label: "~22 (Night Hrs)", en: "Night Shift 1", field: "nightShiftHours" },
            { label: "22~ (Night Hrs)", en: "Night Shift 2", field: "nightShiftHoursExtra" },
            { label: "有休日数", en: "Paid Leave Days", field: "paidLeaveDays" },
            { label: "昼食回数", en: "Lunch Count", field: "lunchCount" },
            { label: "所定労働時間", en: "Sch. Work Hours", field: "scheduledHours" },
            { label: "有休残日数", en: "Rem. Leave Days", field: "remainingPaidLeave" },
          ].map((item) => (
            <div key={item.field} className="space-y-1">
              <Label className="text-[10px] leading-tight block">{item.label}<br/><span className="text-muted-foreground">{item.en}</span></Label>
              <Input type="number" className="h-8 text-xs" value={(data as any)[item.field]} onFocus={handleFocus} onChange={e => updateField(item.field as keyof JapanData, e.target.value)} />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Earnings Section */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-blue-700 uppercase tracking-wider border-b pb-1">支給 (Earnings)</h4>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "普通残業手当", en: "Regular OT Alw", field: "otAllowance" },
              { label: "深夜残業手当", en: "Late Night OT Alw", field: "lateNightOTAllowance" },
              { label: "~22 深夜手当", en: "Night Alw 1", field: "nightShiftAllowance" },
              { label: "22~ 深夜手当", en: "Night Alw 2", field: "nightShiftAllowanceExtra" },
              { label: "休日勤務手当", en: "Holiday Work Alw", field: "holidayWorkAllowance" },
              { label: "休日深夜手当", en: "Holiday Night Alw", field: "holidayNightAllowance" },
              { label: "家族手当", en: "Family Alw", field: "familyAllowance" },
              { label: "住宅手当", en: "Housing Alw", field: "housingAllowance" },
              { label: "非課税通勤費", en: "Non-tax Commuting", field: "nonTaxableCommuting" },
              { label: "課税通勤費", en: "Taxable Commuting", field: "taxableCommuting" },
              { label: "欠勤時間控除", en: "Absence Ded", field: "absenceDeduction", color: "text-red-600" },
              { label: "遅刻早退控除", en: "Late/Early Ded", field: "lateEarlyDeduction", color: "text-red-600" },
              { label: "前月修正", en: "Prev Month Adj", field: "prevMonthAdj" },
              { label: "休業手当", en: "Leave Alw", field: "leaveAllowance" },
            ].map((item) => (
              <div key={item.field} className="space-y-1">
                <Label className={`text-[10px] leading-tight block ${item.color || ""}`}>{item.label}<br/><span className="text-muted-foreground">{item.en}</span></Label>
                <Input type="number" className="h-8 text-xs" value={(data as any)[item.field]} onFocus={handleFocus} onChange={e => updateField(item.field as keyof JapanData, e.target.value)} />
              </div>
            ))}
          </div>
        </div>

        {/* Deductions Section */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-red-700 uppercase tracking-wider border-b pb-1">控除 (Deductions)</h4>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "健康保険料", en: "Health Insurance", field: "healthInsurance" },
              { label: "介護保険料", en: "Nursing Care Ins", field: "nursingCareInsurance" },
              { label: "厚生年金保険", en: "Welfare Pension", field: "pension" },
              { label: "社保料調整", en: "Soc Ins Adj", field: "socInsAdj" },
              { label: "雇用保険料", en: "Employment Ins", field: "employmentInsurance" },
              { label: "所得税", en: "Income Tax", field: "incomeTax" },
              { label: "住民税", en: "Resident Tax", field: "residentTax" },
              { label: "昼食代", en: "Lunch Fee", field: "lunchFee" },
              { label: "寮費", en: "Hostel Fee", field: "hostelFee" },
              { label: "布団代", en: "Bedding Fee", field: "beddingFee" },
            ].map((item) => (
              <div key={item.field} className="space-y-1">
                <Label className="text-[10px] leading-tight block">{item.label}<br/><span className="text-muted-foreground">{item.en}</span></Label>
                <Input type="number" className="h-8 text-xs" value={(data as any)[item.field]} onFocus={handleFocus} onChange={e => updateField(item.field as keyof JapanData, e.target.value)} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Others Section */}
      <div className="space-y-4 bg-slate-50 p-4 rounded-lg border">
        <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider border-b pb-1">その他 (Others & Adjustments)</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "年末調整徴収", en: "Year-end Adj", field: "yearEndAdj" },
            { label: "その他調整", en: "Other Adj 1", field: "otherAdj1" },
            { label: "その他調整2", en: "Other Adj 2", field: "otherAdj2" },
            { label: "有給買取", en: "Leave Buyback", field: "paidLeaveBuyback" },
            { label: "現金支給額", en: "Cash Payment", field: "cashPayment" },
            { label: "現物支給額", en: "Kind Payment", field: "kindPayment" },
          ].map((item) => (
            <div key={item.field} className="space-y-1">
              <Label className="text-[10px] leading-tight block">{item.label}<br/><span className="text-muted-foreground">{item.en}</span></Label>
              <Input type="number" className="h-8 text-xs" value={(data as any)[item.field]} onFocus={handleFocus} onChange={e => updateField(item.field as keyof JapanData, e.target.value)} />
            </div>
          ))}
        </div>
      </div>

      {/* Summary Footer */}
      <div className="p-4 bg-primary/10 rounded-xl border-2 border-primary/20 grid grid-cols-3 gap-4">
        <div className="text-center border-r border-primary/20">
          <p className="text-[10px] text-muted-foreground uppercase">Gross Total (支給計)</p>
          <p className="text-lg font-bold">{Math.round(totalEarnings).toLocaleString()} JPY</p>
        </div>
        <div className="text-center border-r border-primary/20 text-red-600">
          <p className="text-[10px] text-muted-foreground uppercase">Total Deductions (控除計)</p>
          <p className="text-lg font-bold">-{Math.round(totalDeductions).toLocaleString()} JPY</p>
        </div>
        <div className="text-center text-primary">
          <p className="text-[10px] text-muted-foreground uppercase">Net Pay (差引支給額)</p>
          <p className="text-xl font-black">{Math.round(netPay).toLocaleString()} JPY</p>
        </div>
      </div>
    </div>
  );
}
