import { env } from "@muxima/env/server";
import QRCode from "qrcode";

/**
 * QR Code generation for guest invitations.
 *
 * The QR Code is **always** produced here (backend side) and persisted on
 * `GuestInvitation.qrCode`. The frontend only renders the stored SVG — it never
 * generates nor regenerates a QR Code.
 *
 * The encoded payload is the public invitation URL built from the opaque
 * invitation `code`, which is already a unique, non-sequential token. No
 * internal ids, guest names, emails or phone numbers are ever encoded.
 */

const DEFAULT_BASE_URL = "http://localhost:3001";

/** Public path where a guest opens their invitation. */
export const INVITATION_PUBLIC_PATH = "/invite";

/** Options used for every generated QR Code — kept in one place for consistency. */
const QR_DEFAULTS = {
	errorCorrectionLevel: "M" as const,
	margin: 1,
	width: 320,
	color: { dark: "#000000ff", light: "#00000000" },
};

function trimTrailingSlash(value: string): string {
	return value.replace(/\/+$/, "");
}

export function getPublicBaseUrl(): string {
	return trimTrailingSlash(
		env.FRONTEND_URL || env.CORS_ORIGIN || DEFAULT_BASE_URL,
	);
}

/**
 * Builds the public URL a guest scans. Only the token is exposed — never the
 * internal `GuestInvitation.id`.
 */
export function buildInvitationUrl(code: string, baseUrl?: string): string {
	const origin = trimTrailingSlash(baseUrl ?? getPublicBaseUrl());
	return `${origin}${INVITATION_PUBLIC_PATH}/${encodeURIComponent(code)}`;
}

/**
 * Generates the QR Code as an SVG string.
 *
 * SVG is used on purpose: it is ~10x smaller than an equivalent base64 PNG,
 * scales to any resolution without re-encoding, and can be inlined directly by
 * the frontend without a second network request.
 */
export async function generateInvitationQrCode(url: string): Promise<string> {
	return QRCode.toString(url, { type: "svg", ...QR_DEFAULTS });
}

/** URL + QR Code pair persisted together so both always stay in sync. */
export type InvitationQrPayload = {
	url: string;
	qrCode: string;
};

/**
 * Builds everything an invitation needs to be shareable: the public URL and
 * its QR Code. Called on creation and whenever an invitation has to be
 * (re)generated — never on render.
 */
export async function buildInvitationQrPayload(
	code: string,
	baseUrl?: string,
): Promise<InvitationQrPayload> {
	const url = buildInvitationUrl(code, baseUrl);
	return { url, qrCode: await generateInvitationQrCode(url) };
}
