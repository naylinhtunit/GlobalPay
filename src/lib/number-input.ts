/** Normalize padding only, retaining empty/decimal/negative values while editing. */
export function normalizeNumberInput(value: string): string {
  return value.replace(/^(-?)0+(?=\d)/, "$1");
}
