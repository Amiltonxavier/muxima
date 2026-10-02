import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DedicationDb } from "../repository";
import { DedicationService } from "../service";

/**
 * `getForExport` is the only read path with no side effects. These tests pin
 * both halves of that promise: the same authorization as `get`, and a database
 * that is never written to.
 */

const EVENT_ID = "event-1";
const DEDICATION_ID = "ded-1";
const OWNER_ID = "user-owner";
const VIEWER_ID = "user-viewer";
const STRANGER_ID = "user-stranger";
/** An active member who was never granted access to this dedication. */
const NO_GRANT_ID = "user-no-grant";

const DEDICATION = {
	id: DEDICATION_ID,
	eventId: EVENT_ID,
	ownerId: OWNER_ID,
	title: "Para os nossos pais",
	content: { type: "doc", content: [] },
	isLocked: false,
	createdAt: new Date(Date.UTC(2026, 0, 1)),
	updatedAt: new Date(Date.UTC(2026, 0, 2)),
	lastOpenedAt: new Date(Date.UTC(2026, 0, 3)),
	owner: { id: OWNER_ID, name: "Ana", email: "ana@example.com", image: null },
	viewers: [],
};

type FakeDb = DedicationDb & {
	__writes: string[];
};

function makeDb(options: {
	members?: string[];
	viewerGrants?: string[];
	dedication?: typeof DEDICATION | null;
}) {
	const members = options.members ?? [OWNER_ID, VIEWER_ID, NO_GRANT_ID];
	const grants = options.viewerGrants ?? [VIEWER_ID];
	const dedication =
		options.dedication === undefined ? DEDICATION : options.dedication;
	const writes: string[] = [];

	const db = {
		__writes: writes,
		eventMember: {
			findFirst: vi.fn(async ({ where }: { where: { userId: string } }) =>
				members.includes(where.userId)
					? {
							id: `m-${where.userId}`,
							userId: where.userId,
							role: "MEMBER",
							status: "ACTIVE",
						}
					: null,
			),
		},
		dedication: {
			findFirst: vi.fn(async () => dedication),
			update: vi.fn(async () => {
				writes.push("dedication.update");
				return DEDICATION;
			}),
		},
		dedicationViewer: {
			findFirst: vi.fn(
				async ({ where }: { where: { eventMember: { userId: string } } }) =>
					grants.includes(where.eventMember.userId)
						? {
								id: `g-${where.eventMember.userId}`,
								dedicationId: DEDICATION_ID,
								eventMemberId: "m-1",
							}
						: null,
			),
			update: vi.fn(async () => {
				writes.push("dedicationViewer.update");
				return {};
			}),
		},
		$transaction: vi.fn(async (fn: (tx: FakeDb) => unknown) => fn(db)),
		auditLog: {
			create: vi.fn(async () => {
				writes.push("auditLog.create");
				return {};
			}),
		},
	} as unknown as FakeDb;

	return db;
}

describe("DedicationService.getForExport", () => {
	let db: FakeDb;

	beforeEach(() => {
		db = makeDb({});
	});

	const params = (userId: string, eventId = EVENT_ID) => ({
		eventId,
		dedicationId: DEDICATION_ID,
		userId,
	});

	it("lets the owner export their own dedication", async () => {
		const detail = await DedicationService.getForExport(db, params(OWNER_ID));
		expect(detail.id).toBe(DEDICATION_ID);
		expect(detail.title).toBe("Para os nossos pais");
	});

	it("lets a granted viewer export it", async () => {
		await expect(
			DedicationService.getForExport(db, params(VIEWER_ID)),
		).resolves.toMatchObject({ id: DEDICATION_ID });
	});

	it("writes nothing: no lastOpenedAt, no viewer stamp, no audit entry", async () => {
		await DedicationService.getForExport(db, params(OWNER_ID));
		await DedicationService.getForExport(db, params(VIEWER_ID));
		expect(db.__writes).toEqual([]);
		expect(db.$transaction).not.toHaveBeenCalled();
	});

	it("never reports the viewer timestamp, unlike get", async () => {
		const detail = await DedicationService.getForExport(db, params(VIEWER_ID));
		expect(detail.viewerLastOpenedAt).toBeNull();
	});

	it("refuses an active member who was never granted access", async () => {
		await expect(
			DedicationService.getForExport(db, params(NO_GRANT_ID)),
		).rejects.toThrow(/permissão/i);
		expect(db.__writes).toEqual([]);
	});

	it("refuses a non-member before touching the dedication", async () => {
		const isolated = makeDb({ members: [OWNER_ID] });
		await expect(
			DedicationService.getForExport(isolated, params(STRANGER_ID)),
		).rejects.toThrow(/não tem acesso/i);
		expect(isolated.dedication.findFirst).not.toHaveBeenCalled();
	});

	it("keeps a locked dedication owner-only", async () => {
		const locked = makeDb({
			dedication: { ...DEDICATION, isLocked: true },
		});
		await expect(
			DedicationService.getForExport(locked, params(VIEWER_ID)),
		).rejects.toThrow(/privada/i);
	});

	it("scopes the lookup by event, so another event's id is a 404", async () => {
		const foreign = makeDb({ dedication: null });
		await expect(
			DedicationService.getForExport(foreign, params(OWNER_ID)),
		).rejects.toThrow(/não encontrada/i);
		expect(foreign.dedication.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: DEDICATION_ID, eventId: EVENT_ID },
			}),
		);
	});
});

describe("DedicationService.get", () => {
	it("does write, so the export path is meaningfully different", async () => {
		const db = makeDb({});
		await DedicationService.get(db, {
			eventId: EVENT_ID,
			dedicationId: DEDICATION_ID,
			userId: OWNER_ID,
		});
		expect(db.$transaction).toHaveBeenCalled();
	});
});
