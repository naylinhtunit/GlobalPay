"use client";
import { useLanguage } from "@/context/LanguageContext";

import { createLocalId } from "@/lib/local-id";

import React, { useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Info, RotateCcw } from "lucide-react";
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
  earningOverrides?: Partial<Record<"otAllowance" | "lateNightOTAllowance" | "nightShiftAllowance" | "nightShiftAllowanceExtra" | "holidayWorkAllowance" | "holidayNightAllowance", number>>;
}

interface Props {
  data: JapanData;
  onChange: (data: JapanData) => void;
  baseSalary: number;
  employeeLeave?: { total: number; used: number };
  selectedMonth?: string;
}

export function JapanPayrollForm({ data, onChange, baseSalary, employeeLeave, selectedMonth }: Props) {
  const { t } = useLanguage();
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

    const autoOT = Math.round(hourlyRate * (policy.regularOTMultiplier ?? 1.25) * (Number(data.regularOTHours) || 0));
    const autoLateNightOT = Math.round(hourlyRate * (policy.lateNightOTMultiplier ?? 1.5) * (Number(data.lateNightOTHours) || 0));

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

    const holidayNS1Hours = Math.round((effectiveSatAfternoon + effectiveSunAfternoon) * 0.5);
    const legacyHolidayDayHours = Math.max(0, totalHolidayHours - holidayNS1Hours);
    const holidayEntries = data.holidayEntries || [];
    const flexibleHoliday = calculateHolidayPay(holidayEntries, policy, hourlyRate);
    const flexibleHolidayDay = calculateHolidayPay(holidayEntries.map(entry => ({ ...entry, hours: Math.max(0, entry.hours - entry.nightHours), nightHours: 0 })), policy, hourlyRate);
    const flexibleHolidayNightBase = calculateHolidayPay(holidayEntries.map(entry => ({ ...entry, hours: entry.nightHours, nightHours: 0 })), policy, hourlyRate);
    // Keep day and night holiday pay on separate payslip lines. Night work includes
    // its holiday base rate plus the configured night premium.
    const hasDatedHolidayEntries = holidayEntries.length > 0;
    const autoHolidayWork = hasDatedHolidayEntries
      ? Math.round(hourlyRate * 1.35 * legacyHolidayDayHours + flexibleHolidayDay.work)
      : Math.round(hourlyRate * 1.35 * totalHolidayHours);
    const autoHolidayNight = hasDatedHolidayEntries
      ? Math.round(hourlyRate * (1.35 + policy.nightPremium) * holidayNS1Hours + flexibleHolidayNightBase.work + flexibleHoliday.night)
      : Math.round(hourlyRate * policy.nightPremium * holidayNS1Hours);
    
    const autoNightAlw1 = legacyShiftSummary ? data.nightShiftAllowance || 0 : Math.round(hourlyRate * (policy.shiftAllowance1Rate ?? 0.25) * totalNS1);
    const autoNightAlw2 = legacyShiftSummary ? data.nightShiftAllowanceExtra || 0 : Math.round(hourlyRate * (policy.shiftAllowance2Rate ?? 0.30) * totalNS2);

    const calculatedOT = data.earningOverrides?.otAllowance ?? autoOT;
    const calculatedLateNightOT = data.earningOverrides?.lateNightOTAllowance ?? autoLateNightOT;
    const calculatedNightAlw1 = data.earningOverrides?.nightShiftAllowance ?? autoNightAlw1;
    const calculatedNightAlw2 = data.earningOverrides?.nightShiftAllowanceExtra ?? autoNightAlw2;
    const calculatedHolidayWork = data.earningOverrides?.holidayWorkAllowance ?? autoHolidayWork;
    const calculatedHolidayNightAlw = data.earningOverrides?.holidayNightAllowance ?? autoHolidayNight;

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

  const updateMonthlyWorkdays = (value: number) => {
    const otherShiftDays = shifts.slice(1).reduce((sum, shift) => sum + Number(shift.days || 0), 0);
    const firstShift = { ...shifts[0], days: Math.max(0, value - otherShiftDays) };
    onChange({ ...data, shifts: [firstShift, ...shifts.slice(1)] });
  };

  const updateField = (field: keyof JapanData, value: string) => {
    const numValue = value === "" ? 0 : Number(value);
    const earningFields = ["otAllowance", "lateNightOTAllowance", "nightShiftAllowance", "nightShiftAllowanceExtra", "holidayWorkAllowance", "holidayNightAllowance"] as const;
    const next = { ...data, [field]: numValue,
      ...(field === "incomeTax" ? { incomeTaxOverride: numValue } : {}),
      ...(earningFields.includes(field as typeof earningFields[number]) ? { earningOverrides: { ...data.earningOverrides, [field]: numValue } } : {}),
    };
    onChange(field.startsWith("saturdayHoliday") || field.startsWith("sundayHoliday") ? { ...next, ...normalizeLegacyHolidayFields(next) } : next);
  };

  const clearEarningOverride = (field: NonNullable<JapanData["earningOverrides"]> extends Partial<Record<infer K, number>> ? K : never) => {
    const earningOverrides = { ...data.earningOverrides };
    delete earningOverrides[field];
    onChange({ ...data, earningOverrides });
  };

  const updatePolicy = (field: keyof PayrollPolicy, value: number) => {
    onChange({ ...data, workPolicy: { ...policy, [field]: value } });
  };
  const updateHolidayRate = (id: string, multiplier: number) => {
    onChange({ ...data, workPolicy: { ...policy, holidayRates: policy.holidayRates.map(rate => rate.id === id ? { ...rate, multiplier } : rate) } });
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
  const maxWorkdays = selectedMonth ? new Date(Number(selectedMonth.slice(0, 4)), Number(selectedMonth.slice(5)), 0).getDate() : 31;

  return (
    <div className="space-y-8">
      <details open className="rounded-xl border bg-card p-4 shadow-sm">
        <summary className="cursor-pointer font-bold">{t("Rates for this payroll")}</summary>
        <p className="mt-2 text-xs text-muted-foreground">{t("Adjust these values for this payslip. Calculated amounts update immediately; saved payslips keep this rate snapshot.")}</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-3">
          <label className="space-y-1 text-xs">{t("Hourly divisor (monthly hours)")}<Input aria-label={t("Hourly divisor (monthly hours)")} type="number" min="0.01" step="0.01" value={policy.hourlyDivisor} onChange={e => updatePolicy("hourlyDivisor", Number(e.target.value))} /></label>
          <label className="space-y-1 text-xs">{t("Regular OT multiplier")}<Input aria-label={t("Regular OT multiplier")} type="number" min="1" step="0.01" value={policy.regularOTMultiplier ?? 1.25} onChange={e => updatePolicy("regularOTMultiplier", Number(e.target.value))} /></label>
          <label className="space-y-1 text-xs">{t("Late-night OT multiplier")}<Input aria-label={t("Late-night OT multiplier")} type="number" min="1" step="0.01" value={policy.lateNightOTMultiplier ?? 1.5} onChange={e => updatePolicy("lateNightOTMultiplier", Number(e.target.value))} /></label>
          <label className="space-y-1 text-xs">{t("Shift allowance 1 rate")}<Input aria-label={t("Shift allowance 1 rate")} type="number" min="0" step="0.01" value={policy.shiftAllowance1Rate ?? 0.25} onChange={e => updatePolicy("shiftAllowance1Rate", Number(e.target.value))} /></label>
          <label className="space-y-1 text-xs">{t("Shift allowance 2 rate")}<Input aria-label={t("Shift allowance 2 rate")} type="number" min="0" step="0.01" value={policy.shiftAllowance2Rate ?? 0.30} onChange={e => updatePolicy("shiftAllowance2Rate", Number(e.target.value))} /></label>
          <label className="space-y-1 text-xs">{t("Holiday night premium (+)")}<Input aria-label={t("Holiday night premium (+)")} type="number" min="0.25" step="0.01" value={policy.nightPremium} onChange={e => updatePolicy("nightPremium", Number(e.target.value))} /></label>
        </div>
        <div className="mt-3 space-y-3 border-t pt-3">
          <label className="block space-y-1 text-xs">{t("Default holiday rate")}
            <select aria-label={t("Default holiday rate")} className="h-10 w-full rounded-md border bg-background px-2 text-sm" value={policy.defaultHolidayRateId || ""} onChange={e => onChange({ ...data, workPolicy: { ...policy, defaultHolidayRateId: e.target.value } })}>
              <option value="">{t("Choose a rate…")}</option>
              {policy.holidayRates.map(rate => <option key={rate.id} value={rate.id}>{t(rate.name)} ×{rate.multiplier}</option>)}
            </select>
          </label>
          <details className="text-xs"><summary className="cursor-pointer text-muted-foreground">{t("Edit holiday rate multipliers")}</summary>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
              {policy.holidayRates.map(rate => <label key={rate.id} className="space-y-1">{t(rate.name)}<Input aria-label={`${t(rate.name)} ${t("Multiplier (total)")}`} type="number" min={rate.statutory ? "1.35" : rate.includedInBase ? "0" : "1"} step="0.01" value={rate.multiplier} onChange={e => updateHolidayRate(rate.id, Number(e.target.value))} /></label>)}
            </div>
          </details>
        </div>
      </details>

      {monthHolidays > 0 && (
        <div className="bg-orange-500/10 border border-orange-500/20 p-3 rounded-lg flex items-center gap-3 text-orange-700 text-xs font-bold">
          <Info size={14} /> {t("{count} company holidays detected for {month} from your calendar.", { count: monthHolidays, month: selectedMonth || "" })} </div>
      )}

      <div className="bg-card border p-6 rounded-xl space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-b pb-3">
          <Label className="text-sm font-bold uppercase tracking-wider">{t("Shift selection")}</Label>
          <Button variant="outline" size="sm" onClick={addShift} className="gap-2 text-xs h-8">
            <Plus size={14} /> {t("Add Shift Block")} </Button>
        </div>
        <div className="max-w-xs space-y-1">
          <Label className="text-xs font-semibold">{t("Work days this month")}</Label>
          <Input aria-label={t("Work days this month")} type="number" min={shifts.slice(1).reduce((sum, shift) => sum + Number(shift.days || 0), 0)} max={maxWorkdays} step="1" value={data.scheduledDays || ""} onChange={e => updateMonthlyWorkdays(e.target.value === "" ? 0 : Number(e.target.value))} />
          <p className="text-xs text-muted-foreground">{t("Enter the monthly total here. Use shift details below only when you have more than one shift.")}</p>
        </div>
        <div className="space-y-6">
          {!data.shifts && data.scheduledDays > 0 && <p className="text-xs text-orange-700">{t("Old records without shift times keep their original days, hours and allowances until you edit a shift or days.")}</p>}
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
                <Label className="text-xs font-bold">{t("Choose a template; edit times below")}</Label>
                <select aria-label={t("Shift")} className="h-10 w-full rounded-md border bg-background px-2 text-sm" value={getPreset(shift)?.id || ""} onChange={e => {
                  const preset = policy.shifts.find(s => s.id === e.target.value);
                  if (!preset) return;
                  const next = [...shifts];
                  next[idx] = { ...shift, startTime: preset.start, presetId: preset.id, preset, customized: false, type: preset.start >= "18:00" ? "night" : "day" };
                  onChange({ ...data, shifts: next });
                }}>
                  {policy.shifts.map(s => <option key={s.id} value={s.id}>{t(s.name)} {s.start}–{s.end}</option>)}
                  {!policy.shifts.some(s => s.id === getPreset(shift)?.id) && <option value={getPreset(shift)?.id}>{t(getPreset(shift)?.name || "")} {getPreset(shift)?.start}–{getPreset(shift)?.end} {t("(customized)")}</option>}
                </select>
              </div>
              {idx > 0 && <div className="space-y-3">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase">{t("Days Worked (this shift)")}</Label>
                <Input aria-label={t("Days Worked (this shift)")} type="number" min="0" step="1" className="h-9 text-xs" placeholder="0" value={shift.days === 0 ? "" : shift.days} onChange={e => updateShift(idx, "days", e.target.value === "" ? 0 : Number(e.target.value))} />
              </div>}
              <div className="md:col-span-3 grid grid-cols-2 gap-3">
                <label className="text-xs space-y-1">{t("Start time")}<Input aria-label={t("Start time")} type="time" value={getPreset(shift)?.start || ""} onChange={e => updateShiftTime(idx, "start", e.target.value)} /></label>
                <label className="text-xs space-y-1">{t("End time")}<Input aria-label={t("End time")} type="time" value={getPreset(shift)?.end || ""} onChange={e => updateShiftTime(idx, "end", e.target.value)} /></label>
              </div>
              <details className="md:col-span-3 text-xs" open={shift.customized && !!validatePolicy({ ...policy, shifts: [getPreset(shift)] })}>
                <summary className="cursor-pointer text-muted-foreground">{t("Break / company allowance details")}</summary>
                <div className="grid grid-cols-2 gap-3 pt-3">
                  <label className="space-y-1">{t("Break start")}<Input aria-label={t("Break start")} type="time" value={getPreset(shift)?.breakStart || ""} onChange={e => updateShiftTime(idx, "breakStart", e.target.value)} /></label>
                  <label className="space-y-1">{t("Break (minutes)")}<Input aria-label={t("Break (minutes)")} type="number" min="0" step="1" value={getPreset(shift)?.breakMinutes || 0} onChange={e => updateShiftTime(idx, "breakMinutes", Number(e.target.value))} /></label>
                  <label className="space-y-1">{t("Company allowance 1 hours (×0.25)")}<Input type="number" min="0" step="0.01" value={getPreset(shift)?.allowance1Hours || 0} onChange={e => updateShiftTime(idx, "allowance1Hours", Number(e.target.value))} /></label>
                  <label className="space-y-1">{t("Company allowance 2 hours (×0.30)")}<Input type="number" min="0" step="0.01" value={getPreset(shift)?.allowance2Hours || 0} onChange={e => updateShiftTime(idx, "allowance2Hours", Number(e.target.value))} /></label>
                </div>
              </details>
              {shift.customized && <p className="md:col-span-3 text-xs text-muted-foreground">{t("Customized for this payroll only. Check break and company allowance hours.")} {t(validatePolicy({ ...policy, shifts: [getPreset(shift)] }) || "")}</p>}
            </div>
          ))}
        </div>
      </div>

      <FlexibleWorkEditor policy={data.workPolicy} entries={data.holidayEntries || []} month={selectedMonth} holidays={(companyEvents || []).filter(e => !e.isWorkday).map(e => ({ date: e.date, title: e.title }))} onChange={(workPolicy, holidayEntries) => onChange({ ...data, workPolicy, holidayEntries })} />

      <div className="space-y-4 bg-card p-4 rounded-xl border shadow-sm">
        <h4 className="text-sm font-bold uppercase tracking-wider border-b pb-2">{t("Attendance")}</h4>
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
              <Label className={`text-xs leading-relaxed block font-semibold ${item.color || ""}`}>{t(item.en)}</Label>
              <Input type="number" readOnly={item.readOnly} className={`h-8 text-xs ${item.readOnly ? 'bg-muted/50' : ''}`} placeholder="0" value={(data as any)[item.field] == null || (data as any)[item.field] === 0 ? "" : (data as any)[item.field]} onChange={e => !item.readOnly && updateField(item.field as keyof JapanData, e.target.value)} />
            </div>
          ))}
        </div>
        <div className="space-y-3 border-t pt-3" data-testid="holiday-attendance-breakdown">
          <p className="text-sm font-semibold">{t("Holiday hours")}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: "နေ့ပိုင်း နာရီ", en: "Holiday Day Hours", value: holidayAttendance.day },
              { label: "ညပိုင်း နာရီ (22:00–05:00)", en: "Holiday Night Hours", value: holidayAttendance.night },
              { label: "စုစုပေါင်း နာရီ", en: "Holiday Total Hours", value: holidayAttendance.total },
            ].map(item => <label key={item.en} className="space-y-1 text-xs">
              <span className="block font-semibold">{t(item.en)}</span>
              <Input aria-label={t(item.en)} type="number" readOnly className="h-8 text-xs bg-muted/50" value={item.value} />
            </label>)}
          </div>
          <p className="text-xs text-muted-foreground">{t("Day {day} + night {night} = total {total} hours (after breaks)", holidayAttendance)}. {t("After breaks. Daytime is outside 22:00–05:00. Night hours receive holiday pay plus the night premium.")}</p>
        </div>
        {hasLegacyHolidayHours(data) && <details className="border-t pt-3">
          <summary className="text-xs cursor-pointer">{t("Legacy holiday fields (old payslips only)")}</summary>
          <p className="text-xs text-muted-foreground my-2">{t("Original Sat/Sun totals retain the old 1.35 and afternoon 50% calculation. Do not duplicate dated entries. Leave these at 0 for new records.")}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{(["saturdayHolidayMorningHours", "saturdayHolidayAfternoonHours", "sundayHolidayMorningHours", "sundayHolidayAfternoonHours"] as const).map((field, i) => <label className="text-xs space-y-1" key={field}>{t(["Sat morning", "Sat afternoon", "Sun morning", "Sun afternoon"][i])}<Input type="number" min="0" step="0.01" value={data[field] || 0} onChange={e => updateField(field, e.target.value)} /></label>)}</div>
        </details>}
        {((data.saturdayHolidayMorningHours || 0) + (data.saturdayHolidayAfternoonHours || 0) + (data.sundayHolidayMorningHours || 0) + (data.sundayHolidayAfternoonHours || 0) > 0) && <p className="text-xs text-orange-700">{t("Legacy hours are included. Avoid double counting when adding dated entries.")}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4 bg-card p-4 rounded-xl border shadow-sm">
          <div className="flex justify-between items-center border-b pb-2 mb-4">
            <h4 className="text-sm font-bold text-primary uppercase tracking-wider">{t("Earnings")}</h4>
          </div>
          <p className="text-xs text-muted-foreground">{t("Calculated pay lines update from hours and rates. Edit a line amount to match your company payslip; use the reset button to restore the calculation.")}</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "普通残業手当", en: "Regular OT allowance", field: "otAllowance", overrideable: true },
              { label: "深夜残業手当", en: "Late-night OT allowance", field: "lateNightOTAllowance", overrideable: true },
              { label: "夜勤手当 1", en: "Company shift allowance 1", field: "nightShiftAllowance", overrideable: true },
              { label: "夜勤手当 2", en: "Company shift allowance 2", field: "nightShiftAllowanceExtra", overrideable: true },
              { label: "休日勤務手当（日中）", en: "Holiday daytime pay", field: "holidayWorkAllowance", overrideable: true },
              { label: "休日深夜割増", en: "Holiday night pay", field: "holidayNightAllowance", overrideable: true },
              { label: "住宅手当", en: "Housing Alw", field: "housingAllowance", readOnly: false },
              { label: "通勤費", en: "Commuting", field: "nonTaxableCommuting", readOnly: false },
              { label: "欠勤控နှုတ်", en: "Absence Ded", field: "absenceDeduction", color: "text-destructive", readOnly: true },
            ].map((item) => (
              <div key={item.field} className="space-y-1">
                <Label className={`text-xs leading-relaxed block font-semibold ${item.color || ""}`}>{t(item.en)}</Label>
                <div className="flex items-center gap-1">
                  <Input type="number" readOnly={item.readOnly} className={`h-8 text-xs ${item.readOnly ? 'bg-muted/50' : ''}`} placeholder="0" value={(data as any)[item.field] == null || (data as any)[item.field] === 0 ? "" : (data as any)[item.field]} onChange={e => !item.readOnly && updateField(item.field as keyof JapanData, e.target.value)} />
                  {item.overrideable && (data.earningOverrides as any)?.[item.field] !== undefined && <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0" aria-label={t("Restore calculated amount")} title={t("Restore calculated amount")} onClick={() => clearEarningOverride(item.field as any)}><RotateCcw size={14} /></Button>}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4 bg-card p-4 rounded-xl border shadow-sm">
          <div className="flex justify-between items-center border-b pb-2 mb-4">
            <h4 className="text-sm font-bold text-destructive uppercase tracking-wider">{t("Deductions")}</h4>
          </div>
          <p className="text-xs text-muted-foreground">{t("Tax and insurance amounts are estimates. Confirm with payroll staff. A manually edited income tax amount is preserved.")}</p>
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
                <Label className="text-xs leading-relaxed block font-semibold">{t(item.en)}</Label>
                <Input type="number" className="h-8 text-xs" placeholder="0" value={(data as any)[item.field] == null || (data as any)[item.field] === 0 ? "" : (data as any)[item.field]} onChange={e => updateField(item.field as keyof JapanData, e.target.value)} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="p-6 bg-card border rounded-xl shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="text-center sm:border-r">
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">{t("Gross Total")}</p>
          <p className="text-2xl font-black">{Math.round(totalEarnings).toLocaleString()} JPY</p>
        </div>
        <div className="text-center sm:border-r">
          <p className="text-[10px] text-destructive uppercase font-bold tracking-widest mb-1">{t("Total Deductions")}</p>
          <p className="text-2xl font-black text-destructive">-{Math.round(totalDeductions).toLocaleString()} JPY</p>
        </div>
        <div className="text-center bg-primary/5 rounded-lg p-2 border border-primary/10">
          <p className="text-[10px] text-primary uppercase font-bold tracking-widest mb-1">{t("Net Pay")}</p>
          <p className="text-3xl font-black text-primary">{Math.round(netPay).toLocaleString()} JPY</p>
        </div>
      </div>
    </div>
  );
}
