/**
 * Calcula a percentagem de `value` em relação a `total`.
 *
 * @example
 * calcPercentage(50, 200); // "25.0"
 */
export function calcPercentage(
	value: number,
	total: number,
	decimals = 1,
): string {
	if (total <= 0) return "0.0";
	return ((value / total) * 100).toFixed(decimals);
}
