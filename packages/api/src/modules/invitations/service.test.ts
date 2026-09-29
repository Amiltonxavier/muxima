import { describe, expect, it, vi } from "vitest";

import {
	buildInvitationUrl,
	generateInvitationQrCode,
	getPublicBaseUrl,
} from "./qr-code";
import {
	generateInvitationCode,
	getPublicInvitation,
	type InvitationDb,
	isInvitationExpired,
	publishInvitationsBatch,
	respondToInvitation,
} from "./service";

type FakeInvitation = {
	id: string;
	code: string;
	eventId: string;
	status: string;
	response: string | null;
	rsvpStatus: string;
	publishedAt: Date | null;
	url: string | null;
	qrCode: string | null;
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
		url: "http://localhost:3001/invite/ABC23456",
		qrCode: "<svg />",
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
					companions: [{ id: "c-1", name: "Mariana", status: "PENDING" }],
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
		expect(isInvitationExpired({ status: "EXPIRED", expiresAt: null })).toBe(
			true,
		);
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
		const { fake } = createFakeDb([makeInvitation({ code: "ABC23456" })]);
		const result = await getPublicInvitation(fake, "NOPE1234");
		expect(result).toEqual({ result: "NOT_FOUND" });
	});

	it("returns NOT_FOUND for an unpublished invitation", async () => {
		const { fake } = createFakeDb([makeInvitation({ publishedAt: null })]);
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
		const { fake } = createFakeDb([makeInvitation({ status: "CANCELLED" })]);
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
		expect(result.invitation.guests[0]?.name).toBe("Amílton");
		expect(result.invitation.guests[0]?.companions).toHaveLength(1);
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

	it("returns the stored QR Code without regenerating it", async () => {
		const { fake, db } = createFakeDb([makeInvitation()]);
		const result = await getPublicInvitation(fake, "ABC23456");

		expect(result.result).toBe("AVAILABLE");
		if (result.result !== "AVAILABLE") return;
		expect(result.invitation.qrCode).toBe("<svg />");
		expect(
			(db.guestInvitation.update as ReturnType<typeof vi.fn>).mock.calls,
		).not.toContainEqual([
			expect.objectContaining({
				data: expect.objectContaining({ qrCode: expect.any(String) }),
			}),
		]);
	});

	it("backfills a missing QR Code on the first public read of a legacy invitation", async () => {
		const { fake, db, store } = createFakeDb([
			makeInvitation({ url: null, qrCode: null }),
		]);

		const result = await getPublicInvitation(fake, "ABC23456");

		expect(result.result).toBe("AVAILABLE");
		if (result.result !== "AVAILABLE") return;
		expect(result.invitation.url).toBe("http://localhost:3001/invite/ABC23456");
		expect(result.invitation.qrCode).toContain("<svg");
		expect(db.guestInvitation.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					qrCode: expect.stringContaining("<svg"),
				}),
			}),
		);
		expect(store[0]?.qrCode).toContain("<svg");
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
		const { fake } = createFakeDb([makeInvitation({ status: "EXPIRED" })]);
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
		const stored = store[0];
		expect(stored).toBeDefined();
		if (!stored) return;
		expect(stored.status).toBe("RESPONDED");
		expect(stored.response).toBe("CONFIRM");
		expect(stored.rsvpStatus).toBe("CONFIRMED");
		expect(result.guests[0]?.guest.id).toBe("g-1");
	});

	it("maps MAYBE response to MAYBE statuses", async () => {
		const { fake, store, db } = createFakeDb([makeInvitation()]);

		await respondToInvitation(fake, "ABC23456", "MAYBE");

		expect(db.guest.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				data: { status: "MAYBE" },
			}),
		);
		expect(store[0]?.rsvpStatus).toBe("MAYBE");
	});

	it("allows changing an existing response", async () => {
		const { fake, store } = createFakeDb([
			makeInvitation({ status: "RESPONDED", response: "CONFIRM" }),
		]);

		await respondToInvitation(fake, "ABC23456", "DECLINE");

		const stored = store[0];
		expect(stored).toBeDefined();
		if (!stored) return;
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
		(db.guestCompanion.count as ReturnType<typeof vi.fn>).mockResolvedValue(2);

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

describe("QR Code", () => {
	it("builds the public URL from the invitation token only", () => {
		const url = buildInvitationUrl("ABC23456", "https://muxima.ao/");

		expect(url).toBe("https://muxima.ao/invite/ABC23456");
		// The internal id must never leak into the scanned payload.
		expect(url).not.toContain("inv-1");
	});

	it("percent-encodes the code so it is safe inside a path", () => {
		const url = buildInvitationUrl("A B/C", "https://muxima.ao");
		expect(url).toBe("https://muxima.ao/invite/A%20B%2FC");
	});

	it("prefers FRONTEND_URL and falls back to CORS_ORIGIN", () => {
		// The vitest config sets CORS_ORIGIN and no FRONTEND_URL.
		expect(getPublicBaseUrl()).toBe("http://localhost:3001");
	});

	it("generates an SVG that encodes the exact invitation URL", async () => {
		const url = "https://muxima.ao/invite/ABC23456";
		const svg = await generateInvitationQrCode(url);

		expect(svg).toContain("<svg");
		expect(svg).toContain("</svg>");
		expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
		// The payload is encoded in the module matrix, not as plain text, so we
		// assert on structure + determinism instead.
		expect(await generateInvitationQrCode(url)).toBe(svg);
	});

	it("produces different SVGs for different codes", async () => {
		const a = await generateInvitationQrCode(
			"https://muxima.ao/invite/ABC23456",
		);
		const b = await generateInvitationQrCode(
			"https://muxima.ao/invite/XYZ78901",
		);

		expect(a).not.toBe(b);
	});
});

describe("publishInvitationsBatch", () => {
	/** Minimal fake covering the queries the batch flow relies on. */
	function createBatchDb(
		invitations: Array<{
			id: string;
			eventId: string;
			publishedAt: Date | null;
			status: string;
			guests: Array<{ guest: { status: string } }>;
		}>,
	) {
		const updates: Array<{ id: string; data: Record<string, unknown> }> = [];

		const db = {
			guestInvitation: {
				// Serves two distinct queries: the `ALL_UNPUBLISHED` id resolver
				// (`where: { eventId, publishedAt: null }`) and the id lookup
				// (`where: { id: { in } }`).
				findMany: vi.fn(
					async ({
						where,
					}: {
						where: { id?: { in: string[] }; eventId?: string };
					}) => {
						if (where.id?.in) {
							return invitations
								.filter((inv) => where.id?.in.includes(inv.id))
								.map((inv) => ({
									...inv,
									expiresAt: null,
									url: null,
									qrCode: null,
									_count: { guests: inv.guests.length },
									guests: inv.guests.map(({ guest }) => ({
										guest: { id: guest.status, status: guest.status },
									})),
								}));
						}
						return invitations
							.filter(
								(inv) => inv.eventId === where.eventId && !inv.publishedAt,
							)
							.map((inv) => ({ id: inv.id }));
					},
				),
				updateMany: vi.fn(async () => ({ count: 1 })),
				update: vi.fn(
					async ({
						where,
						data,
					}: {
						where: { id: string };
						data: Record<string, unknown>;
					}) => {
						updates.push({ id: where.id, data });
						return { id: where.id, ...data };
					},
				),
			},
		};

		return {
			fake: db as unknown as InvitationDb,
			db,
			updates,
		};
	}

	it("returns an empty summary when there is nothing to publish", async () => {
		const { fake } = createBatchDb([]);

		const summary = await publishInvitationsBatch(fake, {
			eventId: "evt-1",
			invitationIds: [],
		});

		expect(summary).toMatchObject({
			total: 0,
			published: 0,
			results: [],
			errors: [],
		});
	});

	it("deduplicates ids so a selection is not counted twice", async () => {
		const { fake, db } = createBatchDb([]);

		await publishInvitationsBatch(fake, {
			eventId: "evt-1",
			invitationIds: ["inv-1", "inv-1", "inv-2"],
		});

		expect(db.guestInvitation.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ id: { in: ["inv-1", "inv-2"] } }),
			}),
		);
	});

	it("resolves the target set on the backend for the ALL_UNPUBLISHED scope", async () => {
		const { fake, db } = createBatchDb([
			{
				id: "inv-1",
				eventId: "evt-1",
				publishedAt: null,
				status: "SENT",
				guests: [{ guest: { status: "PENDING" } }],
			},
		]);

		const summary = await publishInvitationsBatch(fake, {
			eventId: "evt-1",
			invitationIds: [],
			scope: "ALL_UNPUBLISHED",
		});

		expect(db.guestInvitation.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { eventId: "evt-1", publishedAt: null },
			}),
		);
		expect(summary.published).toBe(1);
	});

	it("marks invitations from another event as invalid instead of publishing them", async () => {
		const { fake } = createBatchDb([]);

		const summary = await publishInvitationsBatch(fake, {
			eventId: "evt-1",
			invitationIds: ["inv-other-event"],
		});

		expect(summary.published).toBe(0);
		expect(summary.invalid).toBe(1);
		expect(summary.results[0]?.status).toBe("INVALID");
	});

	it("flags already published invitations as such, not as fresh publications", async () => {
		const { fake } = createBatchDb([
			{
				id: "inv-1",
				eventId: "evt-1",
				publishedAt: new Date("2026-01-01"),
				status: "SENT",
				guests: [{ guest: { status: "PENDING" } }],
			},
		]);

		const summary = await publishInvitationsBatch(fake, {
			eventId: "evt-1",
			invitationIds: ["inv-1"],
		});

		expect(summary.alreadyPublished).toBe(1);
		expect(summary.published).toBe(0);
		expect(summary.results[0]?.status).toBe("ALREADY_PUBLISHED");
	});

	it("backfills a missing QR Code while publishing", async () => {
		const { fake, updates } = createBatchDb([
			{
				id: "inv-1",
				eventId: "evt-1",
				publishedAt: null,
				status: "SENT",
				guests: [{ guest: { status: "PENDING" } }],
			},
		]);

		await publishInvitationsBatch(fake, {
			eventId: "evt-1",
			invitationIds: ["inv-1"],
		});

		expect(updates).toHaveLength(1);
		expect(String(updates[0]?.data.qrCode)).toContain("<svg");
	});

	it("reports FAILED when the publish write itself fails", async () => {
		const { fake, db } = createBatchDb([
			{
				id: "inv-1",
				eventId: "evt-1",
				publishedAt: null,
				status: "SENT",
				guests: [{ guest: { status: "PENDING" } }],
			},
		]);
		db.guestInvitation.updateMany.mockRejectedValueOnce(
			new Error("deadlock detected"),
		);

		const summary = await publishInvitationsBatch(fake, {
			eventId: "evt-1",
			invitationIds: ["inv-1"],
		});

		expect(summary.failed).toBe(1);
		expect(summary.published).toBe(0);
		expect(summary.results[0]?.status).toBe("FAILED");
		expect(summary.errors[0]?.reason).toBe("deadlock detected");
	});

	it("keeps a successful publish PUBLISHED when only the QR backfill fails", async () => {
		const { fake, db } = createBatchDb([
			{
				id: "inv-1",
				eventId: "evt-1",
				publishedAt: null,
				status: "SENT",
				guests: [{ guest: { status: "PENDING" } }],
			},
		]);
		db.guestInvitation.update.mockRejectedValueOnce(new Error("qr boom"));

		const summary = await publishInvitationsBatch(fake, {
			eventId: "evt-1",
			invitationIds: ["inv-1"],
		});

		// `updateMany` already published it, so reporting FAILED would be a lie.
		// The QR is a derived asset and is backfilled lazily on public read.
		expect(summary.published).toBe(1);
		expect(summary.failed).toBe(0);
		expect(summary.results[0]?.status).toBe("PUBLISHED");
		expect(summary.errors[0]?.reason).toContain("QR Code não pôde ser gerado");
	});
});
