import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { EXPORT_MODULES } from "../use-export-download";

/**
 * The browser's export module list is a copy of the server's, because the API
 * package cannot be imported into the web bundle without pulling Prisma and the
 * whole server router along with it. A copy is only safe while something proves
 * it is still a copy.
 *
 * The drift was real, not hypothetical: the browser listed an `invitations`
 * module the server has no route for — every click 404'd — and omitted
 * `tables`, which the server does serve. Neither failed a typecheck, because
 * both sides typed their own list independently.
 */
const SERVER_REGISTRY = join(
	process.cwd(),
	"../../packages/api/src/exports/registry/export-registry.ts",
);

describe("export modules", () => {
	it("matches the server registry exactly", () => {
		const source = readFileSync(SERVER_REGISTRY, "utf8");
		const list = source.match(/EVENT_EXPORT_MODULES\s*=\s*\[([^\]]*)\]/)?.[1];

		expect(
			list,
			"EVENT_EXPORT_MODULES not found in the registry",
		).toBeDefined();

		const serverModules = (list as string)
			.split(",")
			.map((entry) => entry.trim().replace(/^["']|["']$/g, ""))
			.filter(Boolean)
			.sort();

		expect([...EXPORT_MODULES].sort()).toEqual(serverModules);
	});

	it("has a permission for every module the menu can ask for", () => {
		// A missing entry would be a runtime `undefined` reaching `useEventCan`,
		// which silently hides the menu instead of failing loudly.
		const menu = readFileSync(
			join(process.cwd(), "src/shared/components/export-menu.tsx"),
			"utf8",
		);
		const mapped = [...menu.matchAll(/^\t"?([a-z-]+)"?: PERMISSIONS\./gm)].map(
			(match) => match[1],
		);

		expect(mapped.sort()).toEqual([...EXPORT_MODULES].sort());
	});
});
