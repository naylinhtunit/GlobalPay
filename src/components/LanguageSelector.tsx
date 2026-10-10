"use client";

import { useId } from "react";
import { Languages } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { isLanguage } from "@/lib/i18n";

export function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage, t } = useLanguage();
  const id = useId();
  return <div className={compact ? "flex items-center gap-2" : "space-y-2"}>
    <label htmlFor={id} className={compact ? "sr-only" : "px-1 text-xs font-semibold text-muted-foreground"}>{t("Language")}</label>
    <div className="relative flex items-center gap-2 rounded-xl border bg-background px-3">
      <Languages size={16} className="shrink-0 text-primary" aria-hidden="true" />
      <select id={id} aria-label={t("Language")} value={language} onChange={event => {
        if (isLanguage(event.target.value)) setLanguage(event.target.value);
      }} className="h-11 w-full min-w-0 bg-transparent text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <option value="my">မြန်မာ</option><option value="en">English</option><option value="ja">日本語</option>
      </select>
    </div>
    {!compact && <p className="px-1 text-xs text-muted-foreground">{t("Language only. Payroll country and currency stay unchanged.")}</p>}
  </div>;
}
