/**
 * Validators and normalizers for person/company identifiers, shared by the
 * API (definitive validation) and the web inputs (instant feedback).
 *
 * Intentionally dependency-free — no zod, no Prisma, no Fastify — so both sides
 * bundle it and the rules can never drift between frontend and backend.
 */

/** IBAN lengths by country prefix (ISO 13616). */
const IBAN_LENGTHS: Record<string, number> = {
	AO: 25,
	PT: 25,
	MZ: 25,
	ST: 25,
};

const IBAN_PATTERN = /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/;

/** Strips separators and uppercases, so `AO06 ...` and `ao-06` both clean up. */
export function normalizeIban(value: string): string {
	return value.replace(/[\s-]/g, "").toUpperCase();
}

/**
 * Structural IBAN validation: country known to Muxima, correct total length
 * and the ISO 13616 character layout. Check digits are validated mod-97 by
 * the API layer where the check matters; this keeps the shared module pure
 * and cheap for the web.
 */
export function validateIban(value: string): string | null {
	const iban = normalizeIban(value);
	if (!iban) return null;

	const country = iban.slice(0, 2);
	const expectedLength = IBAN_LENGTHS[country];

	if (!expectedLength) {
		return `País não suportado (${country}). Use um IBAN de Angola ou Portugal.`;
	}
	if (iban.length !== expectedLength) {
		return `O IBAN de ${country} deve ter ${expectedLength} caracteres.`;
	}
	if (!IBAN_PATTERN.test(iban)) {
		return "Formato de IBAN inválido.";
	}
	return null;
}

/** Mod-97 check, per ISO 7064. Exported so the API can enforce it too. */
export function hasValidIbanChecksum(value: string): boolean {
	const iban = normalizeIban(value);
	if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(iban)) return false;

	const rearranged = iban.slice(4) + iban.slice(0, 4);
	let remainder = 0;
	for (const char of rearranged) {
		const code = char.charCodeAt(0);
		const value = code >= 65 ? code - 55 : Number(char);
		if (Number.isNaN(value)) return false;
		remainder = (remainder * 10 + value) % 97;
	}
	return remainder === 1;
}

/** Pretty-prints an IBAN in groups of 4 for display and while typing. */
export function formatIban(value: string): string {
	const clean = normalizeIban(value);
	return clean.replace(/(.{4})/g, "$1 ").trim();
}

/** Strips everything but digits and `+`, so pasted numbers survive. */
export function normalizePhone(value: string): string {
	return value.replace(/[^\d+]/g, "");
}

/**
 * Angola phone rule: `+244` followed by 9 digits starting with 9 (mobile).
 * Accepts the local form (9XXXXXXXX) and normalizes to the international one.
 */
export const ANGOLA_PHONE_PATTERN = /^(?:\+244)?9\d{8}$/;

export function validateAngolaPhone(value: string): string | null {
	const phone = normalizePhone(value);
	if (!phone) return null;
	if (!ANGOLA_PHONE_PATTERN.test(phone)) {
		return "Use um número de Angola: +244 9XX XXX XXX (9 dígitos após +244).";
	}
	return null;
}

/** Normalizes to the stored canonical form: `+2449XXXXXXXX`. */
export function normalizeAngolaPhone(value: string): string {
	const phone = normalizePhone(value);
	if (!phone) return "";
	if (phone.startsWith("+244")) return phone;
	if (phone.startsWith("244")) return `+${phone}`;
	return `+244${phone}`;
}

/**
 * NIF Angola: 9 digits (legacy) or `AAAA1111LAA1111` (14 chars, current).
 * Optional by product decision; validated only when filled.
 */
const NIF_PATTERNS = [/^\d{9}$/, /^[0-9]{9}[A-Z]{2}[0-9]{3}$/];

export function validateNif(value: string): string | null {
	const nif = value.replace(/\s/g, "").toUpperCase();
	if (!nif) return null;
	if (!NIF_PATTERNS.some((pattern) => pattern.test(nif))) {
		return "NIF inválido. Use 9 dígitos ou o formato completo (14 caracteres).";
	}
	return null;
}
