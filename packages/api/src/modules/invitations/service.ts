import { randomBytes } from "node:crypto";

import type { PrismaClient, Prisma } from "@muxima/db/prisma";
import type {
	InvitationResponse,
	InvitationStats,
	PublicInvitation,
	PublicInvitationLookup,
} from "../../shared/types/entities";

export type InvitationDb = Prisma.TransactionClient | PrismaClient;

export type GuestInvitationWithGuests = Prisma.GuestInvitationGetPayload<{
	include: {
		event: {
			select: { capacity: true; limitGuestCapacity: true };
		};
		guests: {
			include: { guest: true };
		};
	};
}>;

export type GuestInvitationWithEvent = Prisma.GuestInvitationGetPayload<{
	include: {
		event: {
			select: {
				id: true;
				name: true;
				type: true;
				status: true;
				eventDate: true;
				startTime: true;
				endTime: true;
				venueName: true;
				address: true;
				neighborhood: true;
				municipality: true;
				province: true;
				description: true;
				owner: { select: { id: true; name: true; email: true } };
			};
		};
		guests: {
			include: {
				guest: {
					include: { companions: true };
				};
			};
		};
	};
}>;

export type GuestInvitationListItem = Prisma.GuestInvitationGetPayload<{
	include: {
		guests: { include: { guest: true } };
	};
}>;

export type GuestInvitationCreated = GuestInvitationListItem;

// ── Invitation code generation ───────────────────────────────────
// Ambiguous characters (0, O, I, 1, L) excluded so codes are easy to share.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateInvitationCode(): string {
	const bytes = randomBytes(8);
	return Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join(
		"",
	);
}

function isUniqueViolation(error: unknown): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		error.code === "P2002"
	);
}

// ── Expiry helpers ───────────────────────────────────────────────
export function isInvitationExpired(
	invitation: {
		status: string;
		expiresAt: Date | null;
	},
	now = new Date(),
): boolean {
	return (
		invitation.status === "EXPIRED" ||
		(invitation.expiresAt !== null && invitation.expiresAt <= now)
	);
}

function mapResponseToGuestStatus(response: InvitationResponse) {
	if (response === "CONFIRM") return "CONFIRMED";
	if (response === "DECLINE") return "DECLINED";
	return "MAYBE";
}

function mapResponseToRsvpStatus(response: InvitationResponse) {
	if (response === "CONFIRM") return "CONFIRMED";
	if (response === "DECLINE") return "DECLINED";
	return "MAYBE";
}

// ── Public lookup ────────────────────────────────────────────────
export async function getPublicInvitation(
	prisma: InvitationDb,
	code: string,
): Promise<PublicInvitationLookup> {
	const invitation = await prisma.guestInvitation.findUnique({
		where: { code },
		include: {
			event: {
				select: {
					id: true,
					name: true,
					type: true,
					status: true,
					eventDate: true,
					startTime: true,
					endTime: true,
					venueName: true,
					address: true,
					neighborhood: true,
					municipality: true,
					province: true,
					description: true,
					owner: { select: { id: true, name: true, email: true } },
				},
			},
			guests: {
				include: {
					guest: {
						include: { companions: true },
					},
				},
			},
		},
	});

	// Unpublished invitations are indistinguishable from non-existent ones so
	// that the endpoint cannot be used to enumerate codes.
	if (!invitation || invitation.publishedAt === null) {
		return { result: "NOT_FOUND" };
	}

	if (isInvitationExpired(invitation)) {
		return { result: "EXPIRED" };
	}

	if (invitation.status === "CANCELLED") {
		return { result: "CANCELLED" };
	}

	if (invitation.openedAt === null && invitation.status === "SENT") {
		await prisma.guestInvitation.update({
			where: { id: invitation.id },
			data: { openedAt: new Date(), status: "OPENED" },
		});
	}

	return {
		result: "AVAILABLE",
		invitation: buildPublicInvitation(invitation),
	};
}

