import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The guard that must never be skipped.
 *
 * `getEventIdForResource` is nullable, and the natural way to write a handler
 * around it is:
 *
 *     const eventId = await getEventIdForResource("guest", id);
 *     if (eventId) await requireEventPermissionMutable(...);
 *
 * That `if` is a bypass, not a convenience: when the row is missing the check
 * is skipped and the handler continues UNAUTHENTICATED. Every one of those
 * handlers passes today only because the write that follows happens to fail
 * with P2025 — a missing accident, not a design.
 *
 * `requireEventIdForResource` removes the nullable step: no `if`, nothing to
 * forget. These tests pin that property, because the regression is silent —
 * the handler still "works" for authorized callers, so nothing else notices.
 */

const guestRows: {
	id: string;
	eventId: string | null;
}[] = [];

const eventMembers: { userId: string; eventId: string }[] = [];

vi.mock("@muxima/db", () => ({
	createPrismaClient: () => ({}) as never,
	default: {
		guest: {
			findUnique: (args: { where: { id: string } }) =>
				Promise.resolve(guestRows.find((g) => g.id === args.where.id) ?? null),
		},
		eventMember: {
			findFirst: (args: { where: Record<string, unknown> }) => {
				const where = args.where as { userId: string; eventId: string };
				return Promise.resolve(
					eventMembers.find(
						(m) => m.userId === where.userId && m.eventId === where.eventId,
					) ?? null,
				);
			},
		},
		user: {
			findUnique: () => Promise.resolve({ status: "ACTIVE" }),
		},
	},
}));

vi.mock("@muxima/db/activity-log", () => ({
	createActivityLog: vi.fn(),
	buildChanges: () => [],
}));

const { requireEventIdForResource } = await import("../authorization");

beforeEach(() => {
	guestRows.length = 0;
	eventMembers.length = 0;
	guestRows.push({ id: "gst_1", eventId: "evt_1" });
	eventMembers.push({ userId: "usr_1", eventId: "evt_1" });
});

describe("requireEventIdForResource", () => {
	it("returns the owning event id for an existing row", async () => {
		await expect(requireEventIdForResource("guest", "gst_1")).resolves.toBe(
			"evt_1",
		);
	});

	it("throws NOT_FOUND instead of returning null for a missing row", async () => {
		// The contract that makes the bypass unrepresentable: a caller cannot
		// receive a falsy value and be tempted to guard on it.
		await expect(
			requireEventIdForResource("guest", "gst_missing"),
		).rejects.toMatchObject({ statusCode: 404 });
	});

	it("does not fall through to the permission check for a missing row", async () => {
		let rejectedWith: unknown;

		try {
			const eventId = await requireEventIdForResource("guest", "gst_missing");
			// What the old `if (eventId)` shape would have done: carry on with
			// no event, and therefore no authorization, into the write.
			rejectedWith = `continued with eventId=${String(eventId)}`;
		} catch (error) {
			rejectedWith = error;
		}

		expect(rejectedWith).not.toBe(
			`continued with eventId=${String(undefined)}`,
		);
		expect(rejectedWith).toMatchObject({ statusCode: 404 });
	});
});
