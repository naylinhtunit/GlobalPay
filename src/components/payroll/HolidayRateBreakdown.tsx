"use client";
import { useLanguage } from "@/context/LanguageContext";
import { holidayRateBreakdown } from "@/lib/japan-payroll";

export function HolidayRateBreakdown({ hours, nightHours, multiplier, nightPremium }: {
  hours: number; nightHours: number; multiplier: number; nightPremium: number;
}) {
  const { t } = useLanguage();
  const parts = holidayRateBreakdown(hours, nightHours, multiplier, nightPremium);
  return <div className="space-y-1 text-sm" aria-label={t("Applied holiday rates")} role="status">
    {parts.map(part => <p key={part.kind}>
      {part.kind === "night" ? t("Nighttime (22:00–05:00)") : t("Daytime")} <strong>{t("{hours} hours ×{rate}", { hours: part.hours, rate: part.multiplier.toFixed(2) })}</strong>
      {part.kind === "night" && <span className="text-xs text-muted-foreground"> {t("(holiday {base} + night premium {premium})", { base: multiplier.toFixed(2), premium: nightPremium.toFixed(2) })}</span>}
    </p>)}
  </div>;
}
