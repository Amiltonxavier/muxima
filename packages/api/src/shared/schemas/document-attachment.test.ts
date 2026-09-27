import { describe, expect, it } from "vitest";

import {
	ACCEPTED_DOCUMENT_FORMATS,
	ACCEPTED_DOCUMENT_MIME_TYPES,
	documentMimeTypeSchema,
	documentUrlSchema,
	resolveDocumentFormat,
} from "./document-attachment";

/** Narrows away the `null` returned when there is no URL to inspect. */
function formatOf(
	url: string | null | undefined,
	mimeType?: string,
): Exclude<ReturnType<typeof resolveDocumentFormat>, null> {
	const result = resolveDocumentFormat(url, mimeType);
	if (result === null)
		throw new Error("esperava um formato para um URL válido");
	return result;
}

describe("resolveDocumentFormat", () => {
	it("accepts every advertised format by URL", () => {
		for (const format of ACCEPTED_DOCUMENT_FORMATS) {
			const result = formatOf(`https://muxima.ao/docs/contract.${format}`);

			expect(result.ok, format).toBe(true);
		}
	});

	it("returns the matching mime type for a url", () => {
		const result = formatOf("https://muxima.ao/a/receipt.pdf");

		expect(result).toEqual({
			ok: true,
			extension: "pdf",
			mimeType: "application/pdf",
		});
	});

	it("resolves the mime type from the url when none is declared", () => {
		const result = formatOf("https://muxima.ao/a/photo.png");

		expect(result.ok && result.mimeType).toBe("image/png");
	});

	it("refuses a format outside the accepted list", () => {
		const result = formatOf("https://muxima.ao/a/plan.exe");

		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.message).toMatch(/aceites/i);
	});

	it("refuses a url with no extension", () => {
		const result = formatOf("https://muxima.ao/a/download");

		expect(result.ok).toBe(false);
	});

	it("refuses a declared mime type that contradicts the extension", () => {
		const result = formatOf("https://muxima.ao/a/receipt.pdf", "image/png");

		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.message).toMatch(/corresponde/i);
	});

	it("refuses a declared mime type outside the accepted list", () => {
		const result = formatOf("https://muxima.ao/a/doc.zip", "application/zip");

		expect(result.ok).toBe(false);
	});

	it("is case insensitive on the extension", () => {
		const result = formatOf("https://muxima.ao/a/RECEIPT.PDF");

		expect(result.ok && result.mimeType).toBe("application/pdf");
	});

	it("ignores a query string when reading the extension", () => {
		const result = formatOf("https://muxima.ao/a/file.pdf?token=abc");

		expect(result.ok && result.mimeType).toBe("application/pdf");
	});

	it("returns nothing when there is no url to inspect", () => {
		expect(resolveDocumentFormat(undefined)).toBeNull();
		expect(resolveDocumentFormat(null)).toBeNull();
		expect(resolveDocumentFormat("")).toBeNull();
	});
});

describe("documentUrlSchema", () => {
	it("rejects a non http(s) url", () => {
		expect(documentUrlSchema.safeParse("file:///etc/passwd").success).toBe(
			false,
		);
		expect(documentUrlSchema.safeParse("javascript:alert(1)").success).toBe(
			false,
		);
	});

	it("rejects a non url string", () => {
		expect(documentUrlSchema.safeParse("receipt.pdf").success).toBe(false);
	});
});

describe("documentMimeTypeSchema", () => {
	it("only admits the accepted mime types", () => {
		for (const mime of ACCEPTED_DOCUMENT_MIME_TYPES) {
			expect(documentMimeTypeSchema.safeParse(mime).success, mime).toBe(true);
		}
		expect(documentMimeTypeSchema.safeParse("application/zip").success).toBe(
			false,
		);
	});
});
