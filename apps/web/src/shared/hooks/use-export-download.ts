import { env } from "@muxima/env/web";
import { useMutation } from "@tanstack/react-query";
import { handleApiError, parseApiError } from "@/shared/errors";

/**
 * Download hooks for the export endpoints.
 *
 * Exports are plain REST routes, not oRPC procedures, because they answer with
 * a binary attachment instead of JSON. So this hook talks to the server with
 * `fetch` directly — it never builds a file, a table or a total in the browser.
 * The document, its numbers and its name all come from the API.
 */

export const EXPORT_MODULES = [
	"event",
	"guests",
	"budget",
	"schedule",
	"inventory",
	"suppliers",
	"tasks",
	"checklist",
	"food-plan",
	"invitations",
] as const;

export type ExportModule = (typeof EXPORT_MODULES)[number];
export type ExportFormat = "pdf" | "xlsx";

function serverOrigin() {
	const url = env.VITE_SERVER_URL;
	return url.endsWith("/") ? url.slice(0, -1) : url;
}

/**
 * Reads the server-suggested filename from `Content-Disposition`.
 *
 * The API sends both `filename` (ASCII fallback) and `filename*` (RFC 5987).
 * Preferring the encoded form keeps accents intact in the saved file, but the
 * browser never invents a name: if the header is missing or unparsable we fall
 * back to a generic one rather than guessing.
 */
function filenameFromDisposition(header: string | null, fallback: string) {
	if (!header) return fallback;

	const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header);
	if (encoded?.[1]) {
		try {
			return decodeURIComponent(encoded[1]);
		} catch {
			// Malformed percent-encoding: fall through to the plain form.
		}
	}

	const plain = /filename="([^"]*)"|filename=([^;]+)/i.exec(header);
	const value = plain?.[1] ?? plain?.[2];
	return value?.trim() ? value.trim() : fallback;
}

/**
 * Saves a blob through an object URL.
 *
 * The anchor is removed in a `finally`, otherwise every export would leak a
 * revoked URL for as long as the page lives.
 */
function saveBlob(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	anchor.rel = "noopener";
	document.body.append(anchor);
	try {
		anchor.click();
	} finally {
		anchor.remove();
		URL.revokeObjectURL(url);
	}
}

/**
 * Turns a failed export response into the normalised API error, so the message
 * shown to the user comes from the same parser every other failure uses.
 */
async function toApiError(response: Response): Promise<Error> {
	let payload: unknown = null;
	try {
		payload = await response.json();
	} catch {
		// Not a JSON error body — the status still drives the message.
	}

	// A non-JSON body leaves nothing to read, so the status drives the message.
	const hasEnvelope =
		typeof payload === "object" &&
		payload !== null &&
		Object.keys(payload).length > 0;
	const info = parseApiError(
		hasEnvelope ? payload : { status: response.status },
	);
	const status = info.status ?? response.status;

	return Object.assign(new Error(info.message), {
		code: info.code,
		status,
	});
}

type DownloadOptions = {
	/** Keeps the button disabled while the server builds the document. */
	onSuccess?: () => void;
};

async function download(
	url: string,
	fallbackName: string,
	{ onSuccess }: DownloadOptions = {},
) {
	const response = await fetch(url, { credentials: "include" });

	if (!response.ok) {
		throw await toApiError(response);
	}

	saveBlob(
		await response.blob(),
		filenameFromDisposition(
			response.headers.get("Content-Disposition"),
			fallbackName,
		),
	);

	onSuccess?.();
}

/**
 * Exports one event module. `module` is sent as a path segment, so it is
 * URL-encoded here — the server still validates it against its own allowlist.
 */
export function useExportEventModule(options: DownloadOptions = {}) {
	return useMutation({
		mutationKey: ["export", "event-module"],
		mutationFn: ({
			eventId,
			module,
			format,
		}: {
			eventId: string;
			module: ExportModule;
			format: ExportFormat;
		}) =>
			download(
				`${serverOrigin()}/api/v1/events/${encodeURIComponent(eventId)}/exports/${encodeURIComponent(module)}/${encodeURIComponent(format)}`,
				`muxima-${module}.${format}`,
				options,
			),
	});
}

/** Exports a single dedication. Dedication pages are PDF only. */
export function useExportDedication(options: DownloadOptions = {}) {
	return useMutation({
		mutationKey: ["export", "dedication"],
		mutationFn: ({
			eventId,
			dedicationId,
		}: {
			eventId: string;
			dedicationId: string;
		}) =>
			download(
				`${serverOrigin()}/api/v1/events/${encodeURIComponent(eventId)}/dedications/${encodeURIComponent(dedicationId)}/export/pdf`,
				"muxima-dedicacao.pdf",
				options,
			),
	});
}

/**
 * Downloads the public invitation PDF. No session is required — the code is the
 * capability — but the request still sends cookies so a logged-in owner sees the
 * same document a guest does.
 */
export function useExportPublicInvitation(options: DownloadOptions = {}) {
	return useMutation({
		mutationKey: ["export", "invitation"],
		mutationFn: ({ code }: { code: string }) =>
			download(
				`${serverOrigin()}/api/public/invitations/${encodeURIComponent(code)}/export/pdf`,
				"muxima-convite.pdf",
				options,
			),
	});
}

/**
 * Turns any export failure into one toast through the shared handler, so the
 * wording is the same PT-PT message the rest of the app shows.
 */
export function toastExportError(error: unknown) {
	handleApiError(error, {
		fallbackMessage: "Não foi possível gerar o ficheiro.",
	});
}
