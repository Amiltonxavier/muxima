import { randomBytes } from "node:crypto";

import type { Prisma, PrismaClient } from "@muxima/db/prisma";
import {
	BadRequestError,
	ForbiddenError,
	NotFoundError,
} from "../../shared/errors/app-error";
import type {
	BulkPublishError,
	BulkPublishItemResult,
	BulkPublishResult,
	InvitationResponse,
	InvitationStats,
	PublicInvitation,
	PublicInvitationLookup,
} from "../../shared/types/entities";
import { buildInvitationQrPayload, buildInvitationUrl } from "./qr-code";
import { MAX_BULK_INVITATION_IDS } from "./schemas";

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
const CODE_LENGTH = 8;
const CODE_MAX_ATTEMPTS = 5;

export function generateInvitationCode(): string {
	const bytes = randomBytes(CODE_LENGTH);
	return Array.from(
		bytes,
		(byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length],
	).join("");
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

	// Invitations published before the QR Code feature have neither `url` nor
	// `qrCode` stored. Backfill lazily on the first public read so the guest
	// page always has a scannable code, without needing a data migration.
	if (!invitation.qrCode || !invitation.url) {
		const payload = await buildInvitationQrPayload(invitation.code);
		invitation.url = payload.url;
		invitation.qrCode = payload.qrCode;
		await prisma.guestInvitation.update({
			where: { id: invitation.id },
			data: { url: payload.url, qrCode: payload.qrCode },
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
		// Backfilled for invitations created before the QR Code feature existed.
		url: invitation.url ?? buildInvitationUrl(invitation.code),
		qrCode: invitation.qrCode,
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
		throw new NotFoundError("Convite não encontrado");
	}

	if (options.publishRequired && invitation.publishedAt === null) {
		throw new NotFoundError("Convite não encontrado");
	}

	if (invitation.status === "CANCELLED") {
		throw new BadRequestError("Este convite foi cancelado");
	}

	if (isInvitationExpired(invitation)) {
		throw new BadRequestError("Este convite expirou");
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
		throw new BadRequestError("A capacidade máxima do evento já foi atingida");
	}
}

// ── Create ───────────────────────────────────────────────────────
export async function createInvitation(
	prisma: InvitationDb,
	input: { eventId: string; guestIds: string[] },
): Promise<GuestInvitationCreated> {
	// Every guest must belong to the event, otherwise the invitation would link
	// guests from another event.
	const validGuests = await prisma.guest.findMany({
		where: { eventId: input.eventId, id: { in: input.guestIds } },
		select: { id: true },
	});

	if (validGuests.length !== input.guestIds.length) {
		throw new BadRequestError(
			"Um ou mais convidados não pertencem a este evento",
		);
	}

	for (let attempt = 0; attempt < CODE_MAX_ATTEMPTS; attempt++) {
		const code = generateInvitationCode();
		// QR Code is generated up-front so the invitation is shareable the
		// moment it exists — no client-side generation, no lazy re-render.
		const { url, qrCode } = await buildInvitationQrPayload(code);

		try {
			return await prisma.guestInvitation.create({
				data: {
					eventId: input.eventId,
					code,
					url,
					qrCode,
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
	throw new BadRequestError(
		"Não foi possível gerar um código de convite único",
	);
}

// ── Publication ──────────────────────────────────────────────────
/**
 * A guest is publishable while they have a usable contact channel. Publishing a
 * "DECLINED"/"CANCELLED" invitation would send a link nobody should use.
 */
const PUBLISHABLE_GUEST_STATUSES = ["PENDING", "CONFIRMED", "MAYBE", "WAITING"];

type PublishCandidate = {
	id: string;
	code: string;
	eventId: string;
	status: string;
	publishedAt: Date | null;
	expiresAt: Date | null;
	url: string | null;
	qrCode: string | null;
	_count: { guests: number };
};

type PublishValidationError =
	| { code: "NOT_FOUND"; message: string }
	| { code: "WRONG_EVENT"; message: string }
	| { code: "NO_GUESTS"; message: string }
	| { code: "CANCELLED"; message: string }
	| { code: "EXPIRED"; message: string }
	| { code: "GUEST_NOT_PUBLISHABLE"; message: string }
	| { code: "ALREADY_PUBLISHED"; message: string };

/**
 * Validates a single invitation. The backend is the source of truth — the
 * frontend only uses this to improve UX.
 */
function validatePublishable(
	invitation: PublishCandidate | undefined,
	eventId: string,
	guestStatuses: string[],
): PublishValidationError | null {
	if (!invitation) {
		return { code: "NOT_FOUND", message: "Convite não encontrado" };
	}
	if (invitation.eventId !== eventId) {
		return {
			code: "WRONG_EVENT",
			message: "Convite não pertence a este evento",
		};
	}
	if (invitation._count.guests === 0) {
		return {
			code: "NO_GUESTS",
			message: "Convite sem convidados associados",
		};
	}
	if (invitation.status === "CANCELLED") {
		return { code: "CANCELLED", message: "Convite cancelado" };
	}
	if (isInvitationExpired(invitation)) {
		return { code: "EXPIRED", message: "Convite expirado" };
	}

	const hasPublishableGuest = guestStatuses.some((status) =>
		PUBLISHABLE_GUEST_STATUSES.includes(status),
	);
	if (!hasPublishableGuest) {
		return {
			code: "GUEST_NOT_PUBLISHABLE",
			message: "Nenhum convidado em estado compatível com publicação",
		};
	}

	if (invitation.publishedAt !== null) {
		return {
			code: "ALREADY_PUBLISHED",
			message: "Convite já publicado",
		};
	}

	return null;
}

type BatchOutcome = BulkPublishItemResult & { id: string };

/**
 * Bulk publish.
 *
 * A single `findMany` + a single `updateMany` — the frontend never loops over
 * per-invitation requests. Every id gets its own verdict so partial failures
 * are visible instead of silently swallowed.
 *
 * `scope: "ALL_UNPUBLISHED"` lets the backend resolve the target set itself, so
 * "publish everything" never depends on the client holding every id (and never
 * fights the page limit).
 */
export async function publishInvitationsBatch(
	prisma: InvitationDb,
	input: {
		eventId: string;
		invitationIds: string[];
		scope?: "SELECTED" | "ALL_UNPUBLISHED";
	},
): Promise<BulkPublishResult> {
	const isAllScope = input.scope === "ALL_UNPUBLISHED";

	const invitationIds = isAllScope
		? (
				await prisma.guestInvitation.findMany({
					where: { eventId: input.eventId, publishedAt: null },
					select: { id: true },
					orderBy: { createdAt: "asc" },
					take: MAX_BULK_INVITATION_IDS,
				})
			).map((invitation) => invitation.id)
		: [...new Set(input.invitationIds)];

	if (invitationIds.length === 0) {
		return {
			total: 0,
			published: 0,
			alreadyPublished: 0,
			invalid: 0,
			failed: 0,
			skipped: 0,
			results: [],
			errors: [],
		};
	}

	const invitations = await prisma.guestInvitation.findMany({
		where: { id: { in: invitationIds } },
		select: {
			id: true,
			code: true,
			eventId: true,
			status: true,
			publishedAt: true,
			expiresAt: true,
			url: true,
			qrCode: true,
			_count: { select: { guests: true } },
			guests: { select: { guest: { select: { id: true, status: true } } } },
		},
	});

	const byId = new Map(
		invitations.map((invitation) => [invitation.id, invitation]),
	);

	const outcomes = new Map<string, BatchOutcome>();
	const publishable: PublishCandidate[] = [];

	for (const invitationId of invitationIds) {
		const invitation = byId.get(invitationId);
		// `invitation` is undefined for ids that do not exist (or belong to
		// another event) — that must produce an INVALID verdict, never a crash.
		const guestStatuses = invitation?.guests.map(({ guest }) => guest.status);
		const error = validatePublishable(
			invitation,
			input.eventId,
			guestStatuses ?? [],
		);

		if (!error && invitation) {
			publishable.push(invitation);
			continue;
		}

		outcomes.set(invitationId, {
			id: invitationId,
			invitationId,
			code: invitation?.code ?? null,
			status:
				error?.code === "ALREADY_PUBLISHED" ? "ALREADY_PUBLISHED" : "INVALID",
			error: error?.message,
		});
	}

	if (publishable.length > 0) {
		const publishedAt = new Date();
		try {
			// One atomic statement publishes the whole valid set: either every
			// publishable invitation ends up public, or none does.
			await prisma.guestInvitation.updateMany({
				where: { id: { in: publishable.map((inv) => inv.id) } },
				data: { publishedAt },
			});
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "Não foi possível publicar o convite";

			for (const invitation of publishable) {
				outcomes.set(invitation.id, {
					id: invitation.id,
					invitationId: invitation.id,
					code: invitation.code,
					status: "FAILED",
					error: message,
				});
			}
		}
	}

	// Only reached for invitations the `updateMany` above actually published.
	//
	// The QR Code is a derived asset: invitations created before the feature
	// have none stored, and `getPublicInvitation` already backfills them lazily
	// on read. A QR failure must therefore NOT turn a successful publish into a
	// FAILED verdict — the invitation really is public. Failures are collected
	// as warnings so the caller can surface them without a false negative.
	const publishedOutcomes = publishable.filter(
		(invitation) => outcomes.get(invitation.id) === undefined,
	);

	const qrWarnings = (
		await Promise.all(
			publishedOutcomes
				.filter((inv) => !inv.qrCode || !inv.url)
				.map(async (inv): Promise<BulkPublishError | null> => {
					try {
						const { url, qrCode } = await buildInvitationQrPayload(inv.code);
						await prisma.guestInvitation.update({
							where: { id: inv.id },
							data: { url, qrCode },
						});
						return null;
					} catch (error) {
						return {
							invitationId: inv.id,
							code: inv.code,
							reason:
								error instanceof Error
									? `Publicado, mas o QR Code não pôde ser gerado: ${error.message}`
									: "Publicado, mas o QR Code não pôde ser gerado",
						};
					}
				}),
		)
	).filter((warning): warning is BulkPublishError => warning !== null);

	for (const invitation of publishedOutcomes) {
		outcomes.set(invitation.id, {
			id: invitation.id,
			invitationId: invitation.id,
			code: invitation.code,
			status: "PUBLISHED",
		});
	}

	// Preserve the caller's ordering so the UI can report results per row.
	const results: BulkPublishItemResult[] = invitationIds.map(
		(id) => outcomes.get(id) as BatchOutcome,
	);

	const count = (status: BulkPublishItemResult["status"]) =>
		results.filter((result) => result.status === status).length;

	const published = count("PUBLISHED");
	const alreadyPublished = count("ALREADY_PUBLISHED");
	const invalid = count("INVALID");
	const failed = count("FAILED");

	return {
		total: invitationIds.length,
		published,
		alreadyPublished,
		invalid,
		failed,
		skipped: alreadyPublished + invalid,
		results,
		errors: [
			...results
				.filter((result) => result.status !== "PUBLISHED")
				.map((result) => ({
					invitationId: result.invitationId,
					code: result.code,
					reason: result.error ?? result.status,
				})),
			...qrWarnings,
		],
	};
}

/** Publish a single invitation. Delegates to the batch flow so rules never drift. */
export async function publishInvitation(
	prisma: InvitationDb,
	input: { eventId: string; invitationId: string },
): Promise<GuestInvitationListItem> {
	const result = await publishInvitationsBatch(prisma, {
		eventId: input.eventId,
		invitationIds: [input.invitationId],
	});

	const [outcome] = result.results;
	if (!outcome) {
		throw new NotFoundError("Convite não encontrado");
	}

	if (
		outcome.status === "PUBLISHED" ||
		outcome.status === "ALREADY_PUBLISHED"
	) {
		// Re-publishing is a no-op, not an error: the caller asked for the
		// invitation to be public and it already is.
		return getInvitationById(prisma, input);
	}
	if (outcome.status === "INVALID") {
		throw new BadRequestError(
			outcome.error ?? "Convite inválido para publicação",
		);
	}

	throw new NotFoundError(outcome.error ?? "Convite não encontrado");
}

/** Withdraw a published invitation so the public link stops resolving. */
export async function unpublishInvitation(
	prisma: InvitationDb,
	input: { eventId: string; invitationId: string },
): Promise<GuestInvitationListItem> {
	const invitation = await prisma.guestInvitation.findUnique({
		where: { id: input.invitationId },
		select: { eventId: true },
	});

	if (!invitation) throw new NotFoundError("Convite não encontrado");
	assertSameEvent(invitation.eventId, input.eventId);

	return prisma.guestInvitation.update({
		where: { id: input.invitationId },
		data: { publishedAt: null },
		include: { guests: { include: { guest: true } } },
	});
}

/** Fetch a single invitation with its guests, verifying event ownership. */
export async function getInvitationById(
	prisma: InvitationDb,
	input: { eventId: string; invitationId: string },
): Promise<GuestInvitationListItem> {
	const invitation = await prisma.guestInvitation.findUnique({
		where: { id: input.invitationId },
		include: { guests: { include: { guest: true } } },
	});

	if (!invitation) throw new NotFoundError("Convite não encontrado");
	assertSameEvent(invitation.eventId, input.eventId);

	return invitation;
}

function assertSameEvent(invitationEventId: string, expectedEventId: string) {
	if (invitationEventId !== expectedEventId) {
		throw new ForbiddenError("Convite não pertence a este evento");
	}
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