export function buildPublicInvitation(
	invitation: GuestInvitationWithEvent,
): PublicInvitation {
	return {
		id: invitation.id,
		code: invitation.code,
		status: invitation.status as PublicInvitation["status"],
		rsvpStatus: invitation.rsvpStatus as PublicInvitation["rsvpStatus"],
		response: (invitation.response as InvitationResponse | null) ?? null,
		respondedAt: invitation.respondedAt,
		expiresAt: invitation.expiresAt,
		publishedAt: invitation.publishedAt,
		canRespond: !isInvitationExpired(invitation),
		event: {
			id: invitation.event.id,
			name: invitation.event.name,
			type: invitation.event.type as PublicInvitation["event"]["type"],
			status: invitation.event.status as PublicInvitation["event"]["status"],
			eventDate: invitation.event.eventDate,
			startTime: invitation.event.startTime,
			endTime: invitation.event.endTime,
			venueName: invitation.event.venueName,
			address: invitation.event.address,
			neighborhood: invitation.event.neighborhood,
			municipality: invitation.event.municipality,
			province: invitation.event.province,
			description: invitation.event.description,
		},
		host: {
			id: invitation.event.owner.id,
			name: invitation.event.owner.name,
			email: invitation.event.owner.email,
		},
		guests: invitation.guests.map(({ guest }) => ({
			id: guest.id,
			name: guest.name,
			status: guest.status as PublicInvitation["guests"][number]["status"],
			companions: guest.companions,
		})),
	};
}

// ── Respond ──────────────────────────────────────────────────────
export async function respondToInvitation(
	prisma: InvitationDb,
	code: string,
	response: InvitationResponse,
	options: { publishRequired?: boolean } = {},
): Promise<GuestInvitationWithGuests> {
	const invitation = await prisma.guestInvitation.findUnique({
		where: { code },
		include: {
			event: {
				select: { capacity: true, limitGuestCapacity: true },
			},
			guests: { include: { guest: true } },
		},
	});

	if (!invitation) {
		throw new Error("Convite não encontrado");
	}

	if (options.publishRequired && invitation.publishedAt === null) {
		throw new Error("Convite não encontrado");
	}

	if (invitation.status === "CANCELLED") {
		throw new Error("Este convite foi cancelado");
	}

	if (isInvitationExpired(invitation)) {
		throw new Error("Este convite expirou");
	}

	if (response === "CONFIRM") {
		await enforceCapacity(prisma, invitation);
	}

	const guestStatus = mapResponseToGuestStatus(response);

	await prisma.guest.updateMany({
		where: {
			id: { in: invitation.guests.map(({ guestId }) => guestId) },
		},
		data: { status: guestStatus },
	});

	const updated = await prisma.guestInvitation.update({
		where: { id: invitation.id },
		data: {
			status: "RESPONDED",
			respondedAt: new Date(),
			response,
			rsvpStatus: mapResponseToRsvpStatus(response),
		},
	});

	return {
		...updated,
		event: invitation.event,
		guests: invitation.guests,
	};
}

async function enforceCapacity(
	prisma: InvitationDb,
	invitation: GuestInvitationWithGuests,
): Promise<void> {
	const { capacity, limitGuestCapacity } = invitation.event;
	if (!limitGuestCapacity || !capacity || capacity <= 0) return;

	const [confirmedGuests, confirmedCompanions] = await Promise.all([
		prisma.guest.count({
			where: { eventId: invitation.eventId, status: "CONFIRMED" },
		}),
		prisma.guestCompanion.count({
			where: { guest: { eventId: invitation.eventId }, status: "CONFIRMED" },
		}),
	]);

	const currentConfirmed = confirmedGuests + confirmedCompanions;
	const alreadyConfirmedInInvitation = invitation.guests.filter(
		({ guest }) => guest.status === "CONFIRMED",
	).length;
	const prospective =
		currentConfirmed - alreadyConfirmedInInvitation + invitation.guests.length;

	if (prospective > capacity) {
		throw new Error("A capacidade máxima do evento já foi atingida");
	}
}

