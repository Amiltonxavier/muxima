/**
 * Normaliza texto para busca em pt: minúsculas, sem acentos, espaços colapsados.
 *
 * @example
 * normalizeSearch("João do Cacau"); // "joao do cacau"
 */
export function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}
