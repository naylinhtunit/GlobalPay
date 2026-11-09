"use client";
import { useLanguage } from "@/context/LanguageContext";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createLocalId } from "@/lib/local-id";
import { localizeShiftLabel } from "@/lib/i18n";
import { HolidayRateBreakdown } from "./HolidayRateBreakdown";
import { DEFAULT_PAYROLL_POLICY, groupHolidayEntries, splitHolidayHours, splitShift, suggestHolidayRate, validateHolidayEntries, validatePolicy, type HolidayWorkEntry, type PayrollPolicy, type ShiftPreset } from "@/lib/japan-payroll";

const selectClass = "h-10 w-full min-w-0 rounded-md border bg-background px-2 text-sm";
const newId = createLocalId;

export function FlexibleWorkEditor({ policy, entries, month, onChange, holidays }: {
  policy?: PayrollPolicy;
  entries: HolidayWorkEntry[];
  month?: string;
  onChange: (policy: PayrollPolicy, entries: HolidayWorkEntry[]) => void;
  holidays: { date: string; title?: string }[];
}) {
  const { t, language } = useLanguage();
  const [date, setDate] = useState(`${month || new Date().toISOString().slice(0, 7)}-01`);
  const [shiftId, setShiftId] = useState("day-08");
  const [customShift, setCustomShift] = useState<ShiftPreset | null>(null);
  const [error, setError] = useState("");
  const [rateOverride, setRateOverride] = useState("");
  const [quickDayHours, setQuickDayHours] = useState(0);
  const [quickNightHours, setQuickNightHours] = useState(0);
  const current = policy || DEFAULT_PAYROLL_POLICY;
  const selectedShift = customShift || current.shifts.find(s => s.id === shiftId) || current.shifts[0];
  const suggestedRateId = rateOverride || suggestHolidayRate(current, selectedShift, entries);
  const suggestedRate = current.holidayRates.find(rate => rate.id === suggestedRateId);
  const editShift = (field: keyof ShiftPreset, value: string | number) => {
    if (selectedShift) setCustomShift({ ...selectedShift, [field]: value });
  };
  let preview: ReturnType<typeof splitShift> = [];
  let shiftProblem = "";
  try {
    preview = splitShift(date, selectedShift);
    if (!preview.length) shiftProblem = "နားချိန်နုတ်ပြီး အလုပ်ချိန် ကျန်ရပါမည်။";
  } catch (e) { shiftProblem = (e as Error).message; }

  useEffect(() => { if (month) setDate(`${month}-01`); }, [month]);

  const updateEntry = (id: string, patch: Partial<HolidayWorkEntry>) => onChange(current, entries.map(entry => entry.id === id ? { ...entry, ...patch } : entry));
  const addWork = () => {
    const problem = validatePolicy(current);
    if (problem) { setError(problem); return; }
    if (shiftProblem) { setError(shiftProblem); return; }
    if (!month || !date.startsWith(`${month}-`)) { setError("Choose a start date in the payroll month."); return; }
    try {
      const groupId = newId();
      const rows = splitShift(date, selectedShift).map(row => ({ ...row, id: newId(), groupId, rateId: suggestedRateId }));
      onChange(current, [...entries, ...rows]);
      setError("");
    } catch (e) { setError((e as Error).message); }
  };
  const addQuickWork = () => {
    const rateId = suggestedRateId;
    if (!month || !date.startsWith(`${month}-`)) { setError("Choose a start date in the payroll month."); return; }
    if (!rateId) { setError("Choose a rate for every holiday date, including the next day of night shifts."); return; }
    if (quickDayHours < 0 || quickDayHours > 24 || quickNightHours < 0 || quickNightHours > 7 || quickDayHours + quickNightHours > 24 || quickDayHours + quickNightHours === 0) {
      setError("Enter daytime hours (0–24) and night hours (0–7). Total hours must not exceed 24."); return;
    }
    const groupId = newId();
    const rows: HolidayWorkEntry[] = [];
    if (quickDayHours > 0) rows.push({ id: newId(), groupId, date, shiftName: t("Holiday daytime OT"), hours: quickDayHours, nightHours: 0, rateId });
    if (quickNightHours > 0) rows.push({ id: newId(), groupId, date, shiftName: t("Holiday nighttime OT"), hours: quickNightHours, nightHours: quickNightHours, rateId });
    const nextEntries = [...entries, ...rows];
    const problem = validateHolidayEntries(nextEntries, current, month);
    if (problem) { setError(problem); return; }
    onChange(current, nextEntries);
    setQuickDayHours(0);
    setQuickNightHours(0);
    setError("");
  };
  const problem = validateHolidayEntries(entries, current, month);
  const policyProblem = validatePolicy(current);
  const workGroups = groupHolidayEntries(entries);
  const previewHours = splitHolidayHours(preview.reduce((sum, row) => sum + row.hours, 0), preview.reduce((sum, row) => sum + row.nightHours, 0));

  return <div className="space-y-4 rounded-xl border bg-card p-4">
    <h4 className="font-bold">{t("Holiday work")}</h4>
    <p className="text-sm text-muted-foreground">{t("Select any work date and shift. Rates are prefilled and can be adjusted to company policy.")}</p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
      <label className="space-y-1 text-xs">{t("Work date")}<Input aria-label={t("Work date")} type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
      <label className="space-y-1 text-xs">{t("Shift")}<select aria-label={t("Shift")} className={selectClass} value={customShift ? "__custom__" : selectedShift?.id || ""} onChange={e => { if (e.target.value === "__custom__") return; setShiftId(e.target.value); setCustomShift(null); setRateOverride(""); setError(""); }}>{current.shifts.map(s => <option key={s.id} value={s.id}>{t(s.name)} {s.start}–{s.end}</option>)}{customShift && <option value="__custom__">{t(customShift.name)} {customShift.start}–{customShift.end} {t("(customized)")}</option>}</select></label>
    </div>
    <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
      <div><p className="font-semibold text-sm">{t("Quick holiday overtime")}</p><p className="text-xs text-muted-foreground">{t("For a company-calendar holiday, enter the day and night overtime hours directly.")}</p></div>
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1 text-xs">{t("Holiday daytime OT")}<Input aria-label={t("Holiday daytime OT")} type="number" min="0" max="24" step="0.25" value={quickDayHours || ""} onChange={e => setQuickDayHours(Number(e.target.value) || 0)} /></label>
        <label className="space-y-1 text-xs">{t("Holiday nighttime OT")}<Input aria-label={t("Holiday nighttime OT")} type="number" min="0" max="7" step="0.25" value={quickNightHours || ""} onChange={e => setQuickNightHours(Number(e.target.value) || 0)} /></label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="text-xs space-y-1">{t("Holiday base rate (excluding night premium)")}<select aria-label={t("Holiday base rate (excluding night premium)")} className={selectClass} value={suggestedRateId} onChange={e => setRateOverride(e.target.value)}><option value="">{t("Choose a rate…")}</option>{current.holidayRates.map(rate => <option key={rate.id} value={rate.id}>{t(rate.name)} ×{rate.multiplier}</option>)}</select></label>
        <Button type="button" variant="secondary" disabled={quickDayHours + quickNightHours <= 0} onClick={addQuickWork}>{t("Add holiday overtime")}</Button>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <label className="space-y-1 text-xs">{t("Start time")}<Input aria-label={t("Start time")} type="time" value={selectedShift?.start || ""} onChange={e => editShift("start", e.target.value)} /></label>
      <label className="space-y-1 text-xs">{t("End time")}<Input aria-label={t("End time")} type="time" value={selectedShift?.end || ""} onChange={e => editShift("end", e.target.value)} /></label>
    </div>
    <details className="text-xs" open={!!customShift && !!shiftProblem}><summary className="cursor-pointer text-muted-foreground">{t("Edit break (one shift)")}</summary><div className="grid grid-cols-2 gap-3 pt-3">
      <label className="space-y-1">{t("Break start")}<Input aria-label={t("Break start")} type="time" value={selectedShift?.breakStart || ""} onChange={e => editShift("breakStart", e.target.value)} /></label>
      <label className="space-y-1">{t("Break (minutes)")}<Input aria-label={t("Break (minutes)")} type="number" min="0" step="1" value={selectedShift?.breakMinutes ?? 0} onChange={e => editShift("breakMinutes", Number(e.target.value))} /></label>
    </div><p className="pt-2 text-muted-foreground">{t("Example: break start 12:00, 60 minutes means a 12:00–13:00 break for one shift, not a monthly total.")}</p></details>
    <div className="space-y-2 rounded-lg border bg-muted/20 p-3" data-testid="holiday-rate-preview">
      <p className="text-xs font-semibold">{rateOverride ? t("Manually adjusted rate") : t("Automatic rates for work hours")}</p>
      {!shiftProblem && suggestedRate ? <HolidayRateBreakdown hours={previewHours.total} nightHours={previewHours.night} multiplier={suggestedRate.multiplier} nightPremium={current.nightPremium} /> : <p className="text-xs text-muted-foreground">{shiftProblem ? t("Check shift and break times.") : t("Set your company rate once.")}</p>}
      <p className="text-xs text-muted-foreground">{t("Hours and applied rates update automatically when work or break times change. No night hours means no night rate.")}</p>
    </div>
    <details className="text-xs"><summary className="cursor-pointer text-muted-foreground">{t("Edit rate")}</summary><label className="block space-y-1 pt-3">{t("Holiday base rate (excluding night premium)")} <select aria-label={t("Holiday base rate (excluding night premium)")} className={selectClass} value={suggestedRateId} onChange={e => setRateOverride(e.target.value)}>
        <option value="">{t("Choose a rate…")}</option>{current.holidayRates.map(rate => <option key={rate.id} value={rate.id}>{t(rate.name)} ×{rate.multiplier}</option>)}
      </select>
      <span className="block text-muted-foreground">{t("Uses the rates above for this payroll. Confirm example rates with your company. Per-date rates can be changed after adding.")}</span>
    </label>{rateOverride && <Button type="button" variant="ghost" size="sm" onClick={() => setRateOverride("")}>{t("Use automatic rate")}</Button>}</details>
    <p className="text-xs text-muted-foreground">{t("Rates can be adjusted for this payroll. Confirm them with your company.")}</p>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground" aria-live="polite">{shiftProblem ? t(shiftProblem) : t("Day {day} + night {night} = total {total} hours (after breaks)", previewHours)}</p>
      <Button type="button" variant="outline" disabled={!!shiftProblem} onClick={addWork}>{t("+ Add holiday work")}</Button>
    </div>
    {holidays.filter(h => h.date.startsWith(month || "")).length > 0 && <details className="text-sm"><summary className="cursor-pointer text-muted-foreground">{t("Choose from calendar holidays")}</summary><div className="flex flex-wrap gap-2 pt-2">{holidays.filter(h => h.date.startsWith(month || "")).map(h => <Button type="button" size="sm" variant="secondary" key={h.date} onClick={() => setDate(h.date)}>{h.date} {["Company holiday", "会社休日", "ကုမ္ပဏီပိတ်ရက်"].includes(h.title || "") ? t("Company holiday") : h.title}</Button>)}</div></details>}
    {entries.length === 0 && <p className="text-sm text-muted-foreground">{t("Select a date and shift to add holiday work.")}</p>}
    {workGroups.map(group => {
      const first = group[0];
      const paid = Math.round(group.reduce((sum, entry) => sum + entry.hours, 0) * 100) / 100;
      const night = Math.round(group.reduce((sum, entry) => sum + entry.nightHours, 0) * 100) / 100;
      const hours = splitHolidayHours(paid, night);
      const groupRates = group.map(entry => current.holidayRates.find(rate => rate.id === entry.rateId));
      const sameRate = groupRates[0] && groupRates.every(rate => rate?.id === groupRates[0]?.id) ? groupRates[0] : null;
      const ids = new Set(group.map(entry => entry.id));
      return <div key={first.groupId || first.id} data-testid="holiday-shift-card" className="space-y-3 rounded-lg border bg-muted/20 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0"><p className="font-semibold text-sm break-words">{localizeShiftLabel(first.shiftName.replace(/ \(\+1 day\)$/, ""), language)}</p><p className="text-xs text-muted-foreground mt-1">{first.date}{group.length > 1 ? ' → ' + group[group.length - 1].date : ''}</p></div>
          <Button type="button" size="sm" variant="ghost" aria-label={t("Remove holiday shift {date}", { date: first.date })} onClick={() => onChange(current, entries.filter(entry => !ids.has(entry.id)))}>{t("Remove")}</Button>
        </div>
        <p className="text-sm font-medium">{t("Day {day} + night {night} = total {total} hours (after breaks)", hours)}</p>
        {sameRate ? <HolidayRateBreakdown hours={paid} nightHours={night} multiplier={sameRate.multiplier} nightPremium={current.nightPremium} /> : group.map((entry, index) => groupRates[index] && <div key={entry.id}><p className="text-xs text-muted-foreground">{entry.date}</p><HolidayRateBreakdown hours={entry.hours} nightHours={entry.nightHours} multiplier={groupRates[index]!.multiplier} nightPremium={current.nightPremium} /></div>)}
        {group.length > 1 && <p className="text-xs text-muted-foreground">{t("One shift crosses midnight. Rates can be changed separately for each date if necessary.")}</p>}
        <details className="text-xs" open={group.some(entry => !entry.rateId)}><summary className="cursor-pointer text-muted-foreground">{t("Edit rates by date")}</summary><div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">{group.map(entry => <label key={entry.id} className="space-y-1 text-xs block">
          <span>{entry.date} · {entry.hours} {t("hours")}</span>
          <select aria-label={t("Holiday rate")} className={selectClass} value={entry.rateId} onChange={e => updateEntry(entry.id, { rateId: e.target.value })}><option value="">{t("Choose a rate…")}</option>{current.holidayRates.map(rate => <option key={rate.id} value={rate.id}>{t(rate.name)} ×{rate.multiplier}</option>)}</select>
        </label>)}</div></details>
        <details className="border-t pt-2 text-xs"><summary className="cursor-pointer text-muted-foreground">{t("Hour details / edit")}</summary><div className="space-y-3 pt-3">{group.map(entry => <div key={entry.id} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="space-y-1">{t("Work date")}<Input type="date" aria-label={t("Work date")} value={entry.date} onChange={e => updateEntry(entry.id, { date: e.target.value })} /></label>
          <label className="space-y-1">{t("Paid hours (excluding breaks)")}<Input type="number" aria-label={t("Paid hours (excluding breaks)")} min="0" max="24" step="0.01" value={entry.hours} onChange={e => updateEntry(entry.id, { hours: Number(e.target.value) })} /></label>
          <label className="space-y-1">{t("Night hours (22–05)")}<Input type="number" aria-label={t("Night hours (22–05)")} min="0" max="7" step="0.01" value={entry.nightHours} onChange={e => updateEntry(entry.id, { nightHours: Number(e.target.value) })} /></label>
        </div>)}</div></details>
      </div>;
    })}
    {(error || problem || policyProblem) && <p role="alert" className="text-sm text-destructive">{t(error || problem || policyProblem || "Check your payroll settings.")}</p>}
  </div>;
}
