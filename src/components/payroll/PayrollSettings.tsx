"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createLocalId } from "@/lib/local-id";
import { useToast } from "@/hooks/use-toast";
import { useCompanyPayrollSettings } from "@/hooks/useCompanyPayrollSettings";
import { DEFAULT_PAYROLL_POLICY, validatePolicy, type PayrollPolicy } from "@/lib/japan-payroll";

const newId = createLocalId;

export function PayrollSettings() {
  const { policy, isLoading, isLoaded, error: loadError, savePolicy } = useCompanyPayrollSettings();
  const [draft, setDraft] = useState<PayrollPolicy | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();
  const current = draft || policy;
  const changePolicy = (next: PayrollPolicy) => setDraft(next);
  const policyProblem = validatePolicy(current);
  const removeRate = (id: string) => changePolicy({ ...current,
    holidayRates: current.holidayRates.filter(rate => rate.id !== id),
    defaultHolidayRateId: current.defaultHolidayRateId === id ? "" : current.defaultHolidayRateId || "",
    shifts: current.shifts.map(shift => shift.holidayRateId === id ? { ...shift, holidayRateId: "" } : shift),
  });
  const saveDefaults = async () => {
    setSaving(true);
    try {
      await savePolicy(current);
      setError("");
      toast({ title: "Payroll settings saved", description: "နောက်ဖန်တီးမည့် payroll တွင် အသုံးပြုမည်။ သိမ်းပြီးသား payslip မပြောင်းပါ။" });
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  };

  return <section id="payroll-settings" className="space-y-2">
    <p className="px-1 text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">Payroll settings · Japan</p>
    {(error || policyProblem || loadError) && <p role="alert" className="text-sm text-destructive">{error || policyProblem || "Settings could not be loaded. Check your connection."}</p>}
    <details className="rounded-lg border p-3">
      <summary className="cursor-pointer font-semibold text-sm">⚙ Payroll settings / Shift နဲ့ rate များ ပြင်ဆင်ရန်</summary>
      <div className="space-y-4 pt-4">
        <p className="text-xs text-muted-foreground">နောက်ဆုံးပိတ်ရက်ကို Sunday rate ဟု အလိုအလျောက် မသတ်မှတ်ပါ။ 法定休日 / company policy ကို စစ်ဆေးပါ။ ညဆိုင်းကို သန်းခေါင်မှာ ရက်ခွဲတွက်သည်။ Night hours = 22:00–05:00 (နားချိန်မပါ)။ ဒီအလုပ်ချိန်တွေကို Regular shift / Regular OT / Late Night OT တွင် ထပ်မထည့်ပါနှင့်။ Company holiday OT rate ကို နေ့/အပတ် အလုပ်ချိန်အလိုက် စစ်ဆေးရွေးပါ။ တစ်ရက်ထဲ rate မတူလျှင် အလုပ်ချိန်ကို ခွဲထည့်နိုင်သည်။</p>
        <p className="text-xs text-muted-foreground">“Save company defaults” နှိပ်ပြီး သိမ်းထားသော shift နဲ့ rate များကို နောက်ဖန်တီးမည့် payroll တွင် အသုံးပြုမည်။ လက်ရှိဖွင့်ထားသော form နှင့် သိမ်းပြီးသား payslip မပြောင်းပါ။ ပိတ်ရက်/အခွန် စည်းမျဉ်းများကို payroll တာဝန်ရှိသူနဲ့ အတည်ပြုပါ။</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1 text-xs">Hourly divisor (monthly hours)<Input type="number" min="0.01" step="0.01" value={current.hourlyDivisor} onChange={e => changePolicy({ ...current, hourlyDivisor: Number(e.target.value) })} /></label>
          <label className="space-y-1 text-xs">Holiday night premium (+)<Input type="number" min="0.25" step="0.01" value={current.nightPremium} onChange={e => changePolicy({ ...current, nightPremium: Number(e.target.value) })} /></label>
        </div>
        <label className="block space-y-1 text-xs">Default holiday rate / ပိတ်ရက်အလုပ်ခ rate
          <select aria-label="Company default holiday rate" className="h-10 w-full rounded-md border bg-background px-2 text-sm" value={current.defaultHolidayRateId || ""} onChange={e => changePolicy({ ...current, defaultHolidayRateId: e.target.value })}>
            <option value="">နောက်ဆုံးရွေးထားသည့် rate / နမူနာ default</option>{current.holidayRates.map(rate => <option key={rate.id} value={rate.id}>{rate.name} ×{rate.multiplier}</option>)}
          </select>
          <span className="block text-muted-foreground">နမူနာ default: holiday ×{current.holidayRates.find(rate => rate.id === DEFAULT_PAYROLL_POLICY.defaultHolidayRateId)?.multiplier ?? "—"}၊ ညပိုင်းအပို +{current.nightPremium}။ ကုမ္ပဏီ rate အဖြစ် အတည်မပြုရသေးပါ။ ကုမ္ပဏီနှင့် စစ်ဆေးပြီး ပြင်သိမ်းနိုင်သည်။ ညပိုင်းအပိုကြေး မပါသော holiday rate ကို ရွေးပါ။</span>
        </label>
        <h5 className="font-medium text-sm">Shift templates / အဆိုင်းများ</h5>
        <p className="text-xs text-muted-foreground">နားချိန်များသည် ပြင်နိုင်သော နမူနာဖြစ်သည်။ Regular shift allowance 1 (×0.25), 2 (×0.30) သည် မူလ company policy ဖြစ်ပြီး ဥပဒေသတ်မှတ် night hours နဲ့ မတူပါ။ ပိတ်ရက် night premium ကိုတော့ 22–05 အမှန်တကယ်နာရီနဲ့ သီးခြားတွက်သည်။</p>
        {current.shifts.map((shift, index) => <div className="space-y-2 rounded border p-3" key={shift.id}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {([{ field: "name", label: "အမည်", type: "text" }, { field: "start", label: "စချိန်", type: "time" }, { field: "end", label: "ဆုံးချိန်", type: "time" }, { field: "breakStart", label: "နားချိန် စ", type: "time" }, { field: "breakMinutes", label: "နားချိန် (min)", type: "number" }, { field: "allowance1Hours", label: "Regular allowance 1 hrs", type: "number" }, { field: "allowance2Hours", label: "Regular allowance 2 hrs", type: "number" }] as const).map(item => <label key={item.field} className="space-y-1 text-xs">{item.label}<Input type={item.type} min={item.type === "number" ? 0 : undefined} step={item.type === "number" ? "0.01" : undefined} value={shift[item.field]} onChange={e => changePolicy({ ...current, shifts: current.shifts.map((s, i) => i === index ? { ...s, [item.field]: item.type === "number" ? Number(e.target.value) : e.target.value } : s) })} /></label>)}
          </div>
          <label className="block space-y-1 text-xs">ဒီအဆိုင်း၏ holiday rate
            <select aria-label={'Holiday rate for ' + shift.id} className="h-10 w-full rounded-md border bg-background px-2 text-sm" value={shift.holidayRateId || ""} onChange={e => changePolicy({ ...current, shifts: current.shifts.map(s => s.id === shift.id ? { ...s, holidayRateId: e.target.value } : s) })}>
              <option value="">Company default ကို သုံးမည်</option>{current.holidayRates.map(rate => <option key={rate.id} value={rate.id}>{rate.name} ×{rate.multiplier}</option>)}
            </select>
          </label>
          <Button type="button" size="sm" variant="ghost" disabled={current.shifts.length <= 1} onClick={() => changePolicy({ ...current, shifts: current.shifts.filter(s => s.id !== shift.id) })}>Remove template</Button>
        </div>)}
        <Button type="button" size="sm" variant="outline" onClick={() => changePolicy({ ...current, shifts: [...current.shifts, { id: newId(), name: "Custom shift", start: "08:00", end: "17:00", breakStart: "12:00", breakMinutes: 60, allowance1Hours: 0, allowance2Hours: 0 }] })}>+ Shift အသစ်</Button>
        <h5 className="font-medium text-sm">Holiday rate templates</h5>
        {current.holidayRates.map(rate => <div key={rate.id} className="grid grid-cols-1 sm:grid-cols-4 gap-2 rounded border p-3 items-end">
          <label className="space-y-1 text-xs sm:col-span-2">Rate အမည်<Input value={rate.name} onChange={e => changePolicy({ ...current, holidayRates: current.holidayRates.map(r => r.id === rate.id ? { ...r, name: e.target.value } : r) })} /></label>
          <label className="space-y-1 text-xs">Multiplier (total)<Input type="number" min={rate.statutory ? 1.35 : rate.includedInBase ? 0 : 1} step="0.01" value={rate.multiplier} onChange={e => changePolicy({ ...current, holidayRates: current.holidayRates.map(r => r.id === rate.id ? { ...r, multiplier: Number(e.target.value) } : r) })} /></label>
          <div className="space-y-2"><Label className="flex gap-2 text-xs"><input type="checkbox" checked={rate.statutory} onChange={e => changePolicy({ ...current, holidayRates: current.holidayRates.map(r => r.id === rate.id ? { ...r, statutory: e.target.checked, multiplier: e.target.checked ? Math.max(1.35, r.multiplier) : r.multiplier } : r) })} />法定休日</Label><Button type="button" size="sm" variant="ghost" disabled={current.holidayRates.length <= 1} onClick={() => removeRate(rate.id)}>Remove rate</Button></div>
        </div>)}
        <div className="flex flex-wrap gap-3"><Button type="button" size="sm" variant="outline" onClick={() => changePolicy({ ...current, holidayRates: [...current.holidayRates, { id: newId(), name: "Custom company rate", multiplier: 1.35, statutory: false }] })}>+ Rate အသစ်</Button><Button type="button" disabled={saving || isLoading || !isLoaded || !!loadError || !!policyProblem} onClick={saveDefaults}>{saving ? "Saving…" : "Save company defaults"}</Button></div>
      </div>
    </details>
  </section>;
}