// ── Create ───────────────────────────────────────────────────────
export async function createInvitation(
	prisma: InvitationDb,
	input: { eventId: string; guestIds: string[] },
): Promise<GuestInvitationCreated> {
	for (let attempt = 0; attempt < 5; attempt++) {
		try {
			return await prisma.guestInvitation.create({
				data: {
					eventId: input.eventId,
					code: generateInvitationCode(),
					status: "SENT",
					sentAt: new Date(),
					guests: {
						create: input.guestIds.map((guestId) => ({ guestId })),
					},
				},
				include: {
					guests: { include: { guest: true } },
				},
			});
		} catch (error) {
			if (!isUniqueViolation(error)) throw error;
		}
	}
	throw new Error("Não foi possível gerar um código de convite único");
}

// ── Admin stats ──────────────────────────────────────────────────
export async function getInvitationStats(
	prisma: InvitationDb,
	eventId: string,
): Promise<InvitationStats> {
	const [total, published, byStatus, byResponse] = await Promise.all([
		prisma.guestInvitation.count({ where: { eventId } }),
		prisma.guestInvitation.count({
			where: { eventId, publishedAt: { not: null } },
		}),
		prisma.guestInvitation.groupBy({
			by: ["status"],
			where: { eventId },
			_count: { _all: true },
		}),
		prisma.guestInvitation.groupBy({
			by: ["response"],
			where: { eventId },
			_count: { _all: true },
		}),
	]);

	const statusCounts = byStatus.reduce<Record<string, number>>((acc, row) => {
		acc[row.status] = row._count._all;
		return acc;
	}, {});

	const responseCounts = byResponse.reduce<Record<string, number>>(
		(acc, row) => {
			if (row.response !== null) {
				acc[row.response] = row._count._all;
			}
			return acc;
		},
		{},
	);

	const responded =
		(responseCounts.CONFIRM ?? 0) +
		(responseCounts.DECLINE ?? 0) +
		(responseCounts.MAYBE ?? 0);

	return {
		total,
		published,
		unpublished: total - published,
		responded,
		responses: {
			CONFIRM: responseCounts.CONFIRM ?? 0,
			DECLINE: responseCounts.DECLINE ?? 0,
			MAYBE: responseCounts.MAYBE ?? 0,
		},
		expired: statusCounts.EXPIRED ?? 0,
		cancelled: statusCounts.CANCELLED ?? 0,
		responseRate: published > 0 ? Math.round((responded / published) * 100) : 0,
	};
}

// ── Admin list ───────────────────────────────────────────────────
export type InvitationListOptions = {
	page: number;
	limit: number;
	skip: number;
	search?: string;
	response?:
		| "ALL"
		| "CONFIRM"
		| "DECLINE"
		| "MAYBE"
		| "PENDING"
		| "EXPIRED"
		| "CANCELLED";
};

const NOT_RESPONDED_STATUSES: ("RESPONDED" | "EXPIRED" | "CANCELLED")[] = [
	"RESPONDED",
	"EXPIRED",
	"CANCELLED",
];

export async function listInvitations(
	prisma: InvitationDb,
	eventId: string,
	options: InvitationListOptions,
): Promise<{ data: GuestInvitationListItem[]; total: number }> {
	const where: Prisma.GuestInvitationWhereInput = { eventId };

	if (options.search) {
		where.guests = {
			some: {
				guest: { name: { contains: options.search, mode: "insensitive" } },
			},
		};
	}

	switch (options.response) {
		case "CONFIRM":
		case "DECLINE":
		case "MAYBE":
			where.response = options.response;
			break;
		case "PENDING":
			where.status = { notIn: NOT_RESPONDED_STATUSES };
			break;
		case "EXPIRED":
			where.status = "EXPIRED";
			break;
		case "CANCELLED":
			where.status = "CANCELLED";
			break;
		case "ALL":
		case undefined:
			break;
	}

	const [invitations, total] = await Promise.all([
		prisma.guestInvitation.findMany({
			where,
			include: {
				guests: { include: { guest: true } },
			},
			orderBy: { createdAt: "desc" },
			skip: options.skip,
			take: options.limit,
		}),
		prisma.guestInvitation.count({ where }),
	]);

	return { data: invitations, total };
}