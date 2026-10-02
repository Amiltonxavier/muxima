import { randomBytes } from "node:crypto";

/**
 * The single source of truth for export file names.
 *
 * Every report — private, public or individual — goes through
 * `createExportFileName`, so the naming rules exist in exactly one place and no
 * module can drift into `report.pdf` or collide with a concurrent download.
 *
 * Shape: `muxima-<evento>-<relatorio>-<YYYY-MM-DD-HHmmss>-<token>.<ext>`
 */

export type ExportFormat = "pdf" | "xlsx";

export type ExportFileNameInput = {
	/** Event name. Falls back to `evento` when absent/blank. */
	eventName?: string | null;
	/** Report name, e.g. "Relatório de Orçamento". */
	reportName: string;
	format: ExportFormat;
	/** Generation instant. Injected in tests to keep them deterministic. */
	date?: Date;
	/** Collision suffix. Injected in tests; random hex otherwise. */
	token?: string;
};

const FALLBACK_EVENT = "evento";
const FALLBACK_REPORT = "relatorio";
/** Conservative cap: leaves room for the prefix, timestamp, token and extension. */
const MAX_SLUG_LENGTH = 80;
const TOKEN_LENGTH = 4;

/**
 * Lowercase, accent-free, ASCII-only slug.
 *
 * `NFD` + combining-mark removal is what actually kills the accents
 * ("Casamento da Ana & João" → "casamento-da-ana-joao"); the explicit
 * character classes then drop everything that is still not filename-safe.
 */
export function slugify(value: string): string {
	return (
		value
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")
			// Ordinal indicators carry no NFD decomposition, so they are mapped by
			// hand: "nº 4" has to read as "no-4", not "n-4".
			.replace(/ª/g, "a")
			.replace(/º/g, "o")
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "")
			.replace(/-{2,}/g, "-")
			.slice(0, MAX_SLUG_LENGTH)
			.replace(/-+$/g, "")
	);
}

/** `YYYY-MM-DD-HHmmss` in UTC, so two servers never disagree on the name. */
function formatTimestamp(date: Date): string {
	const pad = (value: number, size = 2) => value.toString().padStart(size, "0");
	return [
		`${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`,
		`${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`,
	].join("-");
}

/** Cryptographically random suffix — short enough to stay readable. */
function createToken(): string {
	return randomBytes(3).toString("hex").slice(0, TOKEN_LENGTH);
}

export function createExportFileName(input: ExportFileNameInput): string {
	const event = slugify(input.eventName ?? "") || FALLBACK_EVENT;
	const report = slugify(input.reportName ?? "") || FALLBACK_REPORT;
	const timestamp = formatTimestamp(input.date ?? new Date());
	const token = input.token ?? createToken();
	const extension = input.format;

	return `muxima-${event}-${report}-${timestamp}-${token}.${extension}`;
}

/**
 * Same name, ASCII-safe, for the `filename` parameter of `Content-Disposition`.
 * Already guaranteed by the slug, but kept explicit so the header builder never
 * has to think about encoding.
 */
export function toAsciiFileName(fileName: string): string {
	return fileName.replace(/[^\x20-\x7e]/g, "");
}
