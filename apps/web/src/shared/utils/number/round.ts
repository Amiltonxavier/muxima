/** Arredonda para `precision` casas. @example round(1.2345, 2) // 1.23 */
export function round(value: number, precision = 0): number {
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
