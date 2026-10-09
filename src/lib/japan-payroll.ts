/** Company policy snapshots are stored with each payslip, never resolved from live settings. */
export interface ShiftPreset {
  id: string;
  name: string;
  start: string;
  end: string;
  breakStart: string;
  breakMinutes: number;
  allowance1Hours: number;
  allowance2Hours: number;
  holidayRateId?: string;
}

export interface HolidayRate {
  id: string;
  name: string;
  multiplier: number;
  statutory: boolean;
  includedInBase?: boolean;
}

export interface PayrollPolicy {
  version: 1;
  hourlyDivisor: number;
  nightPremium: number;
  shifts: ShiftPreset[];
  holidayRates: HolidayRate[];
  defaultHolidayRateId?: string;
}

export interface HolidayWorkEntry {
  id: string;
  groupId?: string;
  date: string;
  shiftName: string;
  hours: number;
  nightHours: number;
  rateId: string;
}

/** One visible card per added shift, while retaining civil-date rows for calculation. */
export function groupHolidayEntries(entries: HolidayWorkEntry[]): HolidayWorkEntry[][] {
  const groups: HolidayWorkEntry[][] = [];
  const byId = new Map<string, HolidayWorkEntry[]>();
  for (const entry of entries) {
    if (entry.groupId) {
      let group = byId.get(entry.groupId);
      if (!group) { group = []; byId.set(entry.groupId, group); groups.push(group); }
      group.push(entry);
    } else {
      const previous = groups[groups.length - 1];
      const sameShift = previous?.[0]?.shiftName === entry.shiftName.replace(/ \(\+1 day\)$/, "");
      const continuation = entry.shiftName.endsWith(" (+1 day)") && previous?.length === 1 && !previous[0].groupId && sameShift;
      let follows = false;
      try { follows = !!continuation && nextDate(previous[0].date) === entry.date; } catch { /* Date is being edited. */ }
      if (follows) previous.push(entry);
      else groups.push([entry]);
    }
  }
  return groups;
}

interface LegacyHolidayFields {
  saturdayHolidayHours?: number;
  sundayHolidayHours?: number;
  saturdayHolidayMorningHours?: number;
  saturdayHolidayAfternoonHours?: number;
  sundayHolidayMorningHours?: number;
  sundayHolidayAfternoonHours?: number;
  holidayShiftType?: "morning" | "afternoon";
}

/** Display-only, non-overlapping hours. Stored totals and pay calculations stay unchanged. */
export function splitHolidayHours(totalHours: number, nightHours: number) {
  const total = Math.max(0, Number(totalHours) || 0);
  const night = Math.min(total, Math.max(0, Number(nightHours) || 0));
  const round = (hours: number) => Math.round(hours * 10000) / 10000;
  return { day: round(total - night), night: round(night), total: round(total) };
}

/** Applied rates for the actual clock hours, excluding unpaid breaks. Night rate includes holiday pay. */
export function holidayRateBreakdown(totalHours: number, nightHours: number, holidayRate: number, nightPremium: number) {
  const hours = splitHolidayHours(totalHours, nightHours);
  return [
    { kind: "day" as const, hours: hours.day, multiplier: holidayRate },
    { kind: "night" as const, hours: hours.night, multiplier: Math.round((holidayRate + nightPremium) * 10000) / 10000 },
  ].filter(part => part.hours > 0);
}

/** Saved aggregate fields remain totals, including night hours; never persist the display-only day value. */
export function getHolidayAttendance(data: LegacyHolidayFields & { holidayTotalHours?: number; holidayNightHours?: number }) {
  const legacy = normalizeLegacyHolidayFields(data);
  return splitHolidayHours(
    data.holidayTotalHours ?? legacy.saturdayHolidayHours + legacy.sundayHolidayHours,
    data.holidayNightHours ?? Math.round((legacy.saturdayHolidayAfternoonHours + legacy.sundayHolidayAfternoonHours) * 0.5),
  );
}

export function hasLegacyHolidayHours(data: LegacyHolidayFields) {
  const legacy = normalizeLegacyHolidayFields(data);
  return legacy.saturdayHolidayHours > 0 || legacy.sundayHolidayHours > 0;
}

/** Never guess an employer's rate from weekday/nighttime. Explicit defaults win over past selections. */
export function suggestHolidayRate(policy: PayrollPolicy, shift: ShiftPreset, entries: HolidayWorkEntry[]) {
  const valid = (id?: string) => id && policy.holidayRates.some(rate => rate.id === id) ? id : "";
  const configured = valid(shift.holidayRateId) || valid(policy.defaultHolidayRateId);
  if (configured) return configured;
  const label = `${shift.name} ${shift.start}–${shift.end}`;
  const previous = [...groupHolidayEntries(entries)].reverse().find(group => group[0].shiftName.replace(/ \(\+1 day\)$/, "") === label);
  if (previous) {
    const ids = new Set(previous.map(entry => valid(entry.rateId)));
    if (ids.size === 1 && [...ids][0]) return [...ids][0];
    // Mixed/unselected date rates must not be silently flattened into one rate.
    return "";
  }
  // Editable company-policy example, not a statutory classification inferred from a date.
  return valid(DEFAULT_PAYROLL_POLICY.defaultHolidayRateId);
}

