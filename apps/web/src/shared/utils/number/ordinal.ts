/** Ordinal em pt. @example ordinal(3) // "3.º" */
export function ordinal(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "";
  return `${Math.trunc(value)}.º`;
}
