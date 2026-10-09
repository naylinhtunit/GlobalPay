import { holidayRateBreakdown } from "@/lib/japan-payroll";

export function HolidayRateBreakdown({ hours, nightHours, multiplier, nightPremium }: {
  hours: number; nightHours: number; multiplier: number; nightPremium: number;
}) {
  const parts = holidayRateBreakdown(hours, nightHours, multiplier, nightPremium);
  return <div className="space-y-1 text-sm" aria-label="Applied holiday rates" role="status">
    {parts.map(part => <p key={part.kind}>
      {part.kind === "night" ? "ညပိုင်း (22:00–05:00)" : "နေ့ပိုင်း"} <strong>{part.hours} နာရီ ×{part.multiplier.toFixed(2)}</strong>
      {part.kind === "night" && <span className="text-xs text-muted-foreground"> (holiday {multiplier.toFixed(2)} + ညကြေး {nightPremium.toFixed(2)})</span>}
    </p>)}
  </div>;
}
