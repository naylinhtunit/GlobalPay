"use client";

import { createLocalId } from "@/lib/local-id";

import React, { useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { FlexibleWorkEditor } from "./FlexibleWorkEditor";
import { DEFAULT_PAYROLL_POLICY, calculateHolidayPay, getHolidayAttendance, hasLegacyHolidayHours, normalizeLegacyHolidayFields, splitShift, validatePolicy, type HolidayWorkEntry, type PayrollPolicy, type ShiftPreset } from "@/lib/japan-payroll";

export interface ShiftEntry {
  type: "day" | "night";
  startTime: string;
  days: number;
  presetId?: string;
  preset?: ShiftPreset;
  customized?: boolean;
}

export interface JapanData {
  workPolicy?: PayrollPolicy;
  holidayEntries?: HolidayWorkEntry[];
  holidayNightHours?: number;
  holidayTotalHours?: number;
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
  incomeTaxOverride?: number;
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
  const shifts = useMemo<ShiftEntry[]>(() => data.shifts || [{ type: "day", startTime: "08:00", days: data.scheduledDays || 0 }], [data.shifts, data.scheduledDays]);
  const policy = data.workPolicy || DEFAULT_PAYROLL_POLICY;
  const holidayAttendance = getHolidayAttendance(data);
  const getPreset = (shift: ShiftEntry) => (shift.customized ? shift.preset : undefined) || policy.shifts.find(s => shift.presetId ? s.id === shift.presetId : s.start === shift.startTime) || shift.preset || DEFAULT_PAYROLL_POLICY.shifts.find(s => s.start === shift.startTime) || policy.shifts[0];

  const calendarQuery = useMemoFirebase(() => {
    if (!firestore || !user || !selectedMonth) return null;
    return query(
      collection(firestore, "companyCalendars"),
      where("companyId", "==", user.uid),
      where("country", "==", "Japan")
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
    let autoScheduledHours = 0;

    shifts.forEach(shift => {
      const d = Number(shift.days || 0);
      totalDays += d;

      const preset = getPreset(shift);
      if (!preset) return;
      totalNS1 += preset.allowance1Hours * d;
      totalNS2 += preset.allowance2Hours * d;
      try { autoScheduledHours += splitShift("2026-01-01", preset).reduce((sum, row) => sum + row.hours, 0) * d; } catch { /* Validation blocks saving an invalid template. */ }
    });

    const legacyShiftSummary = !data.shifts && data.scheduledDays > 0;
    if (legacyShiftSummary) {
      // Old records without shift times retain their saved attendance/allowances.
      // Only an explicit shift selection/day edit opts into template recalculation.
      totalNS1 = data.nightShiftHours || 0;
      totalNS2 = data.nightShiftHoursExtra || 0;
      autoScheduledHours = data.scheduledHours ?? totalDays * 8;
    }

    const otDenominator = policy.hourlyDivisor > 0 ? policy.hourlyDivisor : 170.5;
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

    const flexibleHoliday = calculateHolidayPay(data.holidayEntries || [], policy, hourlyRate);
    const calculatedHolidayWork = Math.round(hourlyRate * 1.35 * totalHolidayHours) + flexibleHoliday.work;

    const holidayNS1Hours = Math.round((effectiveSatAfternoon + effectiveSunAfternoon) * 0.5);
    const calculatedHolidayNightAlw = Math.round(hourlyRate * 0.25 * holidayNS1Hours) + flexibleHoliday.night;
    
    const calculatedNightAlw1 = legacyShiftSummary ? data.nightShiftAllowance || 0 : Math.round(hourlyRate * 0.25 * totalNS1);
    const calculatedNightAlw2 = legacyShiftSummary ? data.nightShiftAllowanceExtra || 0 : Math.round(hourlyRate * 0.30 * totalNS2);

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

    if (data.incomeTaxOverride !== undefined) calculatedIncomeTax = data.incomeTaxOverride;

    const remainingLeave = employeeLeave
      ? Math.max(0, employeeLeave.total - employeeLeave.used - (Number(data.paidLeaveDays) || 0))
      : 0;

    const needsUpdate =
      data.scheduledHours !== autoScheduledHours ||
      data.lateNightOTAllowance !== calculatedLateNightOT ||
      data.nightShiftAllowance !== calculatedNightAlw1 ||
      data.nightShiftAllowanceExtra !== calculatedNightAlw2 ||
      data.holidayWorkAllowance !== calculatedHolidayWork ||
      data.holidayNightAllowance !== calculatedHolidayNightAlw ||
      data.holidayNightHours !== holidayNS1Hours + flexibleHoliday.nightHours ||
      data.holidayTotalHours !== totalHolidayHours + flexibleHoliday.hours ||
      data.absenceDeduction !== calculatedAbsenceDed ||
      data.lateEarlyDeduction !== calculatedLateEarlyDed ||
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
        ...(data.shifts ? { shifts } : {}),
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
        holidayNightHours: holidayNS1Hours + flexibleHoliday.nightHours,
        holidayTotalHours: totalHolidayHours + flexibleHoliday.hours,
        absenceDeduction: calculatedAbsenceDed,
        lateEarlyDeduction: calculatedLateEarlyDed,
        healthInsurance: currentHealthIns,
        pension: currentPension,
        employmentInsurance: currentEmpIns,
        incomeTax: calculatedIncomeTax,
        remainingPaidLeave: remainingLeave
      });
    }
  }, [data, shifts, baseSalary, employeeLeave, policy, onChange]);

  const updateShift = (index: number, field: keyof ShiftEntry, value: any) => {
    const newShifts = [...shifts];
    newShifts[index] = { ...newShifts[index], [field]: value };
    onChange({ ...data, shifts: newShifts });
  };

  const updateShiftTime = (index: number, field: keyof ShiftPreset, value: string | number) => {
    const shift = shifts[index];
    const original = getPreset(shift);
    if (!original) return;
    const preset = { ...original, id: shift.customized ? original.id : createLocalId(), [field]: value };
    const next = [...shifts];
    next[index] = { ...shift, startTime: preset.start, presetId: preset.id, preset, customized: true };
    onChange({ ...data, shifts: next });
  };

  const addShift = () => {
    const preset = policy.shifts[0];
    const newShifts = [...shifts, { type: "day", startTime: preset?.start || "08:00", days: 0, ...(preset ? { presetId: preset.id, preset } : {}) } as ShiftEntry];
    onChange({ ...data, shifts: newShifts });
  };

  const removeShift = (index: number) => {
    if (shifts.length <= 1) return;
    const newShifts = shifts.filter((_, i) => i !== index);
    onChange({ ...data, shifts: newShifts });
  };

  const updateField = (field: keyof JapanData, value: string) => {
    const numValue = value === "" ? 0 : Number(value);
    const next = { ...data, [field]: numValue, ...(field === "incomeTax" ? { incomeTaxOverride: numValue } : {}) };
    onChange(field.startsWith("saturdayHoliday") || field.startsWith("sundayHoliday") ? { ...next, ...normalizeLegacyHolidayFields(next) } : next);
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
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-b pb-3">
          <Label className="text-sm font-bold uppercase tracking-wider">勤務シフト (SHIFT SELECTION)</Label>
          <Button variant="outline" size="sm" onClick={addShift} className="gap-2 text-xs h-8">
            <Plus size={14} /> Add Shift Block
          </Button>
        </div>
        <div className="space-y-6">
          {!data.shifts && data.scheduledDays > 0 && <p className="text-xs text-orange-700">အဟောင်းမှတ်တမ်းတွင် shift အချိန်မပါသောကြောင့် မူလရက်/နာရီနှင့် allowance များကို ထိန်းထားသည်။ Shift သို့မဟုတ် days ကို ရွေးပြင်မှ template အတိုင်း ပြန်တွက်မည်။</p>}
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
              <div className="space-y-3 md:col-span-2">
                <Label className="text-xs font-bold">မူလအဆိုင်းရွေးရန် (အချိန်ကို အောက်တွင် ပြင်နိုင်သည်)</Label>
                <select aria-label="Regular work shift" className="h-10 w-full rounded-md border bg-background px-2 text-sm" value={getPreset(shift)?.id || ""} onChange={e => {
                  const preset = policy.shifts.find(s => s.id === e.target.value);
                  if (!preset) return;
                  const next = [...shifts];
                  next[idx] = { ...shift, startTime: preset.start, presetId: preset.id, preset, customized: false, type: preset.start >= "18:00" ? "night" : "day" };
                  onChange({ ...data, shifts: next });
                }}>
                  {policy.shifts.map(s => <option key={s.id} value={s.id}>{s.name} {s.start}–{s.end}</option>)}
                  {!policy.shifts.some(s => s.id === getPreset(shift)?.id) && <option value={getPreset(shift)?.id}>{getPreset(shift)?.name} {getPreset(shift)?.start}–{getPreset(shift)?.end} (ပြင်ထားသည်)</option>}
                </select>
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase">Days Worked</Label>
                <Input aria-label="Regular days worked" type="number" min="0" step="1" className="h-9 text-xs" placeholder="0" value={shift.days === 0 ? "" : shift.days} onChange={e => updateShift(idx, "days", e.target.value === "" ? 0 : Number(e.target.value))} />
              </div>
              <div className="md:col-span-3 grid grid-cols-2 gap-3">
                <label className="text-xs space-y-1">စချိန်<Input aria-label="Regular shift start" type="time" value={getPreset(shift)?.start || ""} onChange={e => updateShiftTime(idx, "start", e.target.value)} /></label>
                <label className="text-xs space-y-1">ဆုံးချိန်<Input aria-label="Regular shift end" type="time" value={getPreset(shift)?.end || ""} onChange={e => updateShiftTime(idx, "end", e.target.value)} /></label>
              </div>
              <details className="md:col-span-3 text-xs" open={shift.customized && !!validatePolicy({ ...policy, shifts: [getPreset(shift)] })}>
                <summary className="cursor-pointer text-muted-foreground">နားချိန် / Company allowance အသေးစိတ်</summary>
                <div className="grid grid-cols-2 gap-3 pt-3">
                  <label className="space-y-1">နားချိန် စ<Input aria-label="Regular break start" type="time" value={getPreset(shift)?.breakStart || ""} onChange={e => updateShiftTime(idx, "breakStart", e.target.value)} /></label>
                  <label className="space-y-1">နားချိန် (မိနစ်)<Input aria-label="Regular break minutes" type="number" min="0" step="1" value={getPreset(shift)?.breakMinutes || 0} onChange={e => updateShiftTime(idx, "breakMinutes", Number(e.target.value))} /></label>
                  <label className="space-y-1">Company allowance 1 နာရီ (×0.25)<Input type="number" min="0" step="0.01" value={getPreset(shift)?.allowance1Hours || 0} onChange={e => updateShiftTime(idx, "allowance1Hours", Number(e.target.value))} /></label>
                  <label className="space-y-1">Company allowance 2 နာရီ (×0.30)<Input type="number" min="0" step="0.01" value={getPreset(shift)?.allowance2Hours || 0} onChange={e => updateShiftTime(idx, "allowance2Hours", Number(e.target.value))} /></label>
                </div>
              </details>
              {shift.customized && <p className="md:col-span-3 text-xs text-muted-foreground">ဒီ payroll အတွက်သာ ပြင်ထားသည်။ နားချိန်နှင့် company allowance နာရီများကို စစ်ဆေးပါ။ {validatePolicy({ ...policy, shifts: [getPreset(shift)] })}</p>}
            </div>
          ))}
        </div>
      </div>

      <FlexibleWorkEditor policy={data.workPolicy} entries={data.holidayEntries || []} month={selectedMonth} holidays={(companyEvents || []).filter(e => !e.isWorkday).map(e => ({ date: e.date, title: e.title }))} onChange={(workPolicy, holidayEntries) => onChange({ ...data, workPolicy, holidayEntries })} />

      <div className="space-y-4 bg-card p-4 rounded-xl border shadow-sm">
        <h4 className="text-sm font-bold uppercase tracking-wider border-b pb-2">勤怠 (ATTENDANCE TOTALS)</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "所定就労日", en: "Total Days", field: "scheduledDays", color: "text-primary font-bold", readOnly: true },
            { label: "欠勤日時間", en: "Absence", field: "absenceHours" },
            { label: "遅刻早退", en: "Late/Early", field: "lateEarlyHours" },
            { label: "普通残業", en: "Regular OT", field: "regularOTHours" },
            { label: "深夜残業", en: "Late Night OT", field: "lateNightOTHours" },
            { label: "有休日数", en: "Paid Leave", field: "paidLeaveDays" },
            { label: "有休残日数", en: "Rem. Leave", field: "remainingPaidLeave", readOnly: true },
          ].map((item) => (
            <div key={item.field} className="space-y-1">
              <Label className={`text-[10px] leading-tight block font-semibold ${item.color || ""}`}>{item.label}<br/><span className="text-muted-foreground font-normal">{item.en}</span></Label>
              <Input type="number" readOnly={item.readOnly} className={`h-8 text-xs ${item.readOnly ? 'bg-muted/50' : ''}`} placeholder="0" value={(data as any)[item.field] == null || (data as any)[item.field] === 0 ? "" : (data as any)[item.field]} onChange={e => !item.readOnly && updateField(item.field as keyof JapanData, e.target.value)} />
            </div>
          ))}
        </div>
        <div className="space-y-3 border-t pt-3" data-testid="holiday-attendance-breakdown">
          <p className="text-sm font-semibold">ပိတ်ရက် အလုပ်ချိန် / Holiday hours</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: "နေ့ပိုင်း နာရီ", en: "Holiday Day Hours", value: holidayAttendance.day },
              { label: "ညပိုင်း နာရီ (22:00–05:00)", en: "Holiday Night Hours", value: holidayAttendance.night },
              { label: "စုစုပေါင်း နာရီ", en: "Holiday Total Hours", value: holidayAttendance.total },
            ].map(item => <label key={item.en} className="space-y-1 text-xs">
              <span className="block font-semibold">{item.label}</span>
              <span className="block text-muted-foreground">{item.en}</span>
              <Input aria-label={item.en} type="number" readOnly className="h-8 text-xs bg-muted/50" value={item.value} />
            </label>)}
          </div>
          <p className="text-xs text-muted-foreground">နေ့ပိုင်း {holidayAttendance.day} + ညပိုင်း {holidayAttendance.night} = စုစုပေါင်း {holidayAttendance.total} နာရီ။ နားချိန်နုတ်ပြီး ဖြစ်သည်။ နေ့ပိုင်း = 22:00–05:00 ပြင်ပ အလုပ်ချိန်။ ညပိုင်းနာရီအတွက် holiday အလုပ်ခနှင့် ညပိုင်းအပိုကြေး နှစ်မျိုးလုံး တွက်သည်။</p>
        </div>
        {hasLegacyHolidayHours(data) && <details className="border-t pt-3">
          <summary className="text-xs cursor-pointer">Legacy holiday fields / အဟောင်း payslip အတွက်သာ</summary>
          <p className="text-xs text-muted-foreground my-2">မူလ Sat/Sun စုစုပေါင်းများကို 1.35 နှင့် afternoon 50% allowance အတိုင်း ထိန်းထားသည်။ အပေါ်က ရက်စွဲပါ row တွေနဲ့ ထပ်မထည့်ပါနှင့်။ အသစ်ရေးမည်ဆိုလျှင် ဒီ fields ကို 0 ထားပါ။</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{(["saturdayHolidayMorningHours", "saturdayHolidayAfternoonHours", "sundayHolidayMorningHours", "sundayHolidayAfternoonHours"] as const).map((field, i) => <label className="text-xs space-y-1" key={field}>{["Sat morning", "Sat afternoon", "Sun morning", "Sun afternoon"][i]}<Input type="number" min="0" step="0.01" value={data[field] || 0} onChange={e => updateField(field, e.target.value)} /></label>)}</div>
        </details>}
        {((data.saturdayHolidayMorningHours || 0) + (data.saturdayHolidayAfternoonHours || 0) + (data.sundayHolidayMorningHours || 0) + (data.sundayHolidayAfternoonHours || 0) > 0) && <p className="text-xs text-orange-700">Legacy hours ပါဝင်နေသည်။ ရက်စွဲပါ entry တွေ ထည့်မည်ဆိုလျှင် အလုပ်ချိန် မထပ်အောင် စစ်ဆေးပါ။</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4 bg-card p-4 rounded-xl border shadow-sm">
          <div className="flex justify-between items-center border-b pb-2 mb-4">
            <h4 className="text-sm font-bold text-primary uppercase tracking-wider">支給 (EARNINGS)</h4>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "普通残業手当", en: "Regular OT (1.25)", field: "otAllowance", readOnly: true },
              { label: "深夜残業手当", en: "Late Night (1.50)", field: "lateNightOTAllowance", readOnly: true },
              { label: "夜勤手当 1", en: "Company Shift Alw 1 (0.25)", field: "nightShiftAllowance", readOnly: true },
              { label: "夜勤手当 2", en: "Company Shift Alw 2 (0.30)", field: "nightShiftAllowanceExtra", readOnly: true },
              { label: "休日勤務手当（日中＋深夜）", en: "Holiday Pay (Day + Night)", field: "holidayWorkAllowance", readOnly: true },
              { label: "休日深夜割増", en: "Holiday Night Premium Only", field: "holidayNightAllowance", readOnly: true },
              { label: "住宅手当", en: "Housing Alw", field: "housingAllowance", readOnly: false },
              { label: "通勤費", en: "Commuting", field: "nonTaxableCommuting", readOnly: false },
              { label: "欠勤控နှုတ်", en: "Absence Ded", field: "absenceDeduction", color: "text-destructive", readOnly: true },
            ].map((item) => (
              <div key={item.field} className="space-y-1">
                <Label className={`text-[10px] leading-tight block font-semibold ${item.color || ""}`}>{item.label}<br/><span className="text-muted-foreground font-normal uppercase">{item.en}</span></Label>
                <Input type="number" readOnly={item.readOnly} className={`h-8 text-xs ${item.readOnly ? 'bg-muted/50' : ''}`} placeholder="0" value={(data as any)[item.field] == null || (data as any)[item.field] === 0 ? "" : (data as any)[item.field]} onChange={e => !item.readOnly && updateField(item.field as keyof JapanData, e.target.value)} />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4 bg-card p-4 rounded-xl border shadow-sm">
          <div className="flex justify-between items-center border-b pb-2 mb-4">
            <h4 className="text-sm font-bold text-destructive uppercase tracking-wider">控除 (DEDUCTIONS)</h4>
          </div>
          <p className="text-xs text-muted-foreground">အခွန်/အာမခံများသည် ခန့်မှန်းတန်ဖိုးများဖြစ်သည်။ Payroll တာဝန်ရှိသူမှ စစ်ဆေးပြင်ဆင်ပါ။ Income tax ကို ကိုယ်တိုင်ပြင်ထားလျှင် ထိုတန်ဖိုးကို ဆက်သုံးမည်။</p>
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
