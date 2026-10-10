"use client";
import { useLanguage } from "@/context/LanguageContext";

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
  const { t } = useLanguage();
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
      toast({ title: t("Payroll settings saved"), description: t("Applies to new payrolls. Saved payslips stay unchanged.") });
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  };

  return <section id="payroll-settings" className="space-y-2">
    <p className="px-1 text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">{t("Payroll settings · Japan")}</p>
    {(error || policyProblem || loadError) && <p role="alert" className="text-sm text-destructive">{t(error || policyProblem || "Settings could not be loaded. Check your connection.")}</p>}
    <details className="rounded-lg border p-3">
      <summary className="cursor-pointer font-semibold text-sm">{t("Payroll settings / shifts and rates")}</summary>
      <div className="space-y-4 pt-4">
        <p className="text-xs text-muted-foreground">{t("The last holiday is not automatically a Sunday rate. Confirm statutory holidays and company policy. Overnight work splits at midnight; night hours are 22:00–05:00 excluding breaks. Do not duplicate these hours in regular shifts or overtime. Check daily/weekly overtime when choosing company holiday rates; split hours if rates differ within a date.")}</p>
        <p className="text-xs text-muted-foreground">{t("Saving company defaults applies shifts and rates to new payroll forms only. Open forms and saved payslips do not change. Confirm holiday and tax rules with payroll staff.")}</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1 text-xs">{t("Hourly divisor (monthly hours)")}<Input type="number" min="0.01" step="0.01" value={current.hourlyDivisor} onChange={e => changePolicy({ ...current, hourlyDivisor: Number(e.target.value) })} /></label>
          <label className="space-y-1 text-xs">{t("Holiday night premium (+)")}<Input type="number" min="0.25" step="0.01" value={current.nightPremium} onChange={e => changePolicy({ ...current, nightPremium: Number(e.target.value) })} /></label>
        </div>
        <label className="block space-y-1 text-xs">{t("Default holiday rate")} <select aria-label={t("Default holiday rate")} className="h-10 w-full rounded-md border bg-background px-2 text-sm" value={current.defaultHolidayRateId || ""} onChange={e => changePolicy({ ...current, defaultHolidayRateId: e.target.value })}>
            <option value="">{t("Previous selection / example default")}</option>{current.holidayRates.map(rate => <option key={rate.id} value={rate.id}>{t(rate.name)} ×{rate.multiplier}</option>)}
          </select>
          <span className="block text-muted-foreground">{t("Example default: holiday ×{rate}, night premium +{premium}. Not confirmed as company policy. Confirm and edit; choose a holiday rate excluding night premium.", { rate: current.holidayRates.find(rate => rate.id === DEFAULT_PAYROLL_POLICY.defaultHolidayRateId)?.multiplier ?? "—", premium: current.nightPremium })}</span>
        </label>
        <h5 className="font-medium text-sm">{t("Shift templates")}</h5>
        <p className="text-xs text-muted-foreground">{t("Breaks are editable examples. Regular company allowances 1 (×0.25) and 2 (×0.30) differ from statutory night hours. Holiday night premiums use actual 22:00–05:00 hours.")}</p>
        {current.shifts.map((shift, index) => <div className="space-y-2 rounded border p-3" key={shift.id}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {([{ field: "name", label: "အမည်", type: "text" }, { field: "start", label: "စချိန်", type: "time" }, { field: "end", label: "ဆုံးချိန်", type: "time" }, { field: "breakStart", label: "နားချိန် စ", type: "time" }, { field: "breakMinutes", label: "နားချိန် (min)", type: "number" }, { field: "allowance1Hours", label: "Regular allowance 1 hrs", type: "number" }, { field: "allowance2Hours", label: "Regular allowance 2 hrs", type: "number" }] as const).map(item => <label key={item.field} className="space-y-1 text-xs">{t(item.label)}<Input type={item.type} min={item.type === "number" ? 0 : undefined} step={item.type === "number" ? "0.01" : undefined} value={item.field === "name" ? t(shift.name) : shift[item.field]} onChange={e => changePolicy({ ...current, shifts: current.shifts.map((s, i) => i === index ? { ...s, [item.field]: item.type === "number" ? Number(e.target.value) : e.target.value } : s) })} /></label>)}
          </div>
          <label className="block space-y-1 text-xs">{t("Holiday rate for this shift")} <select aria-label={t("Holiday rate for this shift") + ' ' + shift.id} className="h-10 w-full rounded-md border bg-background px-2 text-sm" value={shift.holidayRateId || ""} onChange={e => changePolicy({ ...current, shifts: current.shifts.map(s => s.id === shift.id ? { ...s, holidayRateId: e.target.value } : s) })}>
              <option value="">{t("Use company default")}</option>{current.holidayRates.map(rate => <option key={rate.id} value={rate.id}>{t(rate.name)} ×{rate.multiplier}</option>)}
            </select>
          </label>
          <Button type="button" size="sm" variant="ghost" disabled={current.shifts.length <= 1} onClick={() => changePolicy({ ...current, shifts: current.shifts.filter(s => s.id !== shift.id) })}>{t("Remove template")}</Button>
        </div>)}
        <Button type="button" size="sm" variant="outline" onClick={() => changePolicy({ ...current, shifts: [...current.shifts, { id: newId(), name: "Custom shift", start: "08:00", end: "17:00", breakStart: "12:00", breakMinutes: 60, allowance1Hours: 0, allowance2Hours: 0 }] })}>{t("+ New shift")}</Button>
        <h5 className="font-medium text-sm">{t("Holiday rate templates")}</h5>
        {current.holidayRates.map(rate => <div key={rate.id} className="grid grid-cols-1 sm:grid-cols-4 gap-2 rounded border p-3 items-end">
          <label className="space-y-1 text-xs sm:col-span-2">{t("Rate name")}<Input value={t(rate.name)} onChange={e => changePolicy({ ...current, holidayRates: current.holidayRates.map(r => r.id === rate.id ? { ...r, name: e.target.value } : r) })} /></label>
          <label className="space-y-1 text-xs">{t("Multiplier (total)")}<Input type="number" min={rate.statutory ? 1.35 : rate.includedInBase ? 0 : 1} step="0.01" value={rate.multiplier} onChange={e => changePolicy({ ...current, holidayRates: current.holidayRates.map(r => r.id === rate.id ? { ...r, multiplier: Number(e.target.value) } : r) })} /></label>
          <div className="space-y-2"><Label className="flex gap-2 text-xs"><input type="checkbox" checked={rate.statutory} onChange={e => changePolicy({ ...current, holidayRates: current.holidayRates.map(r => r.id === rate.id ? { ...r, statutory: e.target.checked, multiplier: e.target.checked ? Math.max(1.35, r.multiplier) : r.multiplier } : r) })} />{t("Statutory holiday")}</Label><Button type="button" size="sm" variant="ghost" disabled={current.holidayRates.length <= 1} onClick={() => removeRate(rate.id)}>{t("Remove rate")}</Button></div>
        </div>)}
        <div className="flex flex-wrap gap-3"><Button type="button" size="sm" variant="outline" onClick={() => changePolicy({ ...current, holidayRates: [...current.holidayRates, { id: newId(), name: "Custom company rate", multiplier: 1.35, statutory: false }] })}>{t("+ New rate")}</Button><Button type="button" disabled={saving || isLoading || !isLoaded || !!loadError || !!policyProblem} onClick={saveDefaults}>{saving ? t("Saving…") : t("Save company defaults")}</Button></div>
      </div>
    </details>
  </section>;
}
