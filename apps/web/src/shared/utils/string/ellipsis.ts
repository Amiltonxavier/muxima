/**
 * Trunca um texto com reticências se exceder o limite.
 *
 * @example
 * ellipsis("texto muito longo", 10); // "texto mui..."
 */
export function ellipsis(value: string, maxLength = 20): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(1, maxLength - 1)).trimEnd()}...`;
}