/** Explicit split zeros mean cleared hours; never resurrect a stale aggregate on edit. */
export function normalizeLegacyHolidayFields(data: LegacyHolidayFields) {
  const satSplit = data.saturdayHolidayMorningHours != null || data.saturdayHolidayAfternoonHours != null;
  const sunSplit = data.sundayHolidayMorningHours != null || data.sundayHolidayAfternoonHours != null;
  const saturdayHolidayMorningHours = satSplit ? data.saturdayHolidayMorningHours || 0 : data.holidayShiftType === "afternoon" ? 0 : data.saturdayHolidayHours || 0;
  const saturdayHolidayAfternoonHours = satSplit ? data.saturdayHolidayAfternoonHours || 0 : data.holidayShiftType === "afternoon" ? data.saturdayHolidayHours || 0 : 0;
  const sundayHolidayMorningHours = sunSplit ? data.sundayHolidayMorningHours || 0 : data.sundayHolidayHours || 0;
  const sundayHolidayAfternoonHours = sunSplit ? data.sundayHolidayAfternoonHours || 0 : 0;
  return { saturdayHolidayMorningHours, saturdayHolidayAfternoonHours, sundayHolidayMorningHours, sundayHolidayAfternoonHours,
    saturdayHolidayHours: saturdayHolidayMorningHours + saturdayHolidayAfternoonHours,
    sundayHolidayHours: sundayHolidayMorningHours + sundayHolidayAfternoonHours };
}

export const DEFAULT_PAYROLL_POLICY: PayrollPolicy = {
  version: 1,
  defaultHolidayRateId: "company-150",
  hourlyDivisor: 170.5,
  nightPremium: 0.25,
  shifts: [
    { id: "day-08", name: "Morning / မနက်", start: "08:00", end: "17:00", breakStart: "12:00", breakMinutes: 60, allowance1Hours: 0, allowance2Hours: 0 },
    { id: "day-12", name: "Afternoon / နေ့လယ်", start: "12:00", end: "21:00", breakStart: "16:00", breakMinutes: 60, allowance1Hours: 4, allowance2Hours: 0 },
    { id: "night-19", name: "Night / ညဆိုင်း", start: "19:00", end: "04:00", breakStart: "00:00", breakMinutes: 60, allowance1Hours: 3, allowance2Hours: 5 },
    { id: "night-21", name: "Night / ညဆိုင်း", start: "21:00", end: "06:00", breakStart: "01:00", breakMinutes: 60, allowance1Hours: 1, allowance2Hours: 7 },
  ],
  // No weekday or final day of a closure is automatically assumed to be statutory.
  holidayRates: [
    { id: "statutory", name: "法定休日 / Statutory holiday", multiplier: 1.35, statutory: true },
    { id: "company-ot", name: "所定休日・時間外 / Company holiday (OT)", multiplier: 1.25, statutory: false },
    { id: "company-normal", name: "所定休日・法定内 / Company holiday (within legal hours)", multiplier: 1, statutory: false },
    { id: "company-135", name: "会社規定 / Company policy 1.35", multiplier: 1.35, statutory: false },
    { id: "company-150", name: "会社規定 / Company policy 1.50", multiplier: 1.50, statutory: false },
    { id: "company-ot60", name: "月60h超の時間外 / OT above 60h per month", multiplier: 1.50, statutory: false },
    { id: "regular-in-base", name: "通常勤務・基本給に含む / Regular work already in base salary", multiplier: 0, statutory: false, includedInBase: true },
  ],
};

const timeMinutes = (time: string) => {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error("Shift times must use HH:mm.");
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};
const roundHours = (minutes: number) => Math.round(minutes / 60 * 10000) / 10000;

export function nextDate(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== date) throw new Error("Choose a valid work date.");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Split overnight shifts at civil midnight; deduct breaks from the correct date/night interval. */
export function splitShift(date: string, shift: ShiftPreset): Omit<HolidayWorkEntry, "id" | "rateId">[] {
  const followingDate = nextDate(date);
  const start = timeMinutes(shift.start);
  let end = timeMinutes(shift.end);
  if (end === start) throw new Error("Shift start and end cannot be the same.");
  if (end < start) end += 1440;
  let breakStart = timeMinutes(shift.breakStart);
  if (breakStart < start) breakStart += 1440;
  const breakLength = shift.breakMinutes;
  if (!Number.isFinite(breakLength) || breakLength < 0 || !Number.isInteger(breakLength) ||
      (breakLength > 0 && (breakStart < start || breakStart + breakLength > end))) {
    throw new Error("Unpaid break must be inside the shift (whole minutes).");
  }
  const segments = [0, 1].map(day => {
    let paid = 0;
    let night = 0;
    for (let minute = Math.max(start, day * 1440); minute < Math.min(end, (day + 1) * 1440); minute++) {
      if (breakLength > 0 && minute >= breakStart && minute < breakStart + breakLength) continue;
      paid++;
      const local = minute % 1440;
      if (local < 300 || local >= 1320) night++;
    }
    return { date: day === 0 ? date : followingDate, shiftName: `${shift.name} ${shift.start}–${shift.end}${day === 1 ? " (+1 day)" : ""}`, hours: roundHours(paid), nightHours: roundHours(night) };
  });
  return segments.filter(segment => segment.hours > 0);
}

