
"use client";

import React, { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface JapanData {
  // Attendance (勤怠)
  scheduledDays: number;
  absenceHours: number;
  lateEarlyHours: number;
  regularOTHours: number;
  lateNightOTHours: number;
  holidayWorkHours: number;
  holidayNightHours: number;
  nightShiftHours: number; // ~22
  nightShiftHoursExtra: number; // 22~
  paidLeaveDays: number;
  lunchCount: number;
  scheduledHours: number;
  remainingPaidLeave: number;

  // Earnings (支給)
  otAllowance: number;
  lateNightOTAllowance: number;
  nightShiftAllowance: number; // ~22
  nightShiftAllowanceExtra: number; // 22~
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
  
  useEffect(() => {
    // Determine denominator for hourly rate (Average 170.5 if not specified)
    const denominator = data.scheduledHours > 0 ? data.scheduledHours : 170.5;
    const hourlyRate = baseSalary / denominator;

    // 1. Calculate Earnings (支給) using exact multipliers from payslip context
    // Regular OT = 1.25
    // Late Night OT = 1.50 (1.25 + 0.25)
    // Night Shift Premium = 0.25
    const calculatedOT = Math.round(hourlyRate * 1.25 * data.regularOTHours);
    const calculatedLateNightOT = Math.round(hourlyRate * 1.50 * data.lateNightOTHours);
    const calculatedHolidayWork = Math.round(hourlyRate * 1.35 * data.holidayWorkHours);
    const calculatedHolidayNight = Math.round(hourlyRate * 0.25 * data.holidayNightHours);
    
    // Night Shift Allowances (Premium portion 0.25)
    const calculatedNightAlw1 = Math.round(hourlyRate * 0.25 * data.nightShiftHours);
    const calculatedNightAlw2 = Math.round(hourlyRate * 0.25 * data.nightShiftHoursExtra);

    // Deductions from earnings (Absence/Late)
    const calculatedAbsenceDed = Math.round(hourlyRate * data.absenceHours);
    const calculatedLateEarlyDed = Math.round(hourlyRate * data.lateEarlyHours);

    // 2. Default Values as requested
    const defaultHousing = data.housingAllowance === 0 ? 10000 : data.housingAllowance;
    const defaultHostelFee = data.hostelFee === 0 ? 20000 : data.hostelFee;

    // 3. Calculate Social Insurances (Deductions - 控除)
    // Health Insurance (Approx 5% for employee)
    const calculatedHealthIns = data.healthInsurance === 0 ? Math.round(baseSalary * 0.05) : data.healthInsurance; 
    // Pension (Approx 9.15% for employee)
    const calculatedPension = data.pension === 0 ? Math.round(baseSalary * 0.0915) : data.pension;
    
    // Employment Insurance (Standard 0.006)
    const taxableEarnings = baseSalary + calculatedOT + calculatedLateNightOT + calculatedHolidayWork + (data.housingAllowance || 10000);
    const calculatedEmpIns = Math.round(taxableEarnings * 0.006);

    // 4. Calculate Income Tax (Simplified withholding)
    const totalSocIns = calculatedHealthIns + calculatedPension + calculatedEmpIns + (data.nursingCareInsurance || 0);
    const grossForTax = taxableEarnings - totalSocIns;
    let calculatedIncomeTax = 0;
    if (grossForTax > 0) {
      // Simplified bracket for demonstration
      calculatedIncomeTax = grossForTax < 150000 ? Math.round(grossForTax * 0.05) : Math.round(7500 + (grossForTax - 150000) * 0.1);
    }

    // Update form if calculated values change
    if (
      data.otAllowance !== calculatedOT ||
      data.lateNightOTAllowance !== calculatedLateNightOT ||
      data.nightShiftAllowance !== calculatedNightAlw1 ||
      data.nightShiftAllowanceExtra !== calculatedNightAlw2 ||
      data.housingAllowance !== defaultHousing ||
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
        nightShiftAllowance: calculatedNightAlw1,
        nightShiftAllowanceExtra: calculatedNightAlw2,
        housingAllowance: defaultHousing,
        holidayWorkAllowance: calculatedHolidayWork,
        holidayNightAllowance: calculatedHolidayNight,
        absenceDeduction: calculatedAbsenceDed,
        lateEarlyDeduction: calculatedLateEarlyDed,
        healthInsurance: calculatedHealthIns,
        pension: calculatedPension,
        employmentInsurance: calculatedEmpIns,
        incomeTax: calculatedIncomeTax,
        hostelFee: defaultHostelFee,
      });
    }
  }, [baseSalary, data.regularOTHours, data.lateNightOTHours, data.holidayWorkHours, data.holidayNightHours, data.absenceHours, data.lateEarlyHours, data.nightShiftHours, data.nightShiftHoursExtra, data.scheduledHours]);

  const updateField = (field: keyof JapanData, value: string) => {
    const numValue = value === "" ? 0 : Number(value);
    onChange({ ...data, [field]: numValue });
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value === "0") {
      e.target.select();
    }
  };

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
      {/* 勤怠 (ATTENDANCE) */}
      <div className="space-y-4 bg-slate-50 p-4 rounded-lg border-2 border-slate-200">
        <div className="flex justify-between items-center border-b pb-2">
          <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">勤怠 (ATTENDANCE)</h4>
          <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded text-slate-600 font-bold uppercase tracking-tight">Input Required</span>
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
            { label: "~22", en: "Night Shift 1", field: "nightShiftHours" },
            { label: "22~", en: "Night Shift 2", field: "nightShiftHoursExtra" },
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
        {/* 支給 (EARNINGS) */}
        <div className="space-y-4 bg-blue-50/30 p-4 rounded-lg border border-blue-100">
          <div className="flex justify-between items-center border-b border-blue-200 pb-2 mb-4">
            <h4 className="text-sm font-bold text-blue-800 uppercase tracking-wider">支給 (EARNINGS)</h4>
            <span className="text-[9px] text-blue-600 font-bold italic uppercase tracking-tight">Auto-Calculated</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2 bg-white/60 p-2 rounded border border-blue-200">
               <Label className="text-[10px] leading-tight block font-bold text-blue-900">基本給<br/><span className="text-slate-500 font-normal">Basic Salary (From Profile)</span></Label>
               <p className="text-lg font-black text-blue-700">{baseSalary?.toLocaleString()} <span className="text-xs font-normal">JPY</span></p>
            </div>
            {[
              { label: "普通残業手当 (1.25)", en: "Regular OT Alw (1.25)", field: "otAllowance" },
              { label: "深夜残業手当 (1.50)", en: "Late Night OT (1.50)", field: "lateNightOTAllowance" },
              { label: "~22 (0.25)", en: "Night Alw 1 (0.25)", field: "nightShiftAllowance" },
              { label: "22~ (0.25)", en: "Night Alw 2 (0.25)", field: "nightShiftAllowanceExtra" },
              { label: "休日勤務手当 (1.35)", en: "Holiday Work (1.35)", field: "holidayWorkAllowance" },
              { label: "休日深夜手当 (0.25)", en: "Holiday Night (0.25)", field: "holidayNightAllowance" },
              { label: "家族手当", en: "Family Alw", field: "familyAllowance", readOnly: false },
              { label: "住宅手当", en: "Housing Alw", field: "housingAllowance", readOnly: false },
              { label: "非課税通勤費", en: "Non-tax Commuting", field: "nonTaxableCommuting", readOnly: false },
              { label: "課税通勤費", en: "Taxable Commuting", field: "taxableCommuting", readOnly: false },
              { label: "欠勤時間控除", en: "Absence Ded", field: "absenceDeduction", color: "text-red-600" },
              { label: "遅刻早退控除", en: "Late/Early Ded", field: "lateEarlyDeduction", color: "text-red-600" },
              { label: "前月修正", en: "Prev Month Adj", field: "prevMonthAdj", readOnly: false },
              { label: "休業手当", en: "Leave Alw", field: "leaveAllowance", readOnly: false },
            ].map((item) => (
              <div key={item.field} className="space-y-1">
                <Label className={`text-[10px] leading-tight block font-semibold ${item.color || ""}`}>{item.label}<br/><span className="text-slate-500 font-normal">{item.en}</span></Label>
                <Input 
                  type="number" 
                  readOnly={item.readOnly !== false}
                  className={`h-8 text-xs ${item.readOnly === false ? 'bg-white border-blue-400' : 'bg-white/50 border-blue-200 cursor-not-allowed'}`} 
                  value={(data as any)[item.field]} 
                  onChange={e => item.readOnly === false && updateField(item.field as keyof JapanData, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* 控除 (DEDUCTIONS) */}
        <div className="space-y-4 bg-red-50/30 p-4 rounded-lg border border-red-100">
          <div className="flex justify-between items-center border-b border-red-200 pb-2 mb-4">
            <h4 className="text-sm font-bold text-red-800 uppercase tracking-wider">控除 (DEDUCTIONS)</h4>
            <span className="text-[9px] text-red-600 font-bold italic uppercase tracking-tight">Manual Adjust Available</span>
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
                  className={`h-8 text-xs ${item.highlight ? 'border-primary ring-1 ring-primary/20 font-bold' : 'border-red-200'}`} 
                  value={(data as any)[item.field]} 
                  onFocus={handleFocus} 
                  onChange={e => updateField(item.field as keyof JapanData, e.target.value)} 
                />
              </div>
            ))}
          </div>
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
