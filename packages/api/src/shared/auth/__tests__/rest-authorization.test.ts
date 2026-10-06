import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Structural guard against the "second policy" coming back.
 *
 * The REST modules used to carry their own authorization: a hand-rolled
 * `["OWNER", "ADMIN"].includes(requester.role)` in the members service, and a
 * permission-less `requireEventMutable()` in guests/inventory/tasks. Both were
 * real holes rather than duplicated-but-equivalent code — the hand-rolled one
 * never checked `EventMember.status`, so a `PENDING` membership passed it, and
 * the other let a `VIEWER` write through REST while the same call through oRPC
 * returned 403.
 *
 * These are source-level assertions, not behavioural ones, because the REST
 * suite has no harness: an oRPC-only test suite cannot catch a Fastify route
 * that forgot to ask. The rules below are deliberately narrow — they name the
 * exact shapes that caused the holes rather than trying to judge whether a
 * route is authorized, which only a runtime check can do.
 */

const MODULES_DIR = join(process.cwd(), "src/modules");

function sourceFiles(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) return sourceFiles(full);
		return entry.name.endsWith(".ts") ? [full] : [];
	});
}

const routesFiles = sourceFiles(MODULES_DIR).filter((f) =>
	f.endsWith("/routes.ts"),
);
const serviceFiles = sourceFiles(MODULES_DIR).filter((f) =>
	f.endsWith("/service.ts"),
);

/**
 * Code with the comments removed.
 *
 * Documentation is allowed to quote the anti-pattern — several files explain
 * why they no longer do it — so matching raw text would fail on prose.
 */
function code(file: string): string {
	return readFileSync(file, "utf8")
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("REST authorization stays in the shared guards", () => {
	it("finds the REST route modules (so the rules below are not vacuous)", () => {
		expect(routesFiles.length).toBeGreaterThan(5);
	});

	it("never uses the permission-less event guards in a route", () => {
		// `requireEventAccess` / `requireEventMutable` check membership and the
		// event lock, but NOT the capability. A route that calls them has no
		// permission check at all — every role in the event passes.
		const offenders = routesFiles.filter((file) =>
			/\brequireEvent(?:Access|Mutable)\s*\(/.test(code(file)),
		);

		expect(offenders.map((f) => f.replace(process.cwd(), ""))).toEqual([]);
	});

	it("never hand-rolls a role check in a module service", () => {
		// These literal comparisons are the signature of the members service:
		// readable, plausible, and blind to membership status. The shared guard
		// reads the ACTIVE membership and the RolePermission rows instead.
		const roleComparison =
			/\["OWNER",\s*"ADMIN"\]|role\s*!==?\s*"OWNER"|role\s*==?\s*"OWNER"/;

		const offenders = serviceFiles.filter((file) =>
			roleComparison.test(code(file)),
		);

		expect(offenders.map((f) => f.replace(process.cwd(), ""))).toEqual([]);
	});
});
