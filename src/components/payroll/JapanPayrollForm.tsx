"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sun, Moon, Plus, Trash2, Info } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, where } from "firebase/firestore";

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
  saturdayHolidayHours: number;
  sundayHolidayHours: number;
  saturdayHolidayMorningHours?: number;
  saturdayHolidayAfternoonHours?: number;
  sundayHolidayMorningHours?: number;
  sundayHolidayAfternoonHours?: number;
  holidayShiftType?: "morning" | "afternoon";
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
  selectedMonth?: string;
}

export function JapanPayrollForm({ data, onChange, baseSalary, employeeLeave, selectedMonth }: Props) {
  const { user } = useUser();
  const firestore = useFirestore();
  const shifts = data.shifts || [{ type: "day", startTime: "08:00", days: 0 }];

  const calendarQuery = useMemoFirebase(() => {
    if (!firestore || !user || !selectedMonth) return null;
    return query(
      collection(firestore, "companyCalendars"),
      where("companyId", "==", user.uid)
    );
  }, [firestore, user, selectedMonth]);

  const { data: companyEvents } = useCollection(calendarQuery);

  const monthHolidays = useMemo(() => {
    if (!selectedMonth || !companyEvents) return 0;
    return (companyEvents || []).filter(e => e.date.startsWith(selectedMonth) && !e.isWorkday).length;
  }, [companyEvents, selectedMonth]);

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

    // Backward compat: support both old (single Sat/Sun field + shiftType) and new (split morning/afternoon)
    const satMorning = Number((data as any).saturdayHolidayMorningHours ?? 0) || 0;
    const satAfternoon = Number((data as any).saturdayHolidayAfternoonHours ?? 0) || 0;
    const hasNewSatFields = (data as any).saturdayHolidayMorningHours !== undefined || (data as any).saturdayHolidayAfternoonHours !== undefined;
    const legacySatHours = Number(data.saturdayHolidayHours) || 0;
    const legacySatMorning = !hasNewSatFields && data.holidayShiftType === "morning" ? legacySatHours : 0;
    const legacySatAfternoon = !hasNewSatFields && data.holidayShiftType === "afternoon" ? legacySatHours : 0;
    const effectiveSatMorning = hasNewSatFields ? satMorning : legacySatMorning;
    const effectiveSatAfternoon = hasNewSatFields ? satAfternoon : legacySatAfternoon;

    const sunMorning = Number((data as any).sundayHolidayMorningHours ?? 0) || 0;
    const sunAfternoon = Number((data as any).sundayHolidayAfternoonHours ?? 0) || 0;
    const hasNewSunFields = (data as any).sundayHolidayMorningHours !== undefined || (data as any).sundayHolidayAfternoonHours !== undefined;
    const legacySunHours = Number(data.sundayHolidayHours) || 0;
    const effectiveSunMorning = hasNewSunFields ? sunMorning : 0;
    const effectiveSunAfternoon = hasNewSunFields ? sunAfternoon : 0;
    const effectiveSunHours = hasNewSunFields ? sunMorning + sunAfternoon : legacySunHours;

    const totalHolidayHours = effectiveSatMorning + effectiveSatAfternoon + effectiveSunHours;

    const calculatedHolidayWork = Math.round(hourlyRate * 1.35 * totalHolidayHours);

    const holidayNS1Hours = Math.round((effectiveSatAfternoon + effectiveSunAfternoon) * 0.5);
    const calculatedHolidayNightAlw = Math.round(hourlyRate * 0.25 * holidayNS1Hours);
    
    const calculatedNightAlw1 = Math.round(hourlyRate * 0.25 * totalNS1);
    const calculatedNightAlw2 = Math.round(hourlyRate * 0.30 * totalNS2);

    const calculatedAbsenceDed = Math.round(hourlyRate * (Number(data.absenceHours) || 0));
    const calculatedLateEarlyDed = Math.round(hourlyRate * (Number(data.lateEarlyHours) || 0));

    const dynamicHealthIns = Math.round(baseSalary * 0.055); 
    const dynamicPension = Math.round(baseSalary * 0.098); 
    const dynamicEmpIns = Math.round((baseSalary + calculatedOT + calculatedLateNightOT + (Number(data.housingAllowance) || 0)) * 0.005); 

    const currentHealthIns = data.healthInsurance === 0 ? dynamicHealthIns : data.healthInsurance;
    const currentPension = data.pension === 0 ? dynamicPension : data.pension;
    const currentEmpIns = data.employmentInsurance === 0 ? dynamicEmpIns : data.employmentInsurance;
    
    const totalEarningsCalc = (Number(baseSalary) || 0) + calculatedOT + calculatedLateNightOT + 
                             calculatedNightAlw1 + calculatedNightAlw2 + 
                             calculatedHolidayWork + calculatedHolidayNightAlw + 
                             (Number(data.familyAllowance) || 0) + (Number(data.housingAllowance) || 0) + 
                             (Number(data.nonTaxableCommuting) || 0) + (Number(data.taxableCommuting) || 0) + 
                             (Number(data.prevMonthAdj) || 0) + (Number(data.leaveAllowance) || 0) -
                             calculatedAbsenceDed - calculatedLateEarlyDed;

    const totalSocIns = currentHealthIns + currentPension + currentEmpIns + (Number(data.nursingCareInsurance) || 0);
    const grossForTax = totalEarningsCalc - totalSocIns - (Number(data.nonTaxableCommuting) || 0);
    
    let calculatedIncomeTax = 0;
    if (grossForTax > 0) {
      if (grossForTax < 88000) calculatedIncomeTax = 0;
      else if (grossForTax < 150000) calculatedIncomeTax = Math.round(grossForTax * 0.02);
      else if (grossForTax < 250000) calculatedIncomeTax = Math.round(grossForTax * 0.035);
      else if (grossForTax < 350000) calculatedIncomeTax = Math.round(grossForTax * 0.05);
      else calculatedIncomeTax = Math.round(grossForTax * 0.08);
    }

    const remainingLeave = employeeLeave 
      ? Math.max(0, employeeLeave.total - employeeLeave.used - (Number(data.paidLeaveDays) || 0))
      : 0;

    const needsUpdate = 
      data.scheduledDays !== totalDays ||
      data.nightShiftHours !== totalNS1 ||
      data.nightShiftHoursExtra !== totalNS2 ||
      data.otAllowance !== calculatedOT ||
      data.healthInsurance !== currentHealthIns ||
      data.pension !== currentPension ||
      data.employmentInsurance !== currentEmpIns ||
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
        holidayNightAllowance: calculatedHolidayNightAlw,
        absenceDeduction: calculatedAbsenceDed,
        lateEarlyDeduction: calculatedLateEarlyDed,
        healthInsurance: currentHealthIns,
        pension: currentPension,
        employmentInsurance: currentEmpIns,
        incomeTax: calculatedIncomeTax,
        remainingPaidLeave: remainingLeave
      });
    }
  }, [shifts, baseSalary, data.regularOTHours, data.lateNightOTHours, data.saturdayHolidayHours, (data as any).saturdayHolidayMorningHours, (data as any).saturdayHolidayAfternoonHours, data.sundayHolidayHours, (data as any).sundayHolidayMorningHours, (data as any).sundayHolidayAfternoonHours, data.holidayShiftType, data.absenceHours, data.lateEarlyHours, data.paidLeaveDays, employeeLeave]);

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
      {monthHolidays > 0 && (
        <div className="bg-orange-500/10 border border-orange-500/20 p-3 rounded-lg flex items-center gap-3 text-orange-700 text-xs font-bold">
          <Info size={14} />
          Note: {monthHolidays} company holidays detected for {selectedMonth} from your calendar.
        </div>
      )}

      <div className="bg-card border p-6 rounded-xl space-y-6 shadow-sm">
        <div className="flex justify-between items-center border-b pb-3">
          <Label className="text-sm font-bold uppercase tracking-wider">勤務シフト (SHIFT SELECTION)</Label>
          <Button variant="outline" size="sm" onClick={addShift} className="gap-2 text-xs h-8">
            <Plus size={14} /> Add Shift Block
          </Button>
        </div>
        <div className="space-y-6">
          {shifts.map((shift, idx) => (
            <div key={idx} className="relative grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-muted/30 rounded-lg border">
              {shifts.length > 1 && (
                <Button 
                  variant="ghost" size="icon" 
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-background border shadow-sm hover:text-destructive"
                  onClick={() => removeShift(idx)}
                >
                  <Trash2 size={12} />
                </Button>
              )}
              <div className="space-y-3">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase">Type</Label>
                <RadioGroup value={shift.type} onValueChange={(v) => updateShift(idx, "type", v as any)} className="flex gap-2">
                  <div className="flex items-center space-x-2 bg-background px-3 py-2 rounded border flex-1 cursor-pointer">
                    <RadioGroupItem value="day" id={`day-${idx}`} />
                    <Label htmlFor={`day-${idx}`} className="flex items-center gap-1 cursor-pointer text-xs font-bold"><Sun size={14} className="text-orange-500" /> Day</Label>
                  </div>
                  <div className="flex items-center space-x-2 bg-background px-3 py-2 rounded border flex-1 cursor-pointer">
                    <RadioGroupItem value="night" id={`night-${idx}`} />
                    <Label htmlFor={`night-${idx}`} className="flex items-center gap-1 cursor-pointer text-xs font-bold"><Moon size={14} className="text-primary" /> Night</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase">Start Time</Label>
                <RadioGroup value={shift.startTime} onValueChange={(v) => updateShift(idx, "startTime", v)} className="flex gap-2">
                  {shift.type === "day" ? (
                    <>
                      <div className="flex items-center space-x-2 bg-background px-3 py-2 rounded border flex-1 cursor-pointer">
                        <RadioGroupItem value="08:00" id={`t08-${idx}`} />
                        <Label htmlFor={`t08-${idx}`} className="text-xs">08:00</Label>
                      </div>
                      <div className="flex items-center space-x-2 bg-background px-3 py-2 rounded border flex-1 cursor-pointer">
                        <RadioGroupItem value="12:00" id={`t12-${idx}`} />
                        <Label htmlFor={`t12-${idx}`} className="text-xs">12:00</Label>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center space-x-2 bg-background px-3 py-2 rounded border flex-1 cursor-pointer">
                        <RadioGroupItem value="19:00" id={`t19-${idx}`} />
                        <Label htmlFor={`t19-${idx}`} className="text-xs">19:00</Label>
                      </div>
                      <div className="flex items-center space-x-2 bg-background px-3 py-2 rounded border flex-1 cursor-pointer">
                        <RadioGroupItem value="21:00" id={`t21-${idx}`} />
                        <Label htmlFor={`t21-${idx}`} className="text-xs">21:00</Label>
                      </div>
                    </>
                  )}
                </RadioGroup>
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase">Days Worked</Label>
                <Input type="number" className="h-9 text-xs" placeholder="0" value={shift.days === 0 ? "" : shift.days} onChange={e => updateShift(idx, "days", e.target.value === "" ? 0 : Number(e.target.value))} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 bg-card p-4 rounded-xl border shadow-sm">
        <h4 className="text-sm font-bold uppercase tracking-wider border-b pb-2">勤怠 (ATTENDANCE TOTALS)</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "所定就労日", en: "Total Days", field: "scheduledDays", color: "text-primary font-bold", readOnly: true },
            { label: "欠勤日時間", en: "Absence", field: "absenceHours" },
            { label: "遅刻早退", en: "Late/Early", field: "lateEarlyHours" },
            { label: "普通残業", en: "Regular OT", field: "regularOTHours" },
            { label: "深夜残業", en: "Late Night OT", field: "lateNightOTHours" },
            { label: "土曜休日(朝)", en: "Sat Morn 8-17", field: "saturdayHolidayMorningHours" },
            { label: "土曜休日(昼)", en: "Sat Aft 12-21", field: "saturdayHolidayAfternoonHours" },
            { label: "日曜休日(朝)", en: "Sun Morn 8-17", field: "sundayHolidayMorningHours" },
            { label: "日曜休日(昼)", en: "Sun Aft 12-21", field: "sundayHolidayAfternoonHours" },
            { label: "有休日数", en: "Paid Leave", field: "paidLeaveDays" },
            { label: "有休残日数", en: "Rem. Leave", field: "remainingPaidLeave", readOnly: true },
          ].map((item) => (
            <div key={item.field} className="space-y-1">
              <Label className={`text-[10px] leading-tight block font-semibold ${item.color || ""}`}>{item.label}<br/><span className="text-muted-foreground font-normal">{item.en}</span></Label>
              <Input type="number" readOnly={item.readOnly} className={`h-8 text-xs ${item.readOnly ? 'bg-muted/50' : ''}`} placeholder="0" value={(data as any)[item.field] == null || (data as any)[item.field] === 0 ? "" : (data as any)[item.field]} onChange={e => !item.readOnly && updateField(item.field as keyof JapanData, e.target.value)} />
            </div>
          ))}
        </div>
        <div className="text-[10px] text-muted-foreground mt-2">※ (朝) 8:00-17:00 = Night Alw မပါ၊ (昼) 12:00-21:00 = 50%ကို Night Alw 0.25 auto တွက် (ဥပမာ 8နာရီ → 4နာရီ Night Alw) — 土/日 အတူတူ</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4 bg-card p-4 rounded-xl border shadow-sm">
          <div className="flex justify-between items-center border-b pb-2 mb-4">
            <h4 className="text-sm font-bold text-primary uppercase tracking-wider">支給 (EARNINGS)</h4>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "普通残業手当", en: "Regular OT (1.25)", field: "otAllowance", readOnly: false },
              { label: "深夜残業手当", en: "Late Night (1.50)", field: "lateNightOTAllowance", readOnly: false },
              { label: "夜勤手当 1", en: "Night Alw 1 (0.25)", field: "nightShiftAllowance", readOnly: false },
              { label: "夜勤手当 2", en: "Night Alw 2 (0.30)", field: "nightShiftAllowanceExtra", readOnly: false },
              { label: "休日勤務手当", en: "Holiday Alw (1.35)", field: "holidayWorkAllowance", readOnly: false },
              { label: "休日深夜手当", en: "Hol. Night Alw (0.25)", field: "holidayNightAllowance", readOnly: false },
              { label: "住宅手当", en: "Housing Alw", field: "housingAllowance", readOnly: false },
              { label: "通勤費", en: "Commuting", field: "nonTaxableCommuting", readOnly: false },
              { label: "欠勤控နှုတ်", en: "Absence Ded", field: "absenceDeduction", color: "text-destructive", readOnly: false },
            ].map((item) => (
              <div key={item.field} className="space-y-1">
                <Label className={`text-[10px] leading-tight block font-semibold ${item.color || ""}`}>{item.label}<br/><span className="text-muted-foreground font-normal uppercase">{item.en}</span></Label>
                <Input type="number" className="h-8 text-xs" placeholder="0" value={(data as any)[item.field] == null || (data as any)[item.field] === 0 ? "" : (data as any)[item.field]} onChange={e => updateField(item.field as keyof JapanData, e.target.value)} />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4 bg-card p-4 rounded-xl border shadow-sm">
          <div className="flex justify-between items-center border-b pb-2 mb-4">
            <h4 className="text-sm font-bold text-destructive uppercase tracking-wider">控除 (DEDUCTIONS)</h4>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "健康保険料", en: "Health Ins (~5.5%)", field: "healthInsurance" },
              { label: "介護保険料", en: "Nursing Care", field: "nursingCareInsurance" },
              { label: "厚生年金保険", en: "Welfare Pension (~9.8%)", field: "pension" },
              { label: "雇用保険料", en: "Employment Ins (0.5%)", field: "employmentInsurance" },
              { label: "所得税", en: "Income Tax", field: "incomeTax" },
              { label: "住民税", en: "Resident Tax", field: "residentTax" },
              { label: "寮費", en: "Hostel Fee", field: "hostelFee" },
            ].map((item) => (
              <div key={item.field} className="space-y-1">
                <Label className="text-[10px] leading-tight block font-semibold">{item.label}<br/><span className="text-muted-foreground font-normal uppercase">{item.en}</span></Label>
                <Input type="number" className="h-8 text-xs" placeholder="0" value={(data as any)[item.field] == null || (data as any)[item.field] === 0 ? "" : (data as any)[item.field]} onChange={e => updateField(item.field as keyof JapanData, e.target.value)} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="p-6 bg-card border rounded-xl shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="text-center sm:border-r">
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Gross Total</p>
          <p className="text-2xl font-black">{Math.round(totalEarnings).toLocaleString()} JPY</p>
        </div>
        <div className="text-center sm:border-r">
          <p className="text-[10px] text-destructive uppercase font-bold tracking-widest mb-1">Total Deductions</p>
          <p className="text-2xl font-black text-destructive">-{Math.round(totalDeductions).toLocaleString()} JPY</p>
        </div>
        <div className="text-center bg-primary/5 rounded-lg p-2 border border-primary/10">
          <p className="text-[10px] text-primary uppercase font-bold tracking-widest mb-1">Net Pay</p>
          <p className="text-3xl font-black text-primary">{Math.round(netPay).toLocaleString()} JPY</p>
        </div>
      </div>
    </div>
  );
}