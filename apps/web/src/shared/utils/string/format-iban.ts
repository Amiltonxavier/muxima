/**
 * Formata um IBAN (ou sequência de dígitos) em grupos de 4.
 *
 * @example
 * formatIBAN("00001234567890"); // "0000 1234 5678 90"
 */
export function formatIBAN(raw: string): string {
	const digits = raw.replace(/\s+/g, "");
	return digits.match(/.{1,4}/g)?.join(" ") ?? digits;
}
