/** Limita um número a um intervalo. @example clamp(15, 0, 10) // 10 */
export function clamp(value: number, min: number, max: number): number {
  if (min > max) return clamp(value, max, min);
  return Math.min(Math.max(value, min), max);
}
