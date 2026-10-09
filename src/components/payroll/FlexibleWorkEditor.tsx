"use client";

import { useEffect, useState } from "react";
import { collection, doc, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_PAYROLL_POLICY, splitShift, validateHolidayEntries, validatePolicy, type HolidayWorkEntry, type PayrollPolicy } from "@/lib/japan-payroll";

const selectClass = "h-10 w-full min-w-0 rounded-md border bg-background px-2 text-sm";
const newId = () => crypto.randomUUID();

export function FlexibleWorkEditor({ policy, entries, month, onChange, holidays }: {
  policy?: PayrollPolicy;
  entries: HolidayWorkEntry[];
  month?: string;
  onChange: (policy: PayrollPolicy, entries: HolidayWorkEntry[]) => void;
  holidays: { date: string; title?: string }[];
}) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [date, setDate] = useState(`${month || new Date().toISOString().slice(0, 7)}-01`);
  const [shiftId, setShiftId] = useState("day-08");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  // The existing owner-protected collection is used with a separate country discriminator.
  // Older deployed clients query country=Japan/Myanmar, so never see this configuration record.
  const settingsQuery = useMemoFirebase(() => user && firestore ? query(collection(firestore, "payrollRecords"), where("companyId", "==", user.uid), where("country", "==", "JapanPayrollSettings")) : null, [user, firestore]);
  const { data: settings, isLoading, error: loadError } = useCollection(settingsQuery);
  const current = policy || DEFAULT_PAYROLL_POLICY;

  useEffect(() => {
    if (policy || isLoading || !settings || loadError) return;
    const saved = settings[0]?.policy as PayrollPolicy | undefined;
    onChange(saved && !validatePolicy(saved) ? saved : structuredClone(DEFAULT_PAYROLL_POLICY), entries);
  }, [settings, isLoading, loadError, policy, onChange, entries]);
  useEffect(() => { if (month) setDate(`${month}-01`); }, [month]);

  const changePolicy = (next: PayrollPolicy) => onChange(next, entries);
  const updateEntry = (id: string, patch: Partial<HolidayWorkEntry>) => onChange(current, entries.map(entry => entry.id === id ? { ...entry, ...patch } : entry));
  const addWork = () => {
    const problem = validatePolicy(current);
    if (problem) { setError(problem); return; }
    const shift = current.shifts.find(s => s.id === shiftId) || current.shifts[0];
    if (!month || !date.startsWith(`${month}-`)) { setError("Choose a start date in the payroll month."); return; }
    try {
      const rows = splitShift(date, shift).map(row => ({ ...row, id: newId(), rateId: "" }));
      onChange(current, [...entries, ...rows]);
      setError("");
    } catch (e) { setError((e as Error).message); }
  };
  const saveDefaults = async () => {
    const problem = validatePolicy(current);
    if (problem) { setError(problem); return; }
    if (!user || !firestore) return;
    setSaving(true);
    try {
      await setDoc(doc(firestore, "payrollRecords", `settings_Japan_${user.uid}`), {
        companyId: user.uid, country: "JapanPayrollSettings", employeeId: "__settings__",
        recordType: "payrollSettings", policy: current, updatedAt: serverTimestamp(),
      });
      setError("");
      toast({ title: "Payroll defaults saved", description: "New payroll forms on all your devices will use these settings. Existing payslips stay unchanged." });
    } catch {
      setError("Settings could not be saved. Check your connection and try again; this form still keeps your changes.");
    } finally { setSaving(false); }
  };
  const problem = validateHolidayEntries(entries, current, month);
  const policyProblem = validatePolicy(current);

  return <div className="space-y-4 rounded-xl border bg-card p-4">
    <h4 className="font-bold">休日勤務 / ပိတ်ရက် အလုပ်ဆင်းခြင်း</h4>
    <p className="text-sm text-muted-foreground">စနေ၊ တနင်္ဂနွေ၊ တနင်္လာ အပါအဝင် မည်သည့်ရက်မဆို ထည့်နိုင်သည်။ နောက်ဆုံးပိတ်ရက်ကို Sunday rate ဟု အလိုအလျောက် မသတ်မှတ်ပါ။ ကုမ္ပဏီ၏ 法定休日 / company policy အတိုင်း rate ရွေးပါ။</p>
    <p className="text-xs text-muted-foreground">ညဆိုင်းကို သန်းခေါင်မှာ ရက်ခွဲထားသည်။ နားချိန်ကို Settings မှာ စစ်ဆေးပါ။ Night hours = 22:00–05:00 (နားချိန်မပါ)။ အောက်က နာရီတွေကို အမှန်တကယ်အလုပ်ဆင်းချိန်အတိုင်း ပြင်နိုင်သည်။ Regular OT / Late Night OT တွင် ဒီနာရီတွေ ထပ်မထည့်ပါနှင့်။ Company holiday OT rate ကို နေ့/အပတ် အလုပ်ချိန်နဲ့ စစ်ဆေးရွေးပါ။ တစ်ရက်ထဲ rate မတူလျှင် row ခွဲထည့်ပါ။</p>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
      <label className="space-y-1 text-xs">Work date / ရက်စွဲ<Input aria-label="Holiday work date" type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
      <label className="space-y-1 text-xs">Shift / အဆိုင်း<select aria-label="Holiday shift" className={selectClass} value={current.shifts.some(s => s.id === shiftId) ? shiftId : current.shifts[0]?.id || ""} onChange={e => setShiftId(e.target.value)}>{current.shifts.map(s => <option key={s.id} value={s.id}>{s.name} {s.start}–{s.end}</option>)}</select></label>
      <Button type="button" variant="outline" onClick={addWork}>+ Add holiday work / ထည့်မည်</Button>
    </div>
    {holidays.filter(h => h.date.startsWith(month || "")).length > 0 && <div className="flex flex-wrap gap-2">{holidays.filter(h => h.date.startsWith(month || "")).map(h => <Button type="button" size="sm" variant="secondary" key={h.date} onClick={() => setDate(h.date)}>{h.date} {h.title}</Button>)}</div>}
    {entries.length === 0 && <p className="text-sm text-muted-foreground">ပိတ်ရက် အလုပ်ဆင်းထားပါက ရက်စွဲနဲ့ shift ကို ရွေးပြီး ထည့်ပါ။</p>}
    {entries.map(entry => <div key={entry.id} className="space-y-3 rounded-lg border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2"><p className="min-w-0 text-xs font-medium break-words">{entry.shiftName}</p><Button type="button" size="sm" variant="ghost" aria-label={`Remove holiday ${entry.date}`} onClick={() => onChange(current, entries.filter(e => e.id !== entry.id))}>ဖယ်မည်</Button></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <label className="space-y-1 text-xs">ရက်စွဲ<Input type="date" aria-label="Work row date" value={entry.date} onChange={e => updateEntry(entry.id, { date: e.target.value })} /></label>
        <label className="space-y-1 text-xs">Paid hours<Input type="number" aria-label="Holiday paid hours" min="0" max="24" step="0.01" value={entry.hours} onChange={e => updateEntry(entry.id, { hours: Number(e.target.value) })} /></label>
        <label className="space-y-1 text-xs">Night hours (22–05)<Input type="number" aria-label="Holiday night hours" min="0" max="7" step="0.01" value={entry.nightHours} onChange={e => updateEntry(entry.id, { nightHours: Number(e.target.value) })} /></label>
        <label className="space-y-1 text-xs">တွက်မည့် rate<select aria-label="Holiday rate" className={selectClass} value={entry.rateId} onChange={e => updateEntry(entry.id, { rateId: e.target.value })}><option value="">Rate ရွေးပါ…</option>{current.holidayRates.map(rate => <option key={rate.id} value={rate.id}>{rate.name} ×{rate.multiplier}</option>)}</select></label>
      </div>
      {entry.rateId && <p className="text-xs break-words text-muted-foreground">{current.holidayRates.find(r => r.id === entry.rateId)?.name} ×{current.holidayRates.find(r => r.id === entry.rateId)?.multiplier} {entry.nightHours > 0 ? ` + Night ${entry.nightHours}h ×${current.nightPremium}` : ""}</p>}
    </div>)}
    {(error || problem || policyProblem || loadError) && <p role="alert" className="text-sm text-destructive">{error || problem || policyProblem || "Company settings could not be loaded. Check your connection before continuing."}</p>}
    <details className="rounded-lg border p-3">
      <summary className="cursor-pointer font-semibold text-sm">⚙ Payroll settings / Shift နဲ့ rate များ ပြင်ဆင်ရန်</summary>
      <div className="space-y-4 pt-4">
        <p className="text-xs text-muted-foreground">ဒီ form ပြင်ဆင်မှုတွေကို payslip နဲ့အတူ သိမ်းမည်။ “Save company defaults” နှိပ်မှ နောက်ဖန်တီးမည့် form အားလုံးတွင် အသုံးပြုမည်။ သိမ်းပြီးသား payslip မပြောင်းပါ။ ပိတ်ရက်/အခွန် စည်းမျဉ်းများကို payroll တာဝန်ရှိသူနဲ့ အတည်ပြုပါ။</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1 text-xs">Hourly divisor (monthly hours)<Input type="number" min="0.01" step="0.01" value={current.hourlyDivisor} onChange={e => changePolicy({ ...current, hourlyDivisor: Number(e.target.value) })} /></label>
          <label className="space-y-1 text-xs">Holiday night premium (+)<Input type="number" min="0.25" step="0.01" value={current.nightPremium} onChange={e => changePolicy({ ...current, nightPremium: Number(e.target.value) })} /></label>
        </div>
        <h5 className="font-medium text-sm">Shift templates / အဆိုင်းများ</h5>
        <p className="text-xs text-muted-foreground">နားချိန်များသည် ပြင်နိုင်သော နမူနာဖြစ်သည်။ Regular shift allowance 1 (×0.25), 2 (×0.30) သည် မူလ company policy ဖြစ်ပြီး ဥပဒေသတ်မှတ် night hours နဲ့ မတူပါ။ ပိတ်ရက် night premium ကိုတော့ 22–05 အမှန်တကယ်နာရီနဲ့ သီးခြားတွက်သည်။</p>
        {current.shifts.map((shift, index) => <div className="space-y-2 rounded border p-3" key={shift.id}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {([{ field: "name", label: "အမည်", type: "text" }, { field: "start", label: "စချိန်", type: "time" }, { field: "end", label: "ဆုံးချိန်", type: "time" }, { field: "breakStart", label: "နားချိန် စ", type: "time" }, { field: "breakMinutes", label: "နားချိန် (min)", type: "number" }, { field: "allowance1Hours", label: "Regular allowance 1 hrs", type: "number" }, { field: "allowance2Hours", label: "Regular allowance 2 hrs", type: "number" }] as const).map(item => <label key={item.field} className="space-y-1 text-xs">{item.label}<Input type={item.type} min={item.type === "number" ? 0 : undefined} step={item.type === "number" ? "0.01" : undefined} value={shift[item.field]} onChange={e => changePolicy({ ...current, shifts: current.shifts.map((s, i) => i === index ? { ...s, [item.field]: item.type === "number" ? Number(e.target.value) : e.target.value } : s) })} /></label>)}
          </div>
          <Button type="button" size="sm" variant="ghost" disabled={current.shifts.length <= 1} onClick={() => changePolicy({ ...current, shifts: current.shifts.filter(s => s.id !== shift.id) })}>Remove template</Button>
        </div>)}
        <Button type="button" size="sm" variant="outline" onClick={() => changePolicy({ ...current, shifts: [...current.shifts, { id: newId(), name: "Custom shift", start: "08:00", end: "17:00", breakStart: "12:00", breakMinutes: 60, allowance1Hours: 0, allowance2Hours: 0 }] })}>+ Shift အသစ်</Button>
        <h5 className="font-medium text-sm">Holiday rate templates</h5>
        {current.holidayRates.map(rate => <div key={rate.id} className="grid grid-cols-1 sm:grid-cols-4 gap-2 rounded border p-3 items-end">
          <label className="space-y-1 text-xs sm:col-span-2">Rate အမည်<Input value={rate.name} onChange={e => changePolicy({ ...current, holidayRates: current.holidayRates.map(r => r.id === rate.id ? { ...r, name: e.target.value } : r) })} /></label>
          <label className="space-y-1 text-xs">Multiplier (total)<Input type="number" min={rate.statutory ? 1.35 : rate.includedInBase ? 0 : 1} step="0.01" value={rate.multiplier} onChange={e => changePolicy({ ...current, holidayRates: current.holidayRates.map(r => r.id === rate.id ? { ...r, multiplier: Number(e.target.value) } : r) })} /></label>
          <div className="space-y-2"><Label className="flex gap-2 text-xs"><input type="checkbox" checked={rate.statutory} onChange={e => changePolicy({ ...current, holidayRates: current.holidayRates.map(r => r.id === rate.id ? { ...r, statutory: e.target.checked, multiplier: e.target.checked ? Math.max(1.35, r.multiplier) : r.multiplier } : r) })} />法定休日</Label><Button type="button" size="sm" variant="ghost" disabled={current.holidayRates.length <= 1 || entries.some(e => e.rateId === rate.id)} onClick={() => changePolicy({ ...current, holidayRates: current.holidayRates.filter(r => r.id !== rate.id) })}>Remove rate</Button></div>
        </div>)}
        <div className="flex flex-wrap gap-3"><Button type="button" size="sm" variant="outline" onClick={() => changePolicy({ ...current, holidayRates: [...current.holidayRates, { id: newId(), name: "Custom company rate", multiplier: 1.35, statutory: false }] })}>+ Rate အသစ်</Button><Button type="button" disabled={saving || isLoading || !!loadError || !!policyProblem} onClick={saveDefaults}>{saving ? "Saving…" : "Save company defaults"}</Button></div>
      </div>
    </details>
  </div>;
}
