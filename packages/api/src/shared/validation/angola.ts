/**
 * Dados e regras de Angola, partilhados pela API (validação definitiva) e
 * pelo web (formulários). Intentionally dependency-free — sem zod, sem Prisma
 * — no mesmo espírito de `identifiers.ts`.
 */

/**
 * As 21 províncias actuais de Angola (pós-2024, incluindo Cuando, Cubango,
 * Icolo e Bengo e Moxico Leste).
 */
export const ANGOLA_PROVINCES = [
	"Bengo",
	"Benguela",
	"Bié",
	"Cabinda",
	"Cuando",
	"Cuanza Norte",
	"Cuanza Sul",
	"Cubango",
	"Cunene",
	"Huambo",
	"Huíla",
	"Icolo e Bengo",
	"Luanda",
	"Lunda Norte",
	"Lunda Sul",
	"Malanje",
	"Moxico",
	"Moxico Leste",
	"Namibe",
	"Uíge",
	"Zaire",
] as const;

export type AngolaProvince = (typeof ANGOLA_PROVINCES)[number];

/** Horário de parede "HH:mm" (00:00–23:59), como guardado no modelo Event. */
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Valida o formato "HH:mm". Devolve mensagem de erro ou `null` se válido. */
export function validateTimeString(value: string): string | null {
	if (!TIME_PATTERN.test(value)) {
		return "Formato de hora inválido. Use HH:mm.";
	}
	return null;
}
