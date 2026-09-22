import { describe, expect, it, vi } from "vitest";

import {
	generateInvitationCode,
	getPublicInvitation,
	isInvitationExpired,
	respondToInvitation,
	type InvitationDb,
} from "./service";

type FakeInvitation = {
	id: string;
	code: string;
	eventId: string;
	status: string;
	response: string | null;
	rsvpStatus: string;
	publishedAt: Date | null;
	sentAt: Date | null;
	openedAt: Date | null;
	respondedAt: Date | null;
	expiresAt: Date | null;
	capacity: number | null;
	limitGuestCapacity: boolean;
	guests: Array<{
		guestId: string;
		guest: {
			id: string;
			name: string;
			status: string;
			companions: Array<{ id: string; name: string; status: string }>;
		};
	}>;
};

function makeInvitation(
	overrides: Partial<FakeInvitation> = {},
): FakeInvitation {
	return {
		id: "inv-1",
		code: "ABC23456",
		eventId: "evt-1",
		status: "SENT",
		response: null,
		rsvpStatus: "PENDING",
		publishedAt: new Date("2026-01-01"),
		sentAt: new Date("2026-01-01"),
		openedAt: null,
		respondedAt: null,
		expiresAt: null,
		capacity: 10,
		limitGuestCapacity: false,
		guests: [
			{
				guestId: "g-1",
				guest: {
					id: "g-1",
					name: "Amílton",
					status: "PENDING",
					companions: [
						{ id: "c-1", name: "Mariana", status: "PENDING" },
					],
				},
			},
		],
		...overrides,
	};
}

function createFakeDb(initial: FakeInvitation[]): {
	fake: InvitationDb;
	store: FakeInvitation[];
	db: {
		guestInvitation: {
			findUnique: ReturnType<typeof vi.fn>;
			update: ReturnType<typeof vi.fn>;
			count: ReturnType<typeof vi.fn>;
			groupBy: ReturnType<typeof vi.fn>;
			create: ReturnType<typeof vi.fn>;
		};
		guest: {
			count: ReturnType<typeof vi.fn>;
			updateMany: ReturnType<typeof vi.fn>;
		};
		guestCompanion: {
			count: ReturnType<typeof vi.fn>;
		};
	};
} {
	const store = [...initial];

	const db = {
		guestInvitation: {
			findUnique: vi.fn(async ({ where }: { where: { code: string } }) => {
				const invitation = store.find((inv) => inv.code === where.code);
				if (!invitation) return null;
				return {
					...invitation,
					event: {
						id: invitation.eventId,
						name: "Casamento do Ano",
						type: "WEDDING",
						status: "CONFIRMED",
						eventDate: new Date("2026-12-01"),
						startTime: null,
						endTime: null,
						venueName: null,
						address: null,
						neighborhood: null,
						municipality: null,
						province: null,
						description: null,
						capacity: invitation.capacity,
						limitGuestCapacity: invitation.limitGuestCapacity,
						owner: {
							id: "u-1",
							name: "Dona",
							email: "dona@example.com",
						},
					},
				};
			}),
			update: vi.fn(
				async ({
					where,
					data,
				}: {
					where: { id: string };
					data: Record<string, unknown>;
				}) => {
					const index = store.findIndex((inv) => inv.id === where.id);
					if (index === -1) throw new Error("invitation not found");
					store[index] = { ...store[index], ...data } as FakeInvitation;
					return store[index];
				},
			),
			count: vi.fn(async () => 0),
			groupBy: vi.fn(async () => []),
			create: vi.fn(async () => null),
		},
		guest: {
			count: vi.fn(async () => 0),
			updateMany: vi.fn(async () => ({ count: 0 })),
		},
		guestCompanion: {
			count: vi.fn(async () => 0),
		},
	};

	return {
		fake: db as unknown as InvitationDb,
		store,
		db: db as unknown as {
			guestInvitation: {
				findUnique: ReturnType<typeof vi.fn>;
				update: ReturnType<typeof vi.fn>;
				count: ReturnType<typeof vi.fn>;
				groupBy: ReturnType<typeof vi.fn>;
				create: ReturnType<typeof vi.fn>;
			};
			guest: {
				count: ReturnType<typeof vi.fn>;
				updateMany: ReturnType<typeof vi.fn>;
			};
			guestCompanion: {
				count: ReturnType<typeof vi.fn>;
			};
		},
	};
}

