import { StringHelper } from "./string-helper";

/**
 * Converte texto em slug (URL/ID amigável).
 *
 * @example
 * slugify("Relatório de Vendas — 2026"); // "relatorio-de-vendas-2026"
 */
export function slugify(value: string): string {
	return StringHelper.slug(value).replace(/-+/g, "-").replace(/^-|-$/g, "");
}
