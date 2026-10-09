/** The frontend build version. Keep native manifests in sync (covered by payroll tests). */
export const APP_VERSION = "1.0.20";

export function isNewerVersion(latest: string, current: string): boolean {
  const parse = (value: string) => /^v?\d+\.\d+\.\d+$/.test(value.trim()) ? value.trim().replace(/^v/, "").split(".").map(Number) : null;
  const a = parse(latest), b = parse(current);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return false;
}
