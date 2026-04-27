
"use client";

import React, { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sun, Moon, Plus, Trash2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";

export interface ShiftEntry {
  type: "day" | "night";
  startTime: string;
  days: number;
}

export interface JapanData {
  shifts?: ShiftEntry[];
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
  const shifts = data.shifts || [{ type: "day", startTime: "08:00", days: 0 }];

  useEffect(() => {
    let totalDays = 0;
    let totalNS1 = 0;
    let totalNS2 = 0;

    shifts.forEach(shift => {
      const d = Number(shift.days || 0);
      totalDays += d;

      let dailyNS1 = 0;
      let dailyNS2 = 0;

      if (shift.type === "day") {
        if (shift.startTime === "12:00") dailyNS1 = 4;
      } else {
        if (shift.startTime === "19:00") {
          dailyNS1 = 3;
          dailyNS2 = 5;
        } else if (shift.startTime === "21:00") {
          dailyNS1 = 1;
          dailyNS2 = 7;
        }
      }
      totalNS1 += (dailyNS1 * d);
      totalNS2 += (dailyNS2 * d);
    });

    const autoScheduledHours = totalDays * 8;
    const otDenominator = 170.5;
    const hourlyRate = (Number(baseSalary) || 0) / otDenominator;

    const calculatedOT = Math.round(hourlyRate * 1.25 * (Number(data.regularOTHours) || 0));
    const calculatedLateNightOT = Math.round(hourlyRate * 1.50 * (Number(data.lateNightOTHours) || 0));
    const calculatedHolidayWork = Math.round(hourlyRate * 1.35 * (Number(data.holidayWorkHours) || 0));
    const calculatedHolidayNight = Math.round(hourlyRate * 0.25 * (Number(data.holidayNightHours) || 0));
    const calculatedNightAlw1 = Math.round(hourlyRate * 0.25 * totalNS1);
    const calculatedNightAlw2 = Math.round(hourlyRate * 0.30 * totalNS2);

    const calculatedAbsenceDed = Math.round(hourlyRate * (Number(data.absenceHours) || 0));
    const calculatedLateEarlyDed = Math.round(hourlyRate * (Number(data.lateEarlyHours) || 0));

    const defaultHousing = data.housingAllowance === 0 ? 10000 : data.housingAllowance;
    const defaultHostelFee = data.hostelFee === 0 ? 20000 : data.hostelFee;

    const calculatedHealthIns = data.healthInsurance === 0 ? 13312 : data.healthInsurance; 
    const calculatedPension = data.pension === 0 ? 23790 : data.pension;
    
    const totalEarningsCalc = (Number(baseSalary) || 0) + calculatedOT + calculatedLateNightOT + 
                             calculatedNightAlw1 + calculatedNightAlw2 + 
                             calculatedHolidayWork + calculatedHolidayNight + 
                             (Number(data.familyAllowance) || 0) + (Number(defaultHousing) || 0) + 
                             (Number(data.nonTaxableCommuting) || 0) + (Number(data.taxableCommuting) || 0) + 
                             (Number(data.prevMonthAdj) || 0) + (Number(data.leaveAllowance) || 0) -
                             calculatedAbsenceDed - calculatedLateEarlyDed;

    const calculatedEmpIns = Math.round(totalEarningsCalc * 0.0055);
    const totalSocIns = (Number(calculatedHealthIns) || 0) + (Number(calculatedPension) || 0) + calculatedEmpIns + (Number(data.nursingCareInsurance) || 0);
    const grossForTax = totalEarningsCalc - totalSocIns - (Number(data.nonTaxableCommuting) || 0);
    let calculatedIncomeTax = 0;
    if (grossForTax > 0) calculatedIncomeTax = Math.round(grossForTax * 0.0232);

    const remainingLeave = employeeLeave 
      ? Math.max(0, employeeLeave.total - employeeLeave.used - (Number(data.paidLeaveDays) || 0))
      : 0;

    const needsUpdate = 
      data.scheduledDays !== totalDays ||
      data.nightShiftHours !== totalNS1 ||
      data.nightShiftHoursExtra !== totalNS2 ||
      data.otAllowance !== calculatedOT ||
      data.housingAllowance !== defaultHousing ||
      data.healthInsurance !== calculatedHealthIns ||
      data.pension !== calculatedPension ||
      data.incomeTax !== calculatedIncomeTax ||
      data.remainingPaidLeave !== remainingLeave;

    if (needsUpdate) {
      onChange({
        ...data,
        shifts,
        scheduledDays: totalDays,
        scheduledHours: autoScheduledHours,
        nightShiftHours: totalNS1,
        nightShiftHoursExtra: totalNS2,
        otAllowance: calculatedOT,
        lateNightOTAllowance: calculatedLateNightOT,
        nightShiftAllowance: calculatedNightAlw1,
        nightShiftAllowanceExtra: calculatedNightAlw2,
        holidayWorkAllowance: calculatedHolidayWork,
        holidayNightAllowance: calculatedHolidayNight,
        absenceDeduction: calculatedAbsenceDed,
        lateEarlyDeduction: calculatedLateEarlyDed,
        housingAllowance: defaultHousing,
        healthInsurance: calculatedHealthIns,
        pension: calculatedPension,
        employmentInsurance: calculatedEmpIns,
        incomeTax: calculatedIncomeTax,
        hostelFee: defaultHostelFee,
        remainingPaidLeave: remainingLeave
      });
    }
  }, [shifts, baseSalary, data.regularOTHours, data.lateNightOTHours, data.holidayWorkHours, data.holidayNightHours, data.absenceHours, data.lateEarlyHours, data.paidLeaveDays, employeeLeave]);

  const updateShift = (index: number, field: keyof ShiftEntry, value: any) => {
    const newShifts = [...shifts];
    newShifts[index] = { ...newShifts[index], [field]: value };
    onChange({ ...data, shifts: newShifts });
  };

  const addShift = () => {
    const newShifts = [...shifts, { type: "day", startTime: "08:00", days: 0 } as ShiftEntry];
    onChange({ ...data, shifts: newShifts });
  };

  const removeShift = (index: number) => {
    if (shifts.length <= 1) return;
    const newShifts = shifts.filter((_, i) => i !== index);
    onChange({ ...data, shifts: newShifts });
  };

  const updateField = (field: keyof JapanData, value: string) => {
    const numValue = value === "" ? 0 : Number(value);
    onChange({ ...data, [field]: numValue });
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value === "" || e.target.value === "0") {
      e.target.select();
    }
  };

  const totalEarnings = (Number(baseSalary) || 0) + 
                        (Number(data.otAllowance) || 0) + 
                        (Number(data.lateNightOTAllowance) || 0) + 
                        (Number(data.nightShiftAllowance) || 0) + 
                        (Number(data.nightShiftAllowanceExtra) || 0) + 
                        (Number(data.holidayWorkAllowance) || 0) + 
                        (Number(data.holidayNightAllowance) || 0) + 
                        (Number(data.familyAllowance) || 0) + 
                        (Number(data.housingAllowance) || 0) + 
                        (Number(data.nonTaxableCommuting) || 0) + 
                        (Number(data.taxableCommuting) || 0) + 
                        (Number(data.prevMonthAdj) || 0) + 
                        (Number(data.leaveAllowance) || 0) -
                        (Number(data.absenceDeduction) || 0) -
                        (Number(data.lateEarlyDeduction) || 0);

  const totalDeductions = (Number(data.healthInsurance) || 0) + 
                          (Number(data.nursingCareInsurance) || 0) +
                          (Number(data.pension) || 0) + 
                          (Number(data.socInsAdj) || 0) + 
                          (Number(data.employmentInsurance) || 0) + 
                          (Number(data.incomeTax) || 0) + 
                          (Number(data.residentTax) || 0) +
                          (Number(data.lunchFee) || 0) +
                          (Number(data.hostelFee) || 0) +
                          (Number(data.beddingFee) || 0);
  
  const netPay = totalEarnings - totalDeductions + (Number(data.yearEndAdj) || 0) + (Number(data.otherAdj1) || 0) + (Number(data.otherAdj2) || 0) + (Number(data.paidLeaveBuyback) || 0);

  return (
    <div className="space-y-8">
      <div className="bg-card border-2 border-slate-200 p-6 rounded-xl space-y-6 shadow-sm">
        <div className="flex justify-between items-center border-b pb-3">
          <Label className="text-sm font-bold uppercase tracking-wider text-slate-800">勤務シフト (SHIFT SELECTION)</Label>
          <Button variant="outline" size="sm" onClick={addShift} className="gap-2 text-xs h-8">
            <Plus size={14} /> Add Shift Block
          </Button>
        </div>
        <div className="space-y-6">
          {shifts.map((shift, idx) => (
            <div key={idx} className="relative grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
              {shifts.length > 1 && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-white border shadow-sm hover:text-destructive"
                  onClick={() => removeShift(idx)}
                >
                  <Trash2 size={12} />
                </Button>
              )}
              <div className="space-y-3">
                <Label className="text-[10px] font-bold text-slate-500 uppercase">Type</Label>
                <RadioGroup value={shift.type} onValueChange={(v) => updateShift(idx, "type", v as any)} className="flex gap-2">
                  <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded border flex-1 cursor-pointer">
                    <RadioGroupItem value="day" id={`day-${idx}`} />
                    <Label htmlFor={`day-${idx}`} className="flex items-center gap-1 cursor-pointer text-xs font-bold"><Sun size={14} className="text-orange-500" /> Day</Label>
                  </div>
                  <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded border flex-1 cursor-pointer">
                    <RadioGroupItem value="night" id={`night-${idx}`} />
                    <Label htmlFor={`night-${idx}`} className="flex items-center gap-1 cursor-pointer text-xs font-bold"><Moon size={14} className="text-primary" /> Night</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] font-bold text-slate-500 uppercase">Start Time</Label>
                <RadioGroup value={shift.startTime} onValueChange={(v) => updateShift(idx, "startTime", v)} className="flex gap-2">
                  {shift.type === "day" ? (
                    <>
                      <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded border flex-1 cursor-pointer">
                        <RadioGroupItem value="08:00" id={`t08-${idx}`} />
                        <Label htmlFor={`t08-${idx}`} className="text-xs">08:00</Label>
                      </div>
                      <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded border flex-1 cursor-pointer">
                        <RadioGroupItem value="12:00" id={`t12-${idx}`} />
                        <Label htmlFor={`t12-${idx}`} className="text-xs">12:00</Label>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded border flex-1 cursor-pointer">
                        <RadioGroupItem value="19:00" id={`t19-${idx}`} />
                        <Label htmlFor={`t19-${idx}`} className="text-xs">19:00</Label>
                      </div>
                      <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded border flex-1 cursor-pointer">
                        <RadioGroupItem value="21:00" id={`t21-${idx}`} />
                        <Label htmlFor={`t21-${idx}`} className="text-xs">21:00</Label>
                      </div>
                    </>
                  )}
                </RadioGroup>
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] font-bold text-slate-500 uppercase">Days Worked</Label>
                <Input type="number" className="h-9 text-xs bg-white" placeholder="0" value={shift.days === 0 ? "" : shift.days} onFocus={handleFocus} onChange={e => updateShift(idx, "days", e.target.value === "" ? 0 : Number(e.target.value))} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 bg-slate-50 p-4 rounded-lg border-2 border-slate-200">
        <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b pb-2">勤怠 (ATTENDANCE TOTALS)</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "所定就労日", en: "Total Days", field: "scheduledDays", color: "text-primary font-bold", readOnly: true },
            { label: "欠勤日時間", en: "Absence", field: "absenceHours" },
            { label: "遅刻早退", en: "Late/Early", field: "lateEarlyHours" },
            { label: "普通残業 (1.25)", en: "Regular OT", field: "regularOTHours" },
            { label: "深夜残業 (1.50)", en: "Late Night OT", field: "lateNightOTHours" },
            { label: "休日勤務 (1.35)", en: "Holiday Work", field: "holidayWorkHours" },
            { label: "休日深夜 (0.25)", en: "Holiday Night", field: "holidayNightHours" },
            { label: "~22 (0.25)", en: "NS 1 Hours", field: "nightShiftHours", color: "text-primary font-bold", readOnly: true },
            { label: "22~ (0.30)", en: "NS 2 Hours", field: "nightShiftHoursExtra", color: "text-primary font-bold", readOnly: true },
            { label: "有休日数", en: "Paid Leave", field: "paidLeaveDays" },
            { label: "昼食回数", en: "Lunch Count", field: "lunchCount" },
            { label: "有休残日数", en: "Rem. Leave", field: "remainingPaidLeave", readOnly: true },
          ].map((item) => (
            <div key={item.field} className="space-y-1">
              <Label className={`text-[10px] leading-tight block font-semibold ${item.color || ""}`}>{item.label}<br/><span className="text-slate-500 font-normal">{item.en}</span></Label>
              <Input type="number" readOnly={item.readOnly} className={`h-8 text-xs ${item.readOnly ? 'bg-slate-100' : 'bg-white border-slate-300'}`} placeholder="0" value={(data as any)[item.field] === 0 ? "" : (data as any)[item.field]} onFocus={handleFocus} onChange={e => !item.readOnly && updateField(item.field as keyof JapanData, e.target.value)} />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4 bg-blue-50/30 p-4 rounded-lg border border-blue-100">
          <h4 className="text-sm font-bold text-blue-800 uppercase tracking-wider border-b border-blue-200 pb-2 mb-4">支給 (EARNINGS)</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2 bg-white/60 p-2 rounded border border-blue-200">
               <Label className="text-[10px] font-bold">基本給 (Basic Salary)</Label>
               <p className="text-lg font-black text-blue-700">{Number(baseSalary || 0).toLocaleString()} JPY</p>
            </div>
            {[
              { label: "普通残業手当", en: "Regular OT", field: "otAllowance" },
              { label: "深夜残業手当", en: "Late Night OT", field: "lateNightOTAllowance" },
              { label: "夜勤手当 1", en: "Night Alw 1", field: "nightShiftAllowance" },
              { label: "夜勤手당 2", en: "Night Alw 2", field: "nightShiftAllowanceExtra" },
              { label: "休日勤務手当", en: "Holiday Alw", field: "holidayWorkAllowance" },
              { label: "住宅手当", en: "Housing Alw", field: "housingAllowance", readOnly: false },
              { label: "通勤費 (非課税)", en: "Non-tax Comm.", field: "nonTaxableCommuting", readOnly: false },
              { label: "欠勤控除", en: "Absence Ded", field: "absenceDeduction", color: "text-red-600" },
            ].map((item) => (
              <div key={item.field} className="space-y-1">
                <Label className={`text-[10px] leading-tight block font-semibold ${item.color || ""}`}>{item.label}<br/><span className="text-slate-500 font-normal uppercase">{item.en}</span></Label>
                <Input type="number" readOnly={item.readOnly !== false} className="h-8 text-xs bg-white" placeholder="0" value={(data as any)[item.field] === 0 ? "" : (data as any)[item.field]} onFocus={handleFocus} onChange={e => item.readOnly === false && updateField(item.field as keyof JapanData, e.target.value)} />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4 bg-red-50/30 p-4 rounded-lg border border-red-100">
          <h4 className="text-sm font-bold text-red-800 uppercase tracking-wider border-b border-red-200 pb-2 mb-4">控除 (DEDUCTIONS)</h4>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "健康保険料", en: "Health Ins", field: "healthInsurance" },
              { label: "厚生年金", en: "Welfare Pension", field: "pension" },
              { label: "雇用保険", en: "Employment Ins", field: "employmentInsurance" },
              { label: "所得税", en: "Income Tax", field: "incomeTax" },
              { label: "住民税", en: "Resident Tax", field: "residentTax" },
              { label: "寮費", en: "Hostel Fee", field: "hostelFee" },
            ].map((item) => (
              <div key={item.field} className="space-y-1">
                <Label className="text-[10px] leading-tight block font-semibold">{item.label}<br/><span className="text-slate-500 font-normal uppercase">{item.en}</span></Label>
                <Input type="number" className="h-8 text-xs bg-white" placeholder="0" value={(data as any)[item.field] === 0 ? "" : (data as any)[item.field]} onFocus={handleFocus} onChange={e => updateField(item.field as keyof JapanData, e.target.value)} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="p-6 bg-slate-900 text-white rounded-xl shadow-xl grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="text-center sm:border-r border-slate-700">
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Gross Total</p>
          <p className="text-2xl font-black">{Math.round(totalEarnings).toLocaleString()} JPY</p>
        </div>
        <div className="text-center sm:border-r border-slate-700">
          <p className="text-[10px] text-red-400 uppercase font-bold tracking-widest mb-1">Total Deductions</p>
          <p className="text-2xl font-black text-red-400">-{Math.round(totalDeductions).toLocaleString()} JPY</p>
        </div>
        <div className="text-center text-primary-foreground bg-primary/20 rounded-lg p-2">
          <p className="text-[10px] text-primary uppercase font-bold tracking-widest mb-1">Net Pay</p>
          <p className="text-3xl font-black text-primary">{Math.round(netPay).toLocaleString()} JPY</p>
        </div>
      </div>
    </div>
  );
}
