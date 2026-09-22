/**
 * Suma de valores, ignorando entradas não numéricas.
 * @example sum([1, 2, 3, null, "4"]) // 10
 */
export function sum(values: readonly (number | string | null | undefined)[]): number {
  let total = 0;
  for (const v of values) {
    const n = typeof v === "string" ? Number(v) : v;
    if (typeof n === "number" && !Number.isNaN(n)) total += n;
  }
  return total;
}

/** Média dos valores numéricos; 0 quando vazio. @example average([2, 4, 6]) // 4 */
export function average(values: readonly (number | string | null | undefined)[]): number {
  const nums = values.filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
  if (nums.length === 0) return 0;
  return sum(nums) / nums.length;
}

/** Soma extraída de um campo. @example sumBy(items, (i) => i.price) */
export function sumBy<T>(items: readonly T[], getter: (item: T) => number): number {
  return items.reduce((acc, item) => acc + (Number(getter(item)) || 0), 0);
}