describe("generateInvitationCode", () => {
	it("generates 8-char codes from a safe alphabet", () => {
		const code = generateInvitationCode();
		expect(code).toHaveLength(8);
		expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/);
	});

	it("generates unique codes", () => {
		const codes = new Set(Array.from({ length: 200 }, generateInvitationCode));
		expect(codes.size).toBe(200);
	});
});

describe("isInvitationExpired", () => {
	it("expires when status is EXPIRED", () => {
		expect(
			isInvitationExpired({ status: "EXPIRED", expiresAt: null }),
		).toBe(true);
	});

	it("expires when expiresAt is in the past", () => {
		expect(
			isInvitationExpired(
				{ status: "SENT", expiresAt: new Date("2020-01-01") },
				new Date("2026-01-01"),
			),
		).toBe(true);
	});

	it("is not expired with future expiresAt", () => {
		expect(
			isInvitationExpired(
				{ status: "SENT", expiresAt: new Date("2030-01-01") },
				new Date("2026-01-01"),
			),
		).toBe(false);
	});
});

describe("getPublicInvitation", () => {
	it("returns NOT_FOUND for an unknown code", async () => {
		const { fake } = createFakeDb([
			makeInvitation({ code: "ABC23456" }),
		]);
		const result = await getPublicInvitation(fake, "NOPE1234");
		expect(result).toEqual({ result: "NOT_FOUND" });
	});

	it("returns NOT_FOUND for an unpublished invitation", async () => {
		const { fake } = createFakeDb([
			makeInvitation({ publishedAt: null }),
		]);
		const result = await getPublicInvitation(fake, "ABC23456");
		expect(result).toEqual({ result: "NOT_FOUND" });
	});

	it("returns EXPIRED for a published expired invitation", async () => {
		const { fake } = createFakeDb([
			makeInvitation({
				expiresAt: new Date("2020-01-01"),
			}),
		]);
		const result = await getPublicInvitation(fake, "ABC23456");
		expect(result).toEqual({ result: "EXPIRED" });
	});

	it("returns CANCELLED for a published cancelled invitation", async () => {
		const { fake } = createFakeDb([
			makeInvitation({ status: "CANCELLED" }),
		]);
		const result = await getPublicInvitation(fake, "ABC23456");
		expect(result).toEqual({ result: "CANCELLED" });
	});

	it("returns an AVAILABLE invitation with canRespond when published", async () => {
		const { fake, db } = createFakeDb([makeInvitation()]);
		const result = await getPublicInvitation(fake, "ABC23456");

		expect(result.result).toBe("AVAILABLE");
		if (result.result !== "AVAILABLE") return;
		expect(result.invitation.canRespond).toBe(true);
		expect(result.invitation.event.name).toBeDefined();
		expect(result.invitation.guests[0]!.name).toBe("Amílton");
		expect(result.invitation.guests[0]!.companions).toHaveLength(1);
		expect(db.guestInvitation.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ status: "OPENED" }),
			}),
		);
	});

	it("sets canRespond false when expiresAt is in the past", async () => {
		const { fake } = createFakeDb([
			makeInvitation({
				status: "RESPONDED",
				response: "CONFIRM",
				rsvpStatus: "CONFIRMED",
				expiresAt: new Date("2020-01-01"),
			}),
		]);
		const result = await getPublicInvitation(fake, "ABC23456");
		expect(result).toEqual({ result: "EXPIRED" });
	});
});

