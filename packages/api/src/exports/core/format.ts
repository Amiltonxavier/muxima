/**
 * Value formatting shared by the PDF and the XLSX layouts.
 *
 * Money, dates and percentages are rendered here once so the two formats can
 * never disagree, and so no report module formats values by hand.
 */

const MONTHS_SHORT = [
	"Jan",
	"Fev",
	"Mar",
	"Abr",
	"Mai",
	"Jun",
	"Jul",
	"Ago",
	"Set",
	"Out",
	"Nov",
	"Dez",
] as const;

const CURRENCY_SYMBOLS: Record<string, string> = {
	AOA: "Kz",
	AKZ: "Kz",
};

function pad(value: number): string {
	return value.toString().padStart(2, "0");
}

/** `01/10/2026` */
export function formatDate(value: Date | null | undefined): string {
	if (!value) return "—";
	return `${pad(value.getDate())}/${pad(value.getMonth() + 1)}/${value.getFullYear()}`;
}

/** `01/10/2026 09:15` */
export function formatDateTime(value: Date | null | undefined): string {
	if (!value) return "—";
	return `${formatDate(value)} ${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

/** `01 Out 2026` — editorial style, used in titles and cover metadata. */
export function formatLongDate(value: Date | null | undefined): string {
	if (!value) return "—";
	const month = MONTHS_SHORT[value.getMonth()] ?? "";
	return `${pad(value.getDate())} ${month.trim()} ${value.getFullYear()}`;
}

/** `HH:mm` from an ISO string column or a Date. */
export function formatTime(value: string | Date | null | undefined): string {
	if (!value) return "—";
	if (typeof value === "string") {
		const match = /^(\d{2}):(\d{2})/.exec(value);
		return match?.[1] ? `${match[1]}:${match[2]}` : value;
	}
	return `${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

/**
 * `1 250 000,00 Kz` — thin-space thousands and comma decimals, the pt-PT/AO
 * convention. Grouping is done manually instead of via `toLocaleString` so the
 * result never depends on the server locale.
 */
export function formatMoney(
	value: number | null | undefined,
	currency = "AOA",
): string {
	if (value === null || value === undefined || Number.isNaN(value)) return "—";
	const symbol =
		CURRENCY_SYMBOLS[currency.toUpperCase()] ?? currency.toUpperCase();
	const negative = value < 0;
	const absolute = Math.abs(value);
	const fixed = absolute.toFixed(2);
	const [whole = "0", fraction = "00"] = fixed.split(".");
	const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f");
	return `${negative ? "-" : ""}${grouped},${fraction} ${symbol}`;
}

/** `1 250` — integer grouping, no decimals. */
export function formatNumber(value: number | null | undefined): string {
	if (value === null || value === undefined || Number.isNaN(value)) return "—";
	const negative = value < 0;
	const whole = Math.abs(Math.round(value))
		.toString()
		.replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f");
	return `${negative ? "-" : ""}${whole}`;
}

/** `42%`. */
export function formatPercent(value: number | null | undefined): string {
	if (value === null || value === undefined || Number.isNaN(value)) return "—";
	return `${formatNumber(value)}%`;
}

/** Any cell value as display text. */
export function formatText(
	value: string | number | boolean | Date | null | undefined,
): string {
	if (value === null || value === undefined || value === "") return "—";
	if (value instanceof Date) return formatDate(value);
	if (typeof value === "boolean") return value ? "Sim" : "Não";
	return String(value);
}

/** Collapses whitespace and strips control characters that break PDF layout. */
export function sanitizeText(value: string): string {
	return (
		value
			// biome-ignore lint/suspicious/noControlCharactersInRegex: removing control characters is the intent
			.replace(/[\u0000-\u001f\u007f]+/g, " ")
			.replace(/\s+/g, " ")
			.trim()
	);
}
