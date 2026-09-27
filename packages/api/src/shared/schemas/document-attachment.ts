import { z } from "zod";

/**
 * Attachment rules for receipts, contracts and quotes.
 *
 * Only these formats are accepted, and the mime type must agree with the
 * extension so a renamed executable cannot be attached as a "PDF".
 */

export const ACCEPTED_DOCUMENT_FORMATS = [
	"pdf",
	"jpg",
	"jpeg",
	"png",
	"webp",
] as const;

export type AcceptedDocumentFormat = (typeof ACCEPTED_DOCUMENT_FORMATS)[number];

const MIME_BY_EXTENSION: Record<AcceptedDocumentFormat, string[]> = {
	pdf: ["application/pdf"],
	jpg: ["image/jpeg"],
	jpeg: ["image/jpeg"],
	png: ["image/png"],
	webp: ["image/webp"],
};

export const ACCEPTED_DOCUMENT_MIME_TYPES = [
	...new Set(Object.values(MIME_BY_EXTENSION).flat()),
].sort();

export const ACCEPTED_DOCUMENT_EXTENSIONS = ACCEPTED_DOCUMENT_FORMATS;

export type DocumentFormatResult =
	| { ok: true; extension: AcceptedDocumentFormat; mimeType: string }
	| { ok: false; message: string };

/**
 * Resolves the format of an attachment from its URL, accepting an optional
 * declared mime type that must be consistent with the extension.
 *
 * Returns `null` when there is no URL to inspect, so callers do not have to
 * guard the call themselves.
 */
export function resolveDocumentFormat(
	url: string | null | undefined,
	declaredMimeType?: string,
): DocumentFormatResult | null {
	if (!url) return null;

	let pathname: string;
	try {
		pathname = new URL(url).pathname;
	} catch {
		return { ok: false, message: "URL do comprovativo inválido." };
	}

	// Strip the query string and any fragment before reading the extension.
	const withoutQuery = pathname.split(/[?#]/)[0] ?? "";
	const extension = withoutQuery.split(".").pop()?.toLowerCase() ?? "";

	if (
		!ACCEPTED_DOCUMENT_FORMATS.includes(extension as AcceptedDocumentFormat)
	) {
		return {
			ok: false,
			message: `Formato não suportado. Aceites: ${ACCEPTED_DOCUMENT_FORMATS.map((f) => f.toUpperCase()).join(", ")}.`,
		};
	}

	const format = extension as AcceptedDocumentFormat;
	const allowedMimes = MIME_BY_EXTENSION[format];

	if (declaredMimeType && !allowedMimes.includes(declaredMimeType)) {
		return {
			ok: false,
			message: `O tipo de ficheiro declarado (${declaredMimeType}) não corresponde a um ficheiro ${format.toUpperCase()}.`,
		};
	}

	return { ok: true, extension: format, mimeType: allowedMimes[0] as string };
}

export const documentUrlSchema = z
	.string()
	.trim()
	.min(1)
	.refine((url) => {
		const result = resolveDocumentFormat(url);
		return result?.ok === true;
	}, "Formato de ficheiro não suportado. Aceites: PDF, JPG, JPEG, PNG, WEBP.");

export const documentMimeTypeSchema = z.enum([
	"application/pdf",
	"image/jpeg",
	"image/png",
	"image/webp",
]);
