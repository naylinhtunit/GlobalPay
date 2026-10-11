export const COMPANY_NAME_MAX_LENGTH = 120;
export function normalizeCompanyName(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
export function payslipCompanyName(record: { companyName?: unknown } | null | undefined, currentName: string): string {
  // New payslips preserve the issuer at payment time; legacy slips use the account profile.
  return normalizeCompanyName(record?.companyName) || normalizeCompanyName(currentName);
}