describe("respondToInvitation", () => {
	it("throws NOT_FOUND when publishRequired and unpublished", async () => {
		const { fake } = createFakeDb([makeInvitation({ publishedAt: null })]);
		await expect(
			respondToInvitation(fake, "ABC23456", "CONFIRM", {
				publishRequired: true,
			}),
		).rejects.toThrow("Convite não encontrado");
	});

	it("throws when the invitation is cancelled", async () => {
		const { fake } = createFakeDb([makeInvitation({ status: "CANCELLED" })]);
		await expect(
			respondToInvitation(fake, "ABC23456", "CONFIRM"),
		).rejects.toThrow("Este convite foi cancelado");
	});

	it("throws when the invitation is expired", async () => {
		const { fake } = createFakeDb([
			makeInvitation({ status: "EXPIRED" }),
		]);
		await expect(
			respondToInvitation(fake, "ABC23456", "CONFIRM"),
		).rejects.toThrow("Este convite expirou");
	});

	it("maps CONFIRM to CONFIRMED guests and RESPONDED invitation", async () => {
		const { fake, store, db } = createFakeDb([makeInvitation()]);

		const result = await respondToInvitation(fake, "ABC23456", "CONFIRM");

		expect(db.guest.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				data: { status: "CONFIRMED" },
			}),
		);
		const stored = store[0]!;
		expect(stored.status).toBe("RESPONDED");
		expect(stored.response).toBe("CONFIRM");
		expect(stored.rsvpStatus).toBe("CONFIRMED");
		expect(result.guests[0]!.guest.id).toBe("g-1");
	});

	it("maps MAYBE response to MAYBE statuses", async () => {
		const { fake, store, db } = createFakeDb([makeInvitation()]);

		await respondToInvitation(fake, "ABC23456", "MAYBE");

		expect(db.guest.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				data: { status: "MAYBE" },
			}),
		);
		expect(store[0]!.rsvpStatus).toBe("MAYBE");
	});

	it("allows changing an existing response", async () => {
		const { fake, store } = createFakeDb([
			makeInvitation({ status: "RESPONDED", response: "CONFIRM" }),
		]);

		await respondToInvitation(fake, "ABC23456", "DECLINE");

		const stored = store[0]!;
		expect(stored.response).toBe("DECLINE");
		expect(stored.rsvpStatus).toBe("DECLINED");
	});

	it("rejects confirmations over capacity when limitGuestCapacity", async () => {
		const { fake, db } = createFakeDb([
			makeInvitation({ capacity: 5, limitGuestCapacity: true }),
		]);
		// 4 confirmed guests + 2 confirmed companions already counted.
		db.guestInvitation.findUnique;
		(db.guest.count as ReturnType<typeof vi.fn>).mockResolvedValue(4);
		(db.guestCompanion.count as ReturnType<typeof vi.fn>).mockResolvedValue(
			2,
		);

		await expect(
			respondToInvitation(fake, "ABC23456", "CONFIRM"),
		).rejects.toThrow("A capacidade máxima do evento já foi atingida");
	});

	it("allows confirmation when capacity is sufficient", async () => {
		const { fake, db } = createFakeDb([
			makeInvitation({ capacity: 10, limitGuestCapacity: true }),
		]);
		(db.guest.count as ReturnType<typeof vi.fn>).mockResolvedValue(4);
		(db.guestCompanion.count as ReturnType<typeof vi.fn>).mockResolvedValue(2);

		await expect(
			respondToInvitation(fake, "ABC23456", "CONFIRM"),
		).resolves.toBeDefined();
	});

	it("skips capacity when limitGuestCapacity is disabled", async () => {
		const { fake } = createFakeDb([
			makeInvitation({ capacity: 1, limitGuestCapacity: false }),
		]);

		await expect(
			respondToInvitation(fake, "ABC23456", "CONFIRM"),
		).resolves.toBeDefined();
	});
});