export function validatePolicy(policy: PayrollPolicy): string | null {
  if (!Number.isFinite(policy.hourlyDivisor) || policy.hourlyDivisor <= 0) return "Hourly divisor must be greater than zero.";
  if (!Number.isFinite(policy.nightPremium) || policy.nightPremium < 0.25) return "22:00–05:00 night premium must be at least 0.25.";
  if (!policy.shifts.length || !policy.holidayRates.length) return "Keep at least one shift and one holiday rate.";
  if (new Set(policy.shifts.map(s => s.id)).size !== policy.shifts.length || new Set(policy.holidayRates.map(r => r.id)).size !== policy.holidayRates.length) return "Duplicate policy IDs.";
  if ([policy.defaultHolidayRateId, ...policy.shifts.map(shift => shift.holidayRateId)].some(id => id && !policy.holidayRates.some(rate => rate.id === id))) return "Choose an available default holiday rate.";
  for (const shift of policy.shifts) {
    if (!shift.name.trim()) return "Every shift needs a name.";
    try {
      const segments = splitShift("2026-01-01", shift);
      const hours = segments.reduce((sum, s) => sum + s.hours, 0);
      const night = segments.reduce((sum, s) => sum + s.nightHours, 0);
      if (!hours) return "Each shift needs paid working hours.";
      if (![shift.allowance1Hours, shift.allowance2Hours].every(n => Number.isFinite(n) && n >= 0 && n <= hours)) return "Shift allowance hours must be between zero and paid hours.";
      if (shift.allowance1Hours + shift.allowance2Hours > hours) return "Combined shift allowance hours cannot exceed paid hours.";
      if (shift.allowance1Hours * 0.25 + shift.allowance2Hours * 0.30 + 0.0001 < night * policy.nightPremium) return "Regular shift allowances must cover the 22:00–05:00 premium. Check allowance hours.";
    } catch (error) { return (error as Error).message; }
  }
  for (const rate of policy.holidayRates) {
    if (!rate.name.trim() || !Number.isFinite(rate.multiplier) || rate.multiplier < (rate.statutory ? 1.35 : rate.includedInBase ? 0 : 1)) return "Use at least 1.35 for statutory holidays, or 1.00 for other paid work (0 only for regular work already paid in base salary).";
  }
  return null;
}

export function validateHolidayEntries(entries: HolidayWorkEntry[], policy: PayrollPolicy, month?: string): string | null {
  for (const entry of entries) {
    try { nextDate(entry.date); } catch { return "Choose a valid date for every holiday row."; }
    // An overnight shift starting on month-end belongs to this payroll, including its next-day segment.
    const nextMonthDay = month ? nextDate(`${month}-${new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0).getDate()}`) : "";
    if (month && !entry.date.startsWith(`${month}-`) && entry.date !== nextMonthDay) return "Holiday date must be in the payroll month (or overnight continuation on the next day).";
    if (!Number.isFinite(entry.hours) || entry.hours <= 0 || entry.hours > 24 || !Number.isFinite(entry.nightHours) || entry.nightHours < 0 || entry.nightHours > Math.min(entry.hours, 7)) return "Check paid hours (0–24) and night hours (0–7, not more than paid hours).";
    if (!policy.holidayRates.some(rate => rate.id === entry.rateId)) return "Choose a rate for every holiday date, including the next day of night shifts.";
  }
  const dateTotals = new Map<string, number>();
  const nightTotals = new Map<string, number>();
  for (const entry of entries) dateTotals.set(entry.date, (dateTotals.get(entry.date) || 0) + entry.hours);
  for (const entry of entries) nightTotals.set(entry.date, (nightTotals.get(entry.date) || 0) + entry.nightHours);
  if ([...dateTotals.values()].some(hours => hours > 24)) return "Work entries exceed 24 hours on the same date; check duplicate shifts.";
  if ([...nightTotals.values()].some(hours => hours > 7)) return "Night hours exceed 7 on the same date; check duplicate shifts.";
  return null;
}

export function calculateHolidayPay(entries: HolidayWorkEntry[], policy: PayrollPolicy, hourlyRate: number) {
  let work = 0, night = 0, hours = 0, nightHours = 0;
  for (const entry of entries) {
    const rate = policy.holidayRates.find(r => r.id === entry.rateId);
    if (!rate || !Number.isFinite(entry.hours) || !Number.isFinite(entry.nightHours) || entry.hours < 0 || entry.nightHours < 0 || entry.nightHours > entry.hours) continue;
    work += hourlyRate * rate.multiplier * entry.hours;
    night += hourlyRate * policy.nightPremium * entry.nightHours;
    hours += entry.hours;
    nightHours += entry.nightHours;
  }
  return { work: Math.round(work), night: Math.round(night), hours, nightHours };
}
