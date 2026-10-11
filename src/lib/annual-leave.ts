/** Legacy unversioned allowances were the active allowances when this feature shipped.
 * A fixed baseline (never new Date().getFullYear()) stops them returning every January.
 * No existing employee or payroll document is rewritten just by opening the app.
 */
export const LEGACY_LEAVE_YEAR = 2026;
export interface AnnualLeaveEmployee {
  totalPaidLeave?: number;
  annualLeaveByYear?: Record<string, number>;
  annualLeaveLegacyYear?: number;
  createdAt?: { toDate?: () => Date; seconds?: number };
}
export function validLeaveYear(year: number): boolean { return Number.isInteger(year) && year >= 1900 && year <= 9999; }
export function validLeaveDays(days: number): boolean { return Number.isFinite(days) && days >= 0 && days <= 366; }
export function legacyLeaveYear(employee: AnnualLeaveEmployee): number {
  if (validLeaveYear(employee.annualLeaveLegacyYear ?? 0)) return employee.annualLeaveLegacyYear!;
  // Old app versions may still provision employees after the migration baseline.
  const created = employee.createdAt?.toDate?.() ?? (typeof employee.createdAt?.seconds === "number" ? new Date(employee.createdAt.seconds * 1000) : null);
  return Math.max(LEGACY_LEAVE_YEAR, created && Number.isFinite(created.getTime()) ? created.getFullYear() : LEGACY_LEAVE_YEAR);
}
export function leaveForYear(employee: AnnualLeaveEmployee | null | undefined, year: number) {
  if (!employee || !validLeaveYear(year)) return { year, total: 0, assigned: false };
  const allowance = employee.annualLeaveByYear?.[String(year)];
  if (typeof allowance === "number" && validLeaveDays(allowance)) return { year, total: allowance, assigned: true };
  if (year === legacyLeaveYear(employee) && typeof employee.totalPaidLeave === "number" && validLeaveDays(employee.totalPaidLeave)) return { year, total: employee.totalPaidLeave, assigned: true };
  return { year, total: 0, assigned: false };
}
export function recordYear(record: { payPeriodStartDate?: string; month?: string }): number {
  const period = record.payPeriodStartDate || record.month || "";
  return /^\d{4}-\d{2}(?:-\d{2})?$/.test(period) ? Number(period.slice(0, 4)) : 0;
}
export function usedLeaveForYear(records: readonly any[], employeeId: string, year: number, excludedId?: string | null): number {
  return records.filter(record => record.employeeId === employeeId && record.id !== excludedId && recordYear(record) === year)
    .reduce((sum, record) => {
      const days = Number(record.paidLeaveDays ?? record.japanData?.paidLeaveDays ?? 0);
      return sum + (validLeaveDays(days) ? days : 0);
    }, 0);
}
export function payrollLeaveTotal(employee: AnnualLeaveEmployee | undefined, year: number, editing: any, used: number): number {
  // A saved payroll's entitlement is a historical snapshot, not next year's allowance.
  if (editing && recordYear(editing) === year) {
    if (editing.leaveEntitlement?.year === year && validLeaveDays(editing.leaveEntitlement.total)) return editing.leaveEntitlement.total;
    const entitlement = leaveForYear(employee, year);
    if (entitlement.assigned) return entitlement.total;
    // Legacy history has no entitlement snapshot. Preserve its recorded remaining balance.
    return Math.max(0, Number(editing.japanData?.remainingPaidLeave) || 0) + Math.max(0, Number(editing.paidLeaveDays ?? editing.japanData?.paidLeaveDays) || 0) + used;
  }
  return leaveForYear(employee, year).total;
}
export function completedServiceYears(hireDate: string, year: number): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(hireDate);
  if (!match) return 0;
  // Service as of the start of the chosen allowance year, not a guessed entitlement.
  return Math.max(0, year - Number(match[1]) - (match[2] === "01" && match[3] === "01" ? 0 : 1));
}
export function nextYearCheckDelay(now: Date): number {
  return Math.max(50, Math.min(24 * 60 * 60 * 1000, new Date(now.getFullYear() + 1, 0, 1).getTime() - now.getTime() + 50));
}
