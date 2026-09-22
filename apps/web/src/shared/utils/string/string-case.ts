import { StringHelper } from "./string-helper";
import { slugify } from "./slugify";

/** Capitaliza a primeira letra. @example capitalize("pedro") // "Pedro" */
export function capitalize(value: string): string {
  return StringHelper.capitalize(value);
}

/** Capitaliza cada palavra. @example titleCase("amílton xavier") // "Amílton Xavier" */
export function titleCase(value: string): string {
  return StringHelper.capitalizeWords(value);
}

/** Retorna as iniciais (default 2). @example initials("Amílton Xavier José") // "AX" */
export function initials(value: string, limit = 2): string {
  return StringHelper.initials(value, limit);
}

/** @example toKebabCase("Relatório Anual") // "relatorio-anual" */
export function toKebabCase(value: string): string {
  return slugify(value).replace(/_/g, "-");
}

/** @example toCamelCase("relatorio-anual") // "relatorioAnual" */
export function toCamelCase(value: string): string {
  return toPascalCase(value).replace(/^./, (c) => c.toLowerCase());
}

/** @example toPascalCase("relatorio-anual") // "RelatorioAnual" */
export function toPascalCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+(.)/g, (_, char: string) => char.toUpperCase())
    .replace(/^[a-z]/, (c) => c.toUpperCase());
}

/** @example toSnakeCase("Relatório Anual") // "relatorio_anual" */
export function toSnakeCase(value: string): string {
  return slugify(value).replace(/-/g, "_");
}
