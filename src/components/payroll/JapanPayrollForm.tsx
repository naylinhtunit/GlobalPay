"use client";

import React, { useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Info, Sun, Moon } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export interface JapanData {
  // Shift Context
  shiftType?: "day" | "night";
  startTime?: string;

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
  employeeLeave?: { total: number; used: number };
}

export function JapanPayrollForm({ data, onChange, baseSalary, employeeLeave }: Props) {
  // Use persisted values from props or defaults
  const shiftType = data.shiftType || "day";
  const startTime = data.startTime || (shiftType === "day" ? "08:00" : "19:00");

  // Track if shift parameters changed to prevent overwriting manual edits of hours unnecessarily
  const prevParamsRef = useRef({
    scheduledDays: data.scheduledDays,
    shiftType,
    startTime
  });

  useEffect(() => {
    const paramsChanged = 
      prevParamsRef.current.scheduledDays !== data.scheduledDays ||
      prevParamsRef.current.shiftType !== shiftType ||
      prevParamsRef.current.startTime !== startTime;

    prevParamsRef.current = { scheduledDays: data.scheduledDays, shiftType, startTime };

    // 1. Auto-calculate Scheduled Hours based on Days (8 hours per day)
    const autoScheduledHours = data.scheduledDays * 8;
    
    // 2. Night Shift Auto-calculation based on Start Time
    let dailyNS1 = 0;
    let dailyNS2 = 0;

    if (shiftType === "day") {
      if (startTime === "08:00") {
        dailyNS1 = 0;
        dailyNS2 = 0;
      } else if (startTime === "12:00") {
        dailyNS1 = 4;
        dailyNS2 = 0;
      }
    } else {
      if (startTime === "19:00") {
        dailyNS1 = 3;
        dailyNS2 = 5;
      } else if (startTime === "21:00") {
        dailyNS1 = 1;
        dailyNS2 = 7;
      }
    }

    const calculatedNS1 = dailyNS1 * data.scheduledDays;
    const calculatedNS2 = dailyNS2 * data.scheduledDays;

    // 3. Denominator for Overtime Calculation (Standard monthly hours)
    const otDenominator = 170.5;
    const hourlyRate = baseSalary / otDenominator;

    // 4. Multipliers
    const calculatedOT = Math.round(hourlyRate * 1.25 * data.regularOTHours);
    const calculatedLateNightOT = Math.round(hourlyRate * 1.50 * data.lateNightOTHours);
    const calculatedHolidayWork = Math.round(hourlyRate * 1.35 * data.holidayWorkHours);
    const calculatedHolidayNight = Math.round(hourlyRate * 0.25 * data.holidayNightHours);
    
    // Night Shift Allowances
    const calculatedNightAlw1 = Math.round(hourlyRate * 0.25 * data.nightShiftHours);
    const calculatedNightAlw2 = Math.round(hourlyRate * 0.30 * data.nightShiftHoursExtra);

    // Deductions from earnings
    const calculatedAbsenceDed = Math.round(hourlyRate * data.absenceHours);
    const calculatedLateEarlyDed = Math.round(hourlyRate * data.lateEarlyHours);

    // 5. Default Values
    const defaultHousing = data.housingAllowance === 0 ? 10000 : data.housingAllowance;
    const defaultHostelFee = data.hostelFee === 0 ? 20000 : data.hostelFee;

    // 6. Social Insurance & Tax
    const calculatedHealthIns = data.healthInsurance === 0 ? 13312 : data.healthInsurance; 
    const calculatedPension = data.pension === 0 ? 23790 : data.pension;
    
    const totalEarningsCalc = baseSalary + calculatedOT + calculatedLateNightOT + 
                             calculatedNightAlw1 + calculatedNightAlw2 + 
                             calculatedHolidayWork + calculatedHolidayNight + 
                             (data.familyAllowance || 0) + defaultHousing + 
                             (data.nonTaxableCommuting || 0) + (data.taxableCommuting || 0) + 
                             (data.prevMonthAdj || 0) + (data.leaveAllowance || 0) -
                             calculatedAbsenceDed - calculatedLateEarlyDed;

    const calculatedEmpIns = Math.round(totalEarningsCalc * 0.0055);

    const totalSocIns = calculatedHealthIns + calculatedPension + calculatedEmpIns + (data.nursingCareInsurance || 0);
    const grossForTax = totalEarningsCalc - totalSocIns - (data.nonTaxableCommuting || 0);
    let calculatedIncomeTax = 0;
    if (grossForTax > 0) {
      calculatedIncomeTax = Math.round(grossForTax * 0.0232);
    }

    // 7. Calculate Remaining Paid Leave
    const remainingLeave = employeeLeave 
      ? Math.max(0, employeeLeave.total - employeeLeave.used - Number(data.paidLeaveDays))
      : 0;

    // Apply updates if logic produces different values
    const needsUpdate = 
      paramsChanged ||
      data.otAllowance !== calculatedOT ||
      data.lateNightOTAllowance !== calculatedLateNightOT ||
      data.nightShiftAllowance !== calculatedNightAlw1 ||
      data.nightShiftAllowanceExtra !== calculatedNightAlw2 ||
      data.housingAllowance !== defaultHousing ||
      data.absenceDeduction !== calculatedAbsenceDed ||
      data.lateEarlyDeduction !== calculatedLateEarlyDed ||
      data.healthInsurance !== calculatedHealthIns ||
      data.pension !== calculatedPension ||
      data.employmentInsurance !== calculatedEmpIns ||
      data.incomeTax !== calculatedIncomeTax ||
      data.hostelFee !== defaultHostelFee ||
      data.remainingPaidLeave !== remainingLeave;

    if (needsUpdate) {
      onChange({
        ...data,
        shiftType,
        startTime,
        scheduledHours: paramsChanged ? autoScheduledHours : data.scheduledHours,
        nightShiftHours: paramsChanged ? calculatedNS1 : data.nightShiftHours,
        nightShiftHoursExtra: paramsChanged ? calculatedNS2 : data.nightShiftHoursExtra,
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
        remainingPaidLeave: remainingLeave
      });
    }
  }, [
    baseSalary, 
    data.scheduledDays, 
    data.regularOTHours, 
    data.lateNightOTHours, 
    data.holidayWorkHours, 
    data.holidayNightHours, 
    data.absenceHours, 
    data.lateEarlyHours, 
    data.nightShiftHours, 
    data.nightShiftHoursExtra,
    data.paidLeaveDays,
    shiftType,
    startTime,
    employeeLeave
  ]);

  const updateField = (field: keyof JapanData, value: string) => {
    const numValue = value === "" ? 0 : Number(value);
    onChange({ ...data, [field]: numValue });
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value === "" || e.target.value === "0") {
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

  const ExplanationLabel = ({ label, en, jpExpl, mmExpl }: { label: string, en: string, jpExpl?: string, mmExpl?: string }) => (
    <div className="flex items-center gap-1">
      <Label className="text-[10px] leading-tight block font-semibold">
        {label}<br/><span className="text-slate-500 font-normal">{en}</span>
      </Label>
      {jpExpl && (
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="inline-flex items-center justify-center rounded-full hover:bg-slate-200 transition-colors p-0.5">
              <Info size={14} className="text-primary cursor-pointer" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="max-w-[280px] space-y-3 p-4 shadow-xl border-2">
            <p className="text-xs font-bold border-b pb-2">Calculation Logic (တွက်ချက်ပုံ)</p>
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Japanese</p>
              <p className="text-[11px] leading-relaxed text-slate-800">{jpExpl}</p>
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Burmese</p>
              <p className="text-[11px] leading-relaxed text-slate-800">{mmExpl}</p>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Shift Selection Section */}
      <div className="bg-card border-2 border-slate-200 p-6 rounded-xl space-y-6 shadow-sm">
        <div className="flex items-center gap-2 border-b pb-3">
          <Label className="text-sm font-bold uppercase tracking-wider text-slate-800">勤務シフト (SHIFT SELECTION)</Label>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <Label className="text-xs font-bold text-slate-500 uppercase">Shift Type</Label>
            <RadioGroup 
              value={shiftType} 
              onValueChange={(v) => {
                onChange({
                  ...data,
                  shiftType: v as "day" | "night",
                  startTime: v === "day" ? "08:00" : "19:00"
                });
              }}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-3 bg-slate-50 px-4 py-4 rounded-lg border flex-1 cursor-pointer hover:bg-slate-100 transition-colors">
                <RadioGroupItem value="day" id="day-shift" />
                <Label htmlFor="day-shift" className="flex items-center gap-2 cursor-pointer font-bold leading-normal min-h-[2.5rem]">
                  <Sun size={18} className="text-orange-500 flex-shrink-0" />
                  <span>昼勤<br/><span className="text-[10px] font-normal opacity-70">(Day)</span></span>
                </Label>
              </div>
              <div className="flex items-center space-x-3 bg-slate-50 px-4 py-4 rounded-lg border flex-1 cursor-pointer hover:bg-slate-100 transition-colors">
                <RadioGroupItem value="night" id="night-shift" />
                <Label htmlFor="night-shift" className="flex items-center gap-2 cursor-pointer font-bold leading-normal min-h-[2.5rem]">
                  <Moon size={18} className="text-primary flex-shrink-0" />
                  <span>夜勤<br/><span className="text-[10px] font-normal opacity-70">(Night)</span></span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-4">
            <Label className="text-xs font-bold text-slate-500 uppercase">Start Time</Label>
            <RadioGroup 
              value={startTime} 
              onValueChange={(v) => {
                onChange({ ...data, startTime: v });
              }} 
              className="flex gap-4"
            >
              {shiftType === "day" ? (
                <>
                  <div className="flex items-center space-x-2 bg-slate-50 px-4 py-3 rounded-lg border flex-1 cursor-pointer">
                    <RadioGroupItem value="08:00" id="t-0800" />
                    <Label htmlFor="t-0800" className="cursor-pointer font-bold">08:00 AM</Label>
                  </div>
                  <div className="flex items-center space-x-2 bg-slate-50 px-4 py-3 rounded-lg border flex-1 cursor-pointer">
                    <RadioGroupItem value="12:00" id="t-1200" />
                    <Label htmlFor="t-1200" className="cursor-pointer font-bold">12:00 PM</Label>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center space-x-2 bg-slate-50 px-4 py-3 rounded-lg border flex-1 cursor-pointer">
                    <RadioGroupItem value="19:00" id="t-1900" />
                    <Label htmlFor="t-1900" className="cursor-pointer font-bold">07:00 PM</Label>
                  </div>
                  <div className="flex items-center space-x-2 bg-slate-50 px-4 py-3 rounded-lg border flex-1 cursor-pointer">
                    <RadioGroupItem value="21:00" id="t-2100" />
                    <Label htmlFor="t-2100" className="cursor-pointer font-bold">09:00 PM</Label>
                  </div>
                </>
              )}
            </RadioGroup>
          </div>
        </div>
      </div>

      {/* 勤怠 (ATTENDANCE) */}
      <div className="space-y-4 bg-slate-50 p-4 rounded-lg border-2 border-slate-200">
        <div className="flex justify-between items-center border-b pb-2">
          <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">勤怠 (ATTENDANCE)</h4>
          <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded text-slate-600 font-bold uppercase tracking-tight">Input Required</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "所定就労日", en: "Sch. Work Days", field: "scheduledDays" },
            { label: "欠勤日時間", en: "Absence", field: "absenceHours" },
            { label: "遅刻早退", en: "Late/Early", field: "lateEarlyHours" },
            { label: "普通残業 (1.25)", en: "Regular OT (1.25)", field: "regularOTHours" },
            { label: "深夜残業 (1.50)", en: "Late Night OT (1.50)", field: "lateNightOTHours" },
            { label: "休日勤務 (1.35)", en: "Holiday Work (1.35)", field: "holidayWorkHours" },
            { label: "休日深夜 (0.25)", en: "Holiday Night (0.25)", field: "holidayNightHours" },
            { label: "~22 (0.25)", en: "Night Shift 1 (0.25)", field: "nightShiftHours" },
            { label: "22~ (0.30)", en: "Night Shift 2 (0.30)", field: "nightShiftHoursExtra" },
            { label: "有休日数", en: "Paid Leave Days", field: "paidLeaveDays" },
            { label: "昼食回数", en: "Lunch Count", field: "lunchCount" },
            { label: "所定労働時間", en: "Sch. Work Hours", field: "scheduledHours", color: "text-primary font-bold" },
            { label: "有休残日数", en: "Rem. Leave Days", field: "remainingPaidLeave" },
          ].map((item) => (
            <div key={item.field} className="space-y-1">
              <Label className={`text-[10px] leading-tight block font-semibold ${item.color || ""}`}>{item.label}<br/><span className="text-slate-500 font-normal">{item.en}</span></Label>
              <Input 
                type="number" 
                className="h-8 text-xs border-slate-300 focus:border-primary" 
                placeholder="0"
                value={(data as any)[item.field] === 0 ? "" : (data as any)[item.field]} 
                onFocus={handleFocus} 
                onChange={e => updateField(item.field as keyof JapanData, e.target.value)} 
              />
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
              { label: "深夜残業手당 (1.50)", en: "Late Night OT (1.50)", field: "lateNightOTAllowance" },
              { label: "~22 (0.25)", en: "Night Alw 1 (0.25)", field: "nightShiftAllowance" },
              { label: "22~ (0.30)", en: "Night Alw 2 (0.30)", field: "nightShiftAllowanceExtra" },
              { label: "休日勤務手당 (1.35)", en: "Holiday Work (1.35)", field: "holidayWorkAllowance" },
              { label: "休日深夜手당 (0.25)", en: "Holiday Night (0.25)", field: "holidayNightAllowance" },
              { label: "家族手当", en: "Family Alw", field: "familyAllowance", readOnly: false },
              { label: "住宅手当", en: "Housing Alw", field: "housingAllowance", readOnly: false },
              { label: "非課税通勤費", en: "Non-tax Commuting", field: "nonTaxableCommuting", readOnly: false },
              { label: "課税通勤費", en: "Taxable Commuting", field: "taxableCommuting", readOnly: false },
              { label: "欠勤時間控除", en: "Absence Ded", field: "absenceDeduction", color: "text-red-600" },
              { label: "遅刻早退控除", en: "Late/Early Ded", field: "lateEarlyDeduction", color: "text-red-600" },
              { label: "前月修正", en: "Prev Month Adj", field: "prevMonthAdj", readOnly: false },
              { label: "休業手당", en: "Leave Alw", field: "leaveAllowance", readOnly: false },
            ].map((item) => (
              <div key={item.field} className="space-y-1">
                <Label className={`text-[10px] leading-tight block font-semibold ${item.color || ""}`}>{item.label}<br/><span className="text-slate-500 font-normal">{item.en}</span></Label>
                <Input 
                  type="number" 
                  readOnly={item.readOnly !== false}
                  placeholder="0"
                  className={`h-8 text-xs ${item.readOnly === false ? 'bg-white border-blue-400' : 'bg-white/50 border-blue-200 cursor-not-allowed'}`} 
                  value={(data as any)[item.field] === 0 ? "" : (data as any)[item.field]} 
                  onFocus={handleFocus}
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
            <span className="text-[9px] text-red-600 font-bold italic uppercase tracking-tight">MANUAL ADJUST AVAILABLE</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <ExplanationLabel 
                label="健康保険料" en="Health Insurance" 
                jpExpl="標準報酬月額に基づいて算出されます。会社と従業員で折半します。"
                mmExpl="Standard Remuneration လစဉ်ပမာဏအပေါ် အခြေခံ၍ တွက်ချက်သည်။ ကုမ္ပဏီနှင့် ဝန်ထမ်း တစ်ဝက်စီ ကျခံရသည်။"
              />
              <Input type="number" className="h-8 text-xs border-red-200" placeholder="0" value={data.healthInsurance === 0 ? "" : data.healthInsurance} onFocus={handleFocus} onChange={e => updateField("healthInsurance", e.target.value)} />
            </div>
            <div className="space-y-1">
              <ExplanationLabel 
                label="介護保険料" en="Nursing Care Ins" 
                jpExpl="40歳から64歳までの被保険者が対象となります。"
                mmExpl="အသက် ၄၀ မှ ၆၄ နှစ်ကြား အာမခံထားသူများအတွက်သာ သက်ဆိုင်ပါသည်။"
              />
              <Input type="number" className="h-8 text-xs border-red-200" placeholder="0" value={data.nursingCareInsurance === 0 ? "" : data.nursingCareInsurance} onFocus={handleFocus} onChange={e => updateField("nursingCareInsurance", e.target.value)} />
            </div>
            <div className="space-y-1">
              <ExplanationLabel 
                label="厚生年金保険" en="Welfare Pension" 
                jpExpl="標準報酬月額に基づいて算出され、将来の年金受給額に反映されます。"
                mmExpl="Standard Remuneration လစဉ်ပမာဏအပေါ် အခြေခံ၍ တွက်ချက်သည်။ အနာဂတ်ပင်စင်အတွက် ဖြစ်သည်။"
              />
              <Input type="number" className="h-8 text-xs border-red-200" placeholder="0" value={data.pension === 0 ? "" : data.pension} onFocus={handleFocus} onChange={e => updateField("pension", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] leading-tight block font-semibold">社保料調整<br/><span className="text-slate-500 font-normal">Soc Ins Adj</span></Label>
              <Input type="number" className="h-8 text-xs border-red-200" placeholder="0" value={data.socInsAdj === 0 ? "" : data.socInsAdj} onFocus={handleFocus} onChange={e => updateField("socInsAdj", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] leading-tight block font-semibold">雇用保険料 (0.0055)<br/><span className="text-slate-500 font-normal">Employment Ins (0.0055)</span></Label>
              <Input type="number" className="h-8 text-xs border-red-200" placeholder="0" value={data.employmentInsurance === 0 ? "" : data.employmentInsurance} onFocus={handleFocus} onChange={e => updateField("employmentInsurance", e.target.value)} />
            </div>
            <div className="space-y-1">
              <ExplanationLabel 
                label="所得税" en="Income Tax" 
                jpExpl="給与所得の源泉徴ု収税額表に基づいて算出されます。課税対象額に応じて変動します。"
                mmExpl="လစာဝင်ငွေအတွက် အခွန်နုတ်ယူခြင်းဆိုင်ရာ ဇယားအပေါ် အခြေခံ၍ တွက်ချက်သည်။ ဝင်ငွေအပေါ် မူတည်၍ ပြောင်းလဲသည်။"
              />
              <Input type="number" className="h-8 text-xs border-primary ring-1 ring-primary/20 font-bold" placeholder="0" value={data.incomeTax === 0 ? "" : data.incomeTax} onFocus={handleFocus} onChange={e => updateField("incomeTax", e.target.value)} />
            </div>
            <div className="space-y-1">
              <ExplanationLabel 
                label="住民税" en="Resident Tax" 
                jpExpl="前年の所得に基づいてお住まいの市区町村が決定した税額です。"
                mmExpl="ယခင်နှစ်ဝင်ငွေအပေါ် မူတည်၍ နေထိုင်ရာ မြို့နယ်စည်ပင်မှ သတ်မှတ်ထားသော အခွန်ဖြစ်သည်။"
              />
              <Input type="number" className="h-8 text-xs border-red-200" placeholder="0" value={data.residentTax === 0 ? "" : data.residentTax} onFocus={handleFocus} onChange={e => updateField("residentTax", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] leading-tight block font-semibold">昼食代<br/><span className="text-slate-500 font-normal">Lunch Fee</span></Label>
              <Input type="number" className="h-8 text-xs border-red-200" placeholder="0" value={data.lunchFee === 0 ? "" : data.lunchFee} onFocus={handleFocus} onChange={e => updateField("lunchFee", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] leading-tight block font-semibold">寮費<br/><span className="text-slate-500 font-normal">Hostel Fee</span></Label>
              <Input type="number" className="h-8 text-xs border-red-200" placeholder="0" value={data.hostelFee === 0 ? "" : data.hostelFee} onFocus={handleFocus} onChange={e => updateField("hostelFee", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] leading-tight block font-semibold">布団代<br/><span className="text-slate-500 font-normal">Bedding Fee</span></Label>
              <Input type="number" className="h-8 text-xs border-red-200" placeholder="0" value={data.beddingFee === 0 ? "" : data.beddingFee} onFocus={handleFocus} onChange={e => updateField("beddingFee", e.target.value)} />
            </div>
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
