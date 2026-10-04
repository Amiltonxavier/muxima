import { describe, expect, it } from "vitest";
import { BadRequestError, ConflictError } from "../../shared/errors/app-error";
import { INVITATION_CODES } from "../../shared/errors/codes";
import {
	assertInvitationCapacity,
	assertMaxGuestsPerInvitationIsRespected,
	countGuestsPeople,
	countInvitationPeople,
	DEFAULT_MAX_GUESTS_PER_INVITATION,
	findInvitationsOverCapacity,
} from "./capacity";

type GuestCount = { _count: { companions: number } };

function guest(companions: number): GuestCount {
	return { _count: { companions } };
}

function capture(run: () => void): Error | null {
	try {
		run();
		return null;
	} catch (error) {
		return error instanceof Error ? error : null;
	}
}

describe("default capacity", () => {
	it("starts every event at 2 people per invitation", () => {
		expect(DEFAULT_MAX_GUESTS_PER_INVITATION).toBe(2);
	});
});

describe("assertInvitationCapacity", () => {
	it("allows 2 people when the limit is 2", () => {
		expect(() =>
			assertInvitationCapacity({
				maxPeople: 2,
				currentPeople: 0,
				addedPeople: 2,
			}),
		).not.toThrow();
	});

	it("rejects 3 people when the limit is 2", () => {
		const error = capture(() =>
			assertInvitationCapacity({
				maxPeople: 2,
				currentPeople: 0,
				addedPeople: 3,
			}),
		);
		expect(error).toBeInstanceOf(BadRequestError);
		expect((error as BadRequestError).code).toBe(
			INVITATION_CODES.CAPACITY_REACHED,
		);
		expect(error?.message).toBe("Este convite permite no máximo 2 pessoas.");
	});

	it("allows 3 people when the limit is 3", () => {
		expect(() =>
			assertInvitationCapacity({
				maxPeople: 3,
				currentPeople: 0,
				addedPeople: 3,
			}),
		).not.toThrow();
	});

	it("rejects 4 people when the limit is 3", () => {
		const error = capture(() =>
			assertInvitationCapacity({
				maxPeople: 3,
				currentPeople: 0,
				addedPeople: 4,
			}),
		);
		expect(error?.message).toBe("Este convite permite no máximo 3 pessoas.");
	});

	it("blocks the companion that would cross the limit (2 + 1 > 2)", () => {
		const error = capture(() =>
			assertInvitationCapacity({
				maxPeople: 2,
				currentPeople: 2,
				addedPeople: 1,
			}),
		);
		expect(error?.message).toBe("Este convite permite no máximo 2 pessoas.");
	});

	it("allows the companion that stays within the limit (2 + 1 <= 3)", () => {
		expect(() =>
			assertInvitationCapacity({
				maxPeople: 3,
				currentPeople: 2,
				addedPeople: 1,
			}),
		).not.toThrow();
	});

	it("uses the singular when the limit is 1", () => {
		const error = capture(() =>
			assertInvitationCapacity({
				maxPeople: 1,
				currentPeople: 1,
				addedPeople: 1,
			}),
		);
		expect(error?.message).toBe("Este convite permite no máximo 1 pessoa.");
	});
});

describe("countGuestsPeople", () => {
	it("counts 1 per guest plus their companions", () => {
		expect(countGuestsPeople([guest(0), guest(1), guest(2)])).toBe(6);
	});

	it("returns 0 for no guests", () => {
		expect(countGuestsPeople([])).toBe(0);
	});
});

describe("countInvitationPeople", () => {
	it("sums every guest and companion of the invitation", async () => {
		const prisma = {
			guestInvitation: {
				findUnique: () =>
					Promise.resolve({
						guests: [{ guest: guest(0) }, { guest: guest(2) }],
					}),
			},
		} as never;

		expect(await countInvitationPeople(prisma, "inv_1")).toBe(4);
	});

	it("returns 0 for an unknown invitation", async () => {
		const prisma = {
			guestInvitation: { findUnique: () => Promise.resolve(null) },
		} as never;

		expect(await countInvitationPeople(prisma, "missing")).toBe(0);
	});
});

describe("lowering the limit", () => {
	function prismaWith(
		invitations: {
			id: string;
			code: string;
			guests: { guest: GuestCount }[];
		}[],
	) {
		return {
			guestInvitation: { findMany: () => Promise.resolve(invitations) },
		} as never;
	}

	it("finds the invitations that would become invalid", async () => {
		const violations = await findInvitationsOverCapacity(
			prismaWith([
				{
					id: "inv_1",
					code: "MUX-AAAA-BBBB",
					guests: [{ guest: guest(0) }, { guest: guest(3) }],
				},
				{ id: "inv_2", code: "MUX-CCCC-DDDD", guests: [{ guest: guest(1) }] },
			]),
			"evt_1",
			2,
		);

		expect(violations).toEqual([
			{ invitationId: "inv_1", code: "MUX-AAAA-BBBB", people: 5 },
		]);
	});

	it("rejects a lower limit and reports the invitations to correct", async () => {
		const error = await (async () => {
			try {
				await assertMaxGuestsPerInvitationIsRespected(
					prismaWith([
						{
							id: "inv_1",
							code: "MUX-AAAA-BBBB",
							guests: [{ guest: guest(3) }],
						},
					]),
					"evt_1",
					2,
				);
				return null;
			} catch (caught) {
				return caught instanceof Error ? caught : null;
			}
		})();

		expect(error).toBeInstanceOf(ConflictError);
		expect((error as ConflictError).code).toBe(
			INVITATION_CODES.CAPACITY_REACHED,
		);
		expect(error?.message).toContain("MUX-AAAA-BBBB");
		expect((error as ConflictError).statusCode).toBe(409);
	});

	it("accepts a limit that still covers every invitation", async () => {
		await expect(
			assertMaxGuestsPerInvitationIsRespected(
				prismaWith([
					{ id: "inv_1", code: "MUX-AAAA-BBBB", guests: [{ guest: guest(1) }] },
				]),
				"evt_1",
				2,
			),
		).resolves.toBeUndefined();
	});
});
