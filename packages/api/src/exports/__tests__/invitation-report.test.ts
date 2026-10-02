import { describe, expect, it } from "vitest";

import type { PublicInvitationLookup } from "../../shared/types/entities";
import { buildInvitationReport } from "../reports/invite";

/**
 * The invitation PDF is public. These tests exist to make a leak impossible by
 * construction: the builder's input type is the public projection, and the
 * assertions below also check that a hostile extra field on the runtime object
 * is never rendered.
 */

const PUBLIC_URL = "http://localhost:3001/invite/abc123xyz";

function availableLookup(
	overrides: Partial<
		Extract<PublicInvitationLookup, { result: "AVAILABLE" }>["invitation"]
	> = {},
): PublicInvitationLookup {
	return {
		result: "AVAILABLE",
		invitation: {
			id: "inv-1",
			code: "abc123xyz",
			status: "SENT",
			rsvpStatus: "PENDING",
			response: null,
			respondedAt: null,
			expiresAt: null,
			publishedAt: new Date(Date.UTC(2026, 2, 1)),
			canRespond: true,
			rsvpBlockedReason: null,
			url: PUBLIC_URL,
			qrCode: "<svg/>",
			event: {
				id: "event-1",
				name: "Casamento da Ana",
				type: "WEDDING",
				status: "CONFIRMED",
				eventDate: new Date(Date.UTC(2026, 5, 20, 15, 0)),
				startTime: "15:00",
				endTime: "23:30",
				venueName: "Salão Miramar",
				address: "Rua da Independência",
				neighborhood: "Ingombota",
				municipality: "Luanda",
				province: "Luanda",
				description: "Celebração com família e amigos.",
			},
			host: {
				id: "user-1",
				name: "Ana Silva",
				email: "ana@example.com",
			},
			guests: [
				{
					id: "guest-1",
					name: "Ana Silva",
					status: "CONFIRMED",
					companions: [
						{
							id: "c-1",
							guestId: "guest-1",
							name: "João Silva",
							status: "CONFIRMED",
							createdAt: new Date(Date.UTC(2026, 0, 1)),
							updatedAt: new Date(Date.UTC(2026, 0, 1)),
						},
					],
				},
			],
			...overrides,
		},
	};
}

const schedule = [
	{
		title: "Cerimónia",
		description: "Entrada dos noivos",
		startAt: new Date(Date.UTC(2026, 5, 20, 15, 0)),
		endAt: new Date(Date.UTC(2026, 5, 20, 16, 0)),
		location: "Salão Miramar",
	},
];

describe("buildInvitationReport", () => {
	it("renders the public event details, guests and programme", async () => {
		const report = await buildInvitationReport({
			lookup: availableLookup(),
			schedule,
		});

		expect(report.title).toBe("Convite");
		expect(report.sections.map((section) => section.kind)).toEqual(
			expect.arrayContaining(["pairs", "table", "paragraphs"]),
		);

		const tables = report.sections.filter(
			(section) => section.kind === "table",
		);
		expect(tables.map((table) => table.title)).toEqual([
			"Lista de convidados",
			"Programa do evento",
		]);
	});

	it("stays total for an unavailable lookup instead of throwing", async () => {
		for (const result of ["NOT_FOUND", "EXPIRED", "CANCELLED"] as const) {
			const report = await buildInvitationReport({
				lookup: { result } as PublicInvitationLookup,
				schedule: [],
			});
			expect(report.sections.length).toBeGreaterThan(0);
		}
	});

	it("renders no QR section when the invitation predates the QR feature", async () => {
		const report = await buildInvitationReport({
			lookup: availableLookup({ qrCode: null, url: null }),
			schedule,
		});
		expect(report.sections.some((section) => section.kind === "image")).toBe(
			false,
		);
	});

	it("adds a QR Code image when the invitation has one", async () => {
		const report = await buildInvitationReport({
			lookup: availableLookup(),
			schedule,
		});
		const image = report.sections.find((section) => section.kind === "image");
		expect(image).toBeDefined();
		if (image?.kind !== "image") throw new Error("expected an image section");
		expect(image.image.format).toBe("png");
		// Base64 payload, never a data-URL prefix and never the SVG.
		expect(image.image.data).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
		expect(image.image.data).not.toContain("data:");
		expect(image.image.alt).toBe(PUBLIC_URL);
	});

	it("never renders a field the public projection does not carry", async () => {
		// A hostile runtime object: these keys are not on the public type and the
		// report has no way to see them.
		const hostile = availableLookup() as Extract<
			PublicInvitationLookup,
			{ result: "AVAILABLE" }
		> & {
			invitation: Record<string, unknown> & {
				internalNotes: string;
				ownerId: string;
				event: Record<string, unknown> & { budget: number; totalSpent: number };
				host: Record<string, unknown> & { phone: string; role: string };
				guests: (Record<string, unknown> & {
					email: string;
					phone: string;
					cpf: string;
				})[];
			};
		};
		hostile.invitation.internalNotes = "SEGREDO-INTERNO";
		hostile.invitation.ownerId = "user-99";
		hostile.invitation.event.budget = 999999;
		hostile.invitation.event.totalSpent = 888888;
		hostile.invitation.host.phone = "+244900000000";
		hostile.invitation.host.role = "ADMIN";
		const firstGuest = hostile.invitation.guests[0];
		if (!firstGuest) throw new Error("fixture must have one guest");
		firstGuest.email = "guest@example.com";
		firstGuest.phone = "+244911111111";
		firstGuest.cpf = "000000000LA041";

		const report = await buildInvitationReport({ lookup: hostile, schedule });
		const serialised = JSON.stringify(report);

		for (const secret of [
			"SEGREDO-INTERNO",
			"user-99",
			"999999",
			"888888",
			"+244900000000",
			"ADMIN",
			"guest@example.com",
			"+244911111111",
			"000000000LA041",
		]) {
			expect(serialised).not.toContain(secret);
		}
	});

	it("renders the public URL but nothing derived from the internal id", async () => {
		const report = await buildInvitationReport({
			lookup: availableLookup(),
			schedule,
		});
		const serialised = JSON.stringify(report);
		expect(serialised).toContain(PUBLIC_URL);
		expect(serialised).not.toContain("inv-1");
		expect(serialised).not.toContain("event-1");
		expect(serialised).not.toContain("guest-1");
	});
});
