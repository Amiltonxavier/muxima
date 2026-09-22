import { round } from "./round";

/**
 * `toFixed` estável para valores de ponto flutuante.
 * @example toFixedSafe(0.1 + 0.2, 2) // "0.30" (evita "0.299999...")
 */
export function toFixedSafe(value: number, precision = 2): string {
  if (!Number.isFinite(value)) return "0";
  return round(value, precision).toFixed(precision);
}
