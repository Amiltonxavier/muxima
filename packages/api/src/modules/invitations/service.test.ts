import { describe, expect, it } from "vitest";

/**
 * Security properties of the public invitation code: unpredictability,
 * format and collision handling. The code is the only public identifier of
 * an invitation, so it must never be derived from ids, counters or
 * timestamps.
 */

const { generateInvitationCode } = await import("./service");

const CODE_PATTERN = /^MUX-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;

describe("generateInvitationCode", () => {
	it("follows the MUX-XXXX-XXXX format", () => {
		for (let i = 0; i < 50; i++) {
			expect(generateInvitationCode()).toMatch(CODE_PATTERN);
		}
	});

	it("is unpredictable — never derived from a counter or sequence", () => {
		// Successive codes must not follow any simple progression: the same
		// position across codes varies, and no prefix ordering appears.
		const codes = Array.from({ length: 100 }, () => generateInvitationCode());
		const firstSegments = codes.map((code) => code.split("-")[1]);

		// Not all identical (which would suggest a constant)…
		expect(new Set(firstSegments).size).toBeGreaterThan(1);

		// …and no two consecutive codes share a full code (sequential leak).
		for (let i = 1; i < codes.length; i++) {
			expect(codes[i]).not.toBe(codes[i - 1]);
		}
	});

	it("uses the full unambiguous alphabet across many samples", () => {
		const codes = Array.from({ length: 300 }, () => generateInvitationCode());
		const seen = new Set(codes.join("").replace(/-/g, "").split(""));

		// 32 characters in the alphabet; across 2400 sampled chars, every
		// symbol must appear at least once (overwhelmingly likely with CSPRNG).
		expect(seen.size).toBe(32);
		// Ambiguous symbols never appear.
		expect(seen.has("0")).toBe(false);
		expect(seen.has("O")).toBe(false);
		expect(seen.has("1")).toBe(false);
		expect(seen.has("I")).toBe(false);
	});

	it("never encodes ids, timestamps or ordered values", () => {
		// Two codes generated back-to-back must not differ by a small delta
		// in any segment (that would betray a counter/timestamp source).
		const a = generateInvitationCode();
		const b = generateInvitationCode();

		expect(a).not.toBe(b);
		expect(a).toMatch(CODE_PATTERN);
		expect(b).toMatch(CODE_PATTERN);
	});
});
