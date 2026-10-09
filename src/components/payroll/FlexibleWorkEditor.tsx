"use client";

import { useEffect, useState } from "react";
import { useCompanyPayrollSettings } from "@/hooks/useCompanyPayrollSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEFAULT_PAYROLL_POLICY, groupHolidayEntries, splitShift, validateHolidayEntries, validatePolicy, type HolidayWorkEntry, type PayrollPolicy, type ShiftPreset } from "@/lib/japan-payroll";

const selectClass = "h-10 w-full min-w-0 rounded-md border bg-background px-2 text-sm";
const newId = () => crypto.randomUUID();

export function FlexibleWorkEditor({ policy, entries, month, onChange, holidays }: {
  policy?: PayrollPolicy;
  entries: HolidayWorkEntry[];
  month?: string;
  onChange: (policy: PayrollPolicy, entries: HolidayWorkEntry[]) => void;
  holidays: { date: string; title?: string }[];
}) {
  const [date, setDate] = useState(`${month || new Date().toISOString().slice(0, 7)}-01`);
  const [shiftId, setShiftId] = useState("day-08");
  const [customShift, setCustomShift] = useState<ShiftPreset | null>(null);
  const [error, setError] = useState("");
  const { policy: savedPolicy, isLoading, isLoaded, error: loadError } = useCompanyPayrollSettings();
  const current = policy || DEFAULT_PAYROLL_POLICY;
  const selectedShift = customShift || current.shifts.find(s => s.id === shiftId) || current.shifts[0];
  const editShift = (field: keyof ShiftPreset, value: string | number) => {
    if (selectedShift) setCustomShift({ ...selectedShift, [field]: value });
  };
  let preview: ReturnType<typeof splitShift> = [];
  let shiftProblem = "";
  try {
    preview = splitShift(date, selectedShift);
    if (!preview.length) shiftProblem = "နားချိန်နုတ်ပြီး အလုပ်ချိန် ကျန်ရပါမည်။";
  } catch (e) { shiftProblem = (e as Error).message; }

  useEffect(() => {
    if (policy || isLoading || !isLoaded || loadError) return;
    onChange(structuredClone(savedPolicy), entries);
  }, [savedPolicy, isLoading, isLoaded, loadError, policy, onChange, entries]);
  useEffect(() => { if (month) setDate(`${month}-01`); }, [month]);

  const updateEntry = (id: string, patch: Partial<HolidayWorkEntry>) => onChange(current, entries.map(entry => entry.id === id ? { ...entry, ...patch } : entry));
  const addWork = () => {
    const problem = validatePolicy(current);
    if (problem) { setError(problem); return; }
    if (shiftProblem) { setError(shiftProblem); return; }
    if (!month || !date.startsWith(`${month}-`)) { setError("Choose a start date in the payroll month."); return; }
    try {
      const groupId = newId();
      const rows = splitShift(date, selectedShift).map(row => ({ ...row, id: newId(), groupId, rateId: "" }));
      onChange(current, [...entries, ...rows]);
      setError("");
    } catch (e) { setError((e as Error).message); }
  };
  const problem = validateHolidayEntries(entries, current, month);
  const policyProblem = validatePolicy(current);
  const workGroups = groupHolidayEntries(entries);

  return <div className="space-y-4 rounded-xl border bg-card p-4">
    <h4 className="font-bold">休日勤務 / ပိတ်ရက် အလုပ်ဆင်းခြင်း</h4>
    <p className="text-sm text-muted-foreground">ရက်စွဲနဲ့ အဆိုင်းကို ရွေးပြီး ထည့်ပါ။ မည်သည့်ပိတ်ရက်မဆို ထည့်နိုင်သည်။ Rate ကို ကုမ္ပဏီစည်းမျဉ်းအတိုင်း ရွေးပါ။</p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
      <label className="space-y-1 text-xs">Work date / ရက်စွဲ<Input aria-label="Holiday work date" type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
      <label className="space-y-1 text-xs">Shift / အဆိုင်း<select aria-label="Holiday shift" className={selectClass} value={customShift ? "__custom__" : selectedShift?.id || ""} onChange={e => { if (e.target.value === "__custom__") return; setShiftId(e.target.value); setCustomShift(null); setError(""); }}>{current.shifts.map(s => <option key={s.id} value={s.id}>{s.name} {s.start}–{s.end}</option>)}{customShift && <option value="__custom__">{customShift.name} {customShift.start}–{customShift.end} (ပြင်ထားသည်)</option>}</select></label>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <label className="space-y-1 text-xs">စချိန်<Input aria-label="Holiday shift start" type="time" value={selectedShift?.start || ""} onChange={e => editShift("start", e.target.value)} /></label>
      <label className="space-y-1 text-xs">ဆုံးချိန်<Input aria-label="Holiday shift end" type="time" value={selectedShift?.end || ""} onChange={e => editShift("end", e.target.value)} /></label>
    </div>
    <details className="text-xs" open={!!customShift && !!shiftProblem}><summary className="cursor-pointer text-muted-foreground">နားချိန် ပြင်ဆင်ရန် (တစ်ဆိုင်းအတွက်)</summary><div className="grid grid-cols-2 gap-3 pt-3">
      <label className="space-y-1">နားချိန် စ<Input aria-label="Holiday break start" type="time" value={selectedShift?.breakStart || ""} onChange={e => editShift("breakStart", e.target.value)} /></label>
      <label className="space-y-1">နားချိန် (မိနစ်)<Input aria-label="Holiday break minutes" type="number" min="0" step="1" value={selectedShift?.breakMinutes ?? 0} onChange={e => editShift("breakMinutes", Number(e.target.value))} /></label>
    </div><p className="pt-2 text-muted-foreground">ဥပမာ နားချိန် စ 12:00၊ မိနစ် 60 = 12:00–13:00 နားသည်။ လအတွက် စုစုပေါင်းမဟုတ်ပါ။</p></details>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground" aria-live="polite">{shiftProblem || `နားချိန်နုတ်ပြီး ${Math.round(preview.reduce((sum, row) => sum + row.hours, 0) * 100) / 100} နာရီ · ညပိုင်း ${Math.round(preview.reduce((sum, row) => sum + row.nightHours, 0) * 100) / 100} နာရီ`}</p>
      <Button type="button" variant="outline" disabled={!!shiftProblem || (!policy && (isLoading || !isLoaded || !!loadError))} onClick={addWork}>+ Add holiday work / ထည့်မည်</Button>
    </div>
    {holidays.filter(h => h.date.startsWith(month || "")).length > 0 && <details className="text-sm"><summary className="cursor-pointer text-muted-foreground">Calendar ပိတ်ရက်များမှ ရွေးရန်</summary><div className="flex flex-wrap gap-2 pt-2">{holidays.filter(h => h.date.startsWith(month || "")).map(h => <Button type="button" size="sm" variant="secondary" key={h.date} onClick={() => setDate(h.date)}>{h.date} {h.title}</Button>)}</div></details>}
    {entries.length === 0 && <p className="text-sm text-muted-foreground">ပိတ်ရက် အလုပ်ဆင်းထားပါက ရက်စွဲနဲ့ shift ကို ရွေးပြီး ထည့်ပါ။</p>}
    {workGroups.map(group => {
      const first = group[0];
      const paid = Math.round(group.reduce((sum, entry) => sum + entry.hours, 0) * 100) / 100;
      const night = Math.round(group.reduce((sum, entry) => sum + entry.nightHours, 0) * 100) / 100;
      const ids = new Set(group.map(entry => entry.id));
      return <div key={first.groupId || first.id} data-testid="holiday-shift-card" className="space-y-3 rounded-lg border bg-muted/20 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0"><p className="font-semibold text-sm break-words">{first.shiftName.replace(/ \(\+1 day\)$/, "")}</p><p className="text-xs text-muted-foreground mt-1">{first.date}{group.length > 1 ? ' → ' + group[group.length - 1].date : ''}</p></div>
          <Button type="button" size="sm" variant="ghost" aria-label={'Remove holiday shift ' + first.date} onClick={() => onChange(current, entries.filter(entry => !ids.has(entry.id)))}>ဖယ်မည်</Button>
        </div>
        <p className="text-sm font-medium">အလုပ်ချိန် {paid} နာရီ <span className="text-muted-foreground font-normal">· ညပိုင်း {night} နာရီ</span></p>
        {group.length > 1 && <p className="text-xs text-muted-foreground">အဆိုင်းတစ်ခုတည်းပါ။ သန်းခေါင်ကျော်သောကြောင့် ရက်နှစ်ရက်အတွက် rate ရွေးပါ။</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{group.map(entry => <label key={entry.id} className="space-y-1 text-xs block">
          <span>{entry.date} · {entry.hours} နာရီ</span>
          <select aria-label="Holiday rate" className={selectClass} value={entry.rateId} onChange={e => updateEntry(entry.id, { rateId: e.target.value })}><option value="">Rate ရွေးပါ…</option>{current.holidayRates.map(rate => <option key={rate.id} value={rate.id}>{rate.name} ×{rate.multiplier}</option>)}</select>
          {entry.rateId && <span className="block break-words text-muted-foreground">{current.holidayRates.find(r => r.id === entry.rateId)?.name} ×{current.holidayRates.find(r => r.id === entry.rateId)?.multiplier}</span>}
        </label>)}</div>
        <details className="border-t pt-2 text-xs"><summary className="cursor-pointer text-muted-foreground">နာရီအသေးစိတ် / ပြင်ဆင်ရန်</summary><div className="space-y-3 pt-3">{group.map(entry => <div key={entry.id} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="space-y-1">ရက်စွဲ<Input type="date" aria-label="Work row date" value={entry.date} onChange={e => updateEntry(entry.id, { date: e.target.value })} /></label>
          <label className="space-y-1">အလုပ်ချိန် (နားချိန်မပါ)<Input type="number" aria-label="Holiday paid hours" min="0" max="24" step="0.01" value={entry.hours} onChange={e => updateEntry(entry.id, { hours: Number(e.target.value) })} /></label>
          <label className="space-y-1">ညပိုင်းနာရီ (22–05)<Input type="number" aria-label="Holiday night hours" min="0" max="7" step="0.01" value={entry.nightHours} onChange={e => updateEntry(entry.id, { nightHours: Number(e.target.value) })} /></label>
        </div>)}</div></details>
      </div>;
    })}
    {(error || problem || policyProblem || loadError) && <p role="alert" className="text-sm text-destructive">{error || (problem?.startsWith("Choose a rate") ? "အလုပ်ဆင်းသည့်ရက်အတွက် rate ရွေးပေးပါ။" : problem) || policyProblem || "Company settings could not be loaded. Check your connection before continuing."}</p>}
  </div>;
}
