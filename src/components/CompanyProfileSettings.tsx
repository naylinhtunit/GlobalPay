"use client";

import { useEffect, useState } from "react";
import { useCompanyProfile } from "@/hooks/useCompanyProfile";
import { COMPANY_NAME_MAX_LENGTH } from "@/lib/company-profile";
import { useLanguage } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CompanyProfileSettings() {
  const { t } = useLanguage();
  const { companyName, isLoaded, error, saveCompanyName, accountId } = useCompanyProfile();
  const [draft, setDraft] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { setDraft(""); setDirty(false); setMessage(""); }, [accountId]);
  useEffect(() => { if (!dirty) setDraft(companyName); }, [companyName, dirty]);
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setMessage("");
    try { await saveCompanyName(draft); setDirty(false); setMessage("Company name saved."); }
    catch { setMessage("Unable to save the company name. Check your connection and try again."); }
    finally { setSaving(false); }
  };
  return <form onSubmit={save} className="space-y-3 rounded-2xl border bg-card p-4">
    <Label htmlFor="company-name">{t("Company name")}</Label>
    <Input id="company-name" value={draft} maxLength={COMPANY_NAME_MAX_LENGTH} required disabled={!isLoaded || saving} placeholder={t("Enter your company name")} onChange={event => { setDraft(event.target.value); setDirty(true); setMessage(""); }} />
    <p className="text-xs text-muted-foreground">{t("Shown on payslips. New payslips keep the company name saved when they were created.")}</p>
    {error && <p role="alert" className="text-xs text-destructive">{t("Unable to load company settings. Check your connection.")}</p>}
    {message && <p role="status" className="text-xs">{t(message)}</p>}
    <Button type="submit" size="sm" disabled={!isLoaded || saving || !draft.trim() || !dirty}>{saving ? t("Saving…") : t("Save company name")}</Button>
  </form>;
}
