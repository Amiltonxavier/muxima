import { describe, expect, it } from "vitest";
import {
	formatIban,
	hasValidIbanChecksum,
	normalizeAngolaPhone,
	normalizeIban,
	validateAngolaPhone,
	validateIban,
	validateNif,
} from "./identifiers";

describe("validateIban", () => {
	// Angola IBAN: AO + 2 check digits + 21 chars (25 total). This specimen
	// passes mod-97 (computed per ISO 7064).
	const VALID_AO = "AO45006000012345678901234";

	it("accepts a valid Angola IBAN with separators", () => {
		expect(validateIban("AO45 0060 0001 2345 6789 0123 4")).toBeNull();
	});

	it("rejects unknown countries", () => {
		expect(validateIban("DE89370400440532013000")).toMatch(/n.o suportado/);
	});

	it("rejects wrong lengths", () => {
		expect(validateIban(VALID_AO.slice(0, 20))).toMatch(/25 caracteres/);
	});

	it("rejects malformed bodies", () => {
		expect(validateIban("AO06!!!!00001234567890123")).toMatch(/inv.lido/);
	});

	it("accepts Portuguese IBANs", () => {
		// PT has the same 25-char layout as AO in this app.
		expect(validateIban("PT50000201231234567890154")).toBeNull();
	});
});

describe("hasValidIbanChecksum", () => {
	it("accepts a checksum-valid IBAN", () => {
		expect(hasValidIbanChecksum("AO45006000012345678901234")).toBe(true);
	});

	it("rejects a wrong checksum", () => {
		expect(hasValidIbanChecksum("AO46006000012345678901234")).toBe(false);
	});
});

describe("formatIban / normalizeIban", () => {
	it("formats in groups of four", () => {
		expect(formatIban("AO45006000012345678901234")).toBe(
			"AO45 0060 0001 2345 6789 0123 4",
		);
	});

	it("normalizes lowercase and dashes", () => {
		expect(normalizeIban("ao45-0060-0001")).toBe("AO4500600001");
	});
});

describe("validateAngolaPhone", () => {
	it("accepts +244 mobile numbers", () => {
		expect(validateAngolaPhone("+244923456789")).toBeNull();
		expect(validateAngolaPhone("923 456 789")).toBeNull();
	});

	it("rejects landlines and short numbers", () => {
		expect(validateAngolaPhone("+244226123456")).toMatch(/9XX/);
		expect(validateAngolaPhone("92345678")).toMatch(/9XX/);
	});
});

describe("normalizeAngolaPhone", () => {
	it("normalizes to +244 canonical form", () => {
		expect(normalizeAngolaPhone("923456789")).toBe("+244923456789");
		expect(normalizeAngolaPhone("244923456789")).toBe("+244923456789");
		expect(normalizeAngolaPhone("+244 923 456 789")).toBe("+244923456789");
	});
});

describe("validateNif", () => {
	it("accepts legacy 9-digit NIFs", () => {
		expect(validateNif("541709150")).toBeNull();
	});

	it("accepts spaced input", () => {
		expect(validateNif(" 541709150 ")).toBeNull();
	});

	it("rejects malformed NIFs", () => {
		expect(validateNif("12345")).toMatch(/inv.lido/);
		expect(validateNif("ABCDE")).toMatch(/inv.lido/);
	});

	it("accepts empty as optional", () => {
		expect(validateNif("")).toBeNull();
	});
});
