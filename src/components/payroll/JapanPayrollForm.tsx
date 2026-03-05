
"use client";

import React, { useEffect } from "react";
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
  
  // Logic to auto-calculate values based on attendance and base salary
  useEffect(() => {
    const hourlyRate = baseSalary / 160; // Assuming 160 standard working hours per month

    // 1. Calculate Earnings (支給) automatically
    const calculatedOT = Math.round(hourlyRate * 1.25 * data.regularOTHours);
    const calculatedLateNightOT = Math.round(hourlyRate * 0.25 * data.lateNightOTHours);
    const calculatedHolidayWork = Math.round(hourlyRate * 1.35 * data.holidayWorkHours);
    const calculatedHolidayNight = Math.round(hourlyRate * 0.25 * data.holidayNightHours);
    const calculatedAbsenceDed = Math.round(hourlyRate * data.absenceHours);
    const calculatedLateEarlyDed = Math.round(hourlyRate * data.lateEarlyHours);

    // 2. Calculate Social Insurances (Deductions - 控除) with default percentages
    // Approx percentages for employee portion in Japan
    const calculatedHealthIns = data.healthInsurance === 0 ? Math.round(baseSalary * 0.05) : data.healthInsurance; 
    const calculatedPension = data.pension === 0 ? Math.round(baseSalary * 0.0915) : data.pension;
    const calculatedEmpIns = Math.round((baseSalary + calculatedOT + calculatedLateNightOT) * 0.006);

    // 3. Calculate Income Tax (Simplified Japan withholding calculation)
    const grossForTax = baseSalary + calculatedOT + calculatedLateNightOT + calculatedHolidayWork - (calculatedHealthIns + calculatedPension + calculatedEmpIns);
    let calculatedIncomeTax = 0;
    if (grossForTax > 0) {
      // Simplified bracket: 5% up to 150k, 10% above
      calculatedIncomeTax = grossForTax < 150000 ? Math.round(grossForTax * 0.05) : Math.round(7500 + (grossForTax - 150000) * 0.1);
    }

    // Default Hostel/Bedding if not set
    const defaultHostelFee = data.hostelFee === 0 ? 15000 : data.hostelFee;
    const defaultBeddingFee = data.beddingFee === 0 ? 1500 : data.beddingFee;

    // Apply auto-updates only if values have changed to avoid loops
    if (
      data.otAllowance !== calculatedOT ||
      data.lateNightOTAllowance !== calculatedLateNightOT ||
      data.absenceDeduction !== calculatedAbsenceDed ||
      data.healthInsurance !== calculatedHealthIns ||
      data.pension !== calculatedPension ||
      data.employmentInsurance !== calculatedEmpIns ||
      data.incomeTax !== calculatedIncomeTax ||
      data.hostelFee !== defaultHostelFee
    ) {
      onChange({
        ...data,
        otAllowance: calculatedOT,
        lateNightOTAllowance: calculatedLateNightOT,
        holidayWorkAllowance: calculatedHolidayWork,
        holidayNightAllowance: calculatedHolidayNight,
        absenceDeduction: calculatedAbsenceDed,
        lateEarlyDeduction: calculatedLateEarlyDed,
        healthInsurance: calculatedHealthIns,
        pension: calculatedPension,
        employmentInsurance: calculatedEmpIns,
        incomeTax: calculatedIncomeTax,
        hostelFee: defaultHostelFee,
        beddingFee: defaultBeddingFee
      });
    }
  }, [baseSalary, data.regularOTHours, data.lateNightOTHours, data.holidayWorkHours, data.holidayNightHours, data.absenceHours, data.lateEarlyHours]);

  const updateField = (field: keyof JapanData, value: string) => {
    const numValue = value === "" ? 0 : Number(value);
    onChange({ ...data, [field]: numValue });
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value === "0") {
      e.target.select();
    }
  };

  // Calculations for Footer
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
      {/* 1st Form: Attendance (勤怠) - MANUAL INPUT */}
      <div className="space-y-4 bg-slate-50 p-4 rounded-lg border-2 border-slate-200">
        <div className="flex justify-between items-center border-b pb-2">
          <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">勤怠 (ATTENDANCE)</h4>
          <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded text-slate-600 font-bold">MANUAL ENTRY</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "所定就労日", en: "Sch. Work Days", field: "scheduledDays" },
            { label: "欠勤日時間", en: "Absence Hrs", field: "absenceHours" },
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
              <Label className="text-[10px] leading-tight block font-semibold">{item.label}<br/><span className="text-slate-500 font-normal">{item.en}</span></Label>
              <Input type="number" className="h-8 text-xs border-slate-300 focus:border-primary" value={(data as any)[item.field]} onFocus={handleFocus} onChange={e => updateField(item.field as keyof JapanData, e.target.value)} />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 2nd Form: Earnings (支給) - AUTO CALCULATED */}
        <div className="space-y-4 bg-blue-50/30 p-4 rounded-lg border border-blue-100">
          <div className="flex justify-between items-center border-b border-blue-200 pb-2 mb-4">
            <h4 className="text-sm font-bold text-blue-800 uppercase tracking-wider">支給 (EARNINGS)</h4>
            <span className="text-[9px] text-blue-600 font-bold italic">AUTO-CALCULATED</span>
          </div>
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
                <Label className={`text-[10px] leading-tight block font-semibold ${item.color || ""}`}>{item.label}<br/><span className="text-slate-500 font-normal">{item.en}</span></Label>
                <Input type="number" readOnly className="h-8 text-xs bg-white/50 border-blue-200 cursor-not-allowed" value={(data as any)[item.field]} />
              </div>
            ))}
          </div>
        </div>

        {/* 3rd Form: Deductions (控除) - DEFAULTS + AUTO CALCULATED TAX */}
        <div className="space-y-4 bg-red-50/30 p-4 rounded-lg border border-red-100">
          <div className="flex justify-between items-center border-b border-red-200 pb-2 mb-4">
            <h4 className="text-sm font-bold text-red-800 uppercase tracking-wider">控除 (DEDUCTIONS)</h4>
            <span className="text-[9px] text-red-600 font-bold italic">DEFAULTS APPLIED</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "健康保険料", en: "Health Insurance", field: "healthInsurance" },
              { label: "介護保険料", en: "Nursing Care Ins", field: "nursingCareInsurance" },
              { label: "厚生年金保険", en: "Welfare Pension", field: "pension" },
              { label: "社保料調整", en: "Soc Ins Adj", field: "socInsAdj" },
              { label: "雇用保険料", en: "Employment Ins", field: "employmentInsurance" },
              { label: "所得税", en: "Income Tax", field: "incomeTax", highlight: true },
              { label: "住民税", en: "Resident Tax", field: "residentTax" },
              { label: "昼食代", en: "Lunch Fee", field: "lunchFee" },
              { label: "寮費", en: "Hostel Fee", field: "hostelFee" },
              { label: "布団代", en: "Bedding Fee", field: "beddingFee" },
            ].map((item) => (
              <div key={item.field} className="space-y-1">
                <Label className="text-[10px] leading-tight block font-semibold">{item.label}<br/><span className="text-slate-500 font-normal">{item.en}</span></Label>
                <Input 
                  type="number" 
                  className={`h-8 text-xs ${item.highlight ? 'border-primary ring-1 ring-primary/20' : 'border-red-200'}`} 
                  value={(data as any)[item.field]} 
                  onFocus={handleFocus} 
                  onChange={e => updateField(item.field as keyof JapanData, e.target.value)} 
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Others Section */}
      <div className="space-y-4 bg-slate-50 p-4 rounded-lg border">
        <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider border-b pb-1">その他 (OTHERS)</h4>
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
              <Label className="text-[10px] leading-tight block font-semibold">{item.label}<br/><span className="text-slate-500 font-normal">{item.en}</span></Label>
              <Input type="number" className="h-8 text-xs" value={(data as any)[item.field]} onFocus={handleFocus} onChange={e => updateField(item.field as keyof JapanData, e.target.value)} />
            </div>
          ))}
        </div>
      </div>

      {/* Summary Footer */}
      <div className="p-6 bg-slate-900 text-white rounded-xl shadow-xl grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="text-center sm:border-r border-slate-700">
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Gross Total (支給計)</p>
          <p className="text-2xl font-black">{Math.round(totalEarnings).toLocaleString()} <span className="text-xs font-normal text-slate-400">JPY</span></p>
        </div>
        <div className="text-center sm:border-r border-slate-700">
          <p className="text-[10px] text-red-400 uppercase font-bold tracking-widest mb-1">Total Deductions (控除計)</p>
          <p className="text-2xl font-black text-red-400">-{Math.round(totalDeductions).toLocaleString()} <span className="text-xs font-normal text-red-500/50">JPY</span></p>
        </div>
        <div className="text-center text-primary-foreground bg-primary/20 rounded-lg p-2">
          <p className="text-[10px] text-primary uppercase font-bold tracking-widest mb-1">Net Pay (差引支給額)</p>
          <p className="text-3xl font-black text-primary">{Math.round(netPay).toLocaleString()} <span className="text-xs font-normal">JPY</span></p>
        </div>
      </div>
    </div>
  );
}
