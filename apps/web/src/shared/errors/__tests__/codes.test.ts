import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const API_CODES_FILE = resolve(
	import.meta.dirname,
	"../../../../../../packages/api/src/shared/errors/codes.ts",
);
const WEB_CODES_FILE = resolve(import.meta.dirname, "../codes.ts");

/**
 * The browser copy cannot import the API source at runtime, so the two lists are
 * duplicated. This test is the guard against drift: a code added to the API must
 * be added here too, otherwise the frontend stops recognising it.
 */
function readCodeEntries(file: string) {
	const source = readFileSync(file, "utf8");
	const entries = [...source.matchAll(/([A-Z0-9_]+):\s*"([A-Z0-9_]+)"/g)].map(
		([, key, value]) => `${key}=${value}`,
	);
	return new Set(entries);
}

describe("ERROR_CODES mirror", () => {
	const api = readCodeEntries(API_CODES_FILE);
	const web = readCodeEntries(WEB_CODES_FILE);

	it("declares at least the generic transport codes", () => {
		expect(web.size).toBeGreaterThan(10);
	});

	it("contains every code the API publishes", () => {
		const missing = [...api].filter((entry) => !web.has(entry));
		expect(missing).toEqual([]);
	});

	it("does not invent codes the API does not publish", () => {
		const extra = [...web].filter((entry) => !api.has(entry));
		expect(extra).toEqual([]);
	});
});
