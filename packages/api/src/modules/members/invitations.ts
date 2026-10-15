import { randomBytes } from "node:crypto";
import db from "@muxima/db";
import type { InvitationStatus, MemberRole, Prisma } from "@muxima/db/prisma";
import { MailService } from "@muxima/mail";
import {
	ConflictError,
	ForbiddenError,
	NotFoundError,
} from "../../shared/errors/app-error";
import { MEMBER_CODES } from "../../shared/errors/codes";
import {
	memberInviteDeclineUrl,
	memberInvitePageUrl,
	roleLabel,
} from "../../shared/mail";
import { NotificationService } from "../notifications/service";
import type { MemberInviteNotificationData } from "../notifications/types";

/**
 * The member-invitation lifecycle, shared by every surface.
 *
 * Core rule: being invited is NOT being a member. An invitation is a PENDING
 * `EventInvitation`; the `EventMember` row is created — once — only when the
 * invited account accepts, and only through this module's `acceptInvitation`.
 *
 * Anti-duplication is enforced twice: `pendingKey` gives the database a unique
 * constraint over `(eventId,email)` while PENDING, and the service re-checks in
 * code so repeated requests get a clean conflict instead of a Prisma error.
 */

export const MEMBER_INVITATION_TTL_DAYS = 7;

/** Settled invitations drop their `pendingKey`, freeing the unique slot. */
function pendingKeyFor(eventId: string, email: string): string {
	return `${eventId}:${email.trim().toLowerCase()}`;
}

function isUniqueViolation(error: unknown): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		error.code === "P2002"
	);
}

const INVITATION_SELECT = {
	id: true,
	eventId: true,
	email: true,
	phone: true,
	role: true,
	token: true,
	status: true,
	expiresAt: true,
	invitedBy: true,
	event: { select: { name: true } },
	inviter: { select: { name: true } },
} satisfies Prisma.EventInvitationSelect;

export type LoadedInvitation = NonNullable<
	Awaited<ReturnType<typeof loadInvitationByToken>>
>;

export function loadInvitationByToken(token: string) {
	return db.eventInvitation.findFirst({
		where: { token },
		select: INVITATION_SELECT,
	});
}

export function loadInvitationById(id: string) {
	return db.eventInvitation.findUnique({
		where: { id },
		select: INVITATION_SELECT,
	});
}

export function listPendingForEmail(email: string) {
	const now = new Date();
	return db.eventInvitation.findMany({
		where: {
			email: { equals: email, mode: "insensitive" },
			status: "PENDING",
			expiresAt: { gt: now },
		},
		select: {
			id: true,
			eventId: true,
			role: true,
			expiresAt: true,
			createdAt: true,
			event: {
				select: {
					name: true,
					type: true,
					status: true,
					eventDate: true,
					venueName: true,
				},
			},
			inviter: { select: { name: true } },
		},
		orderBy: { createdAt: "desc" },
	});
}

export function countPendingForEmail(email: string) {
	return db.eventInvitation.count({
		where: {
			email: { equals: email, mode: "insensitive" },
			status: "PENDING",
			expiresAt: { gt: new Date() },
		},
	});
}

/**
 * Revoke a still-PENDING invitation, from the event's team screen.
 *
 * Cancelling (instead of deleting) keeps the audit trail and, crucially, clears
 * `pendingKey`: that is the slot a later re-invitation for the same e-mail
 * needs to be allowed. Callers must reject a settled invitation first.
 */
export function cancelInvitation(id: string) {
	return db.eventInvitation.update({
		where: { id },
		data: {
			status: "CANCELLED" satisfies InvitationStatus,
			pendingKey: null,
		},
	});
}

/**
 * Validate that the signed-in account may claim this invitation. Throws the
 * exact domain errors the token path already surfaced; a wrong account learns
 * nothing beyond "not yours" (never the event name).
 */
export function assertClaimable(
	invitation: LoadedInvitation | null,
	userEmail: string,
): asserts invitation is LoadedInvitation {
	if (!invitation) {
		throw new NotFoundError("Convite não encontrado", {
			code: MEMBER_CODES.INVITE_NOT_FOUND,
		});
	}
	if (
		invitation.email !== null &&
		invitation.email.toLowerCase() !== userEmail.toLowerCase()
	) {
		throw new ForbiddenError("Este convite não pertence a esta conta", {
			code: MEMBER_CODES.INVITE_EMAIL_MISMATCH,
		});
	}
	if (invitation.expiresAt.getTime() <= Date.now()) {
		throw new ConflictError("Este convite já expirou", {
			code: MEMBER_CODES.INVITE_EXPIRED,
		});
	}
	if (invitation.status !== "PENDING") {
		throw new ConflictError("Este convite já foi utilizado", {
			code: MEMBER_CODES.INVITE_ALREADY_USED,
		});
	}
}

/**
 * Create (or reject as duplicate) a PENDING member invitation, then e-mail it
 * and notify the invitee in-app + in realtime.
 *
 * The membership row is deliberately NOT created here.
 */
export async function inviteMember(input: {
	eventId: string;
	email: string;
	role: Exclude<MemberRole, "OWNER">;
	invitedBy: string;
}) {
	const email = input.email.trim();
	const [event, inviter, existingMember, pending] = await Promise.all([
		db.event.findUnique({
			where: { id: input.eventId },
			select: { id: true, name: true },
		}),
		db.user.findUnique({
			where: { id: input.invitedBy },
			select: { name: true },
		}),
		db.eventMember.findFirst({
			where: { eventId: input.eventId, user: { email } },
			select: { id: true },
		}),
		db.eventInvitation.findFirst({
			where: {
				eventId: input.eventId,
				email: { equals: email, mode: "insensitive" },
				status: "PENDING",
			},
			select: { id: true },
		}),
	]);

	if (!event) {
		throw new NotFoundError("Evento não encontrado", {
			code: "EVENT_NOT_FOUND",
		});
	}
	if (existingMember) {
		throw new ConflictError("Este utilizador já é membro do evento", {
			code: MEMBER_CODES.ALREADY_EXISTS,
		});
	}
	if (pending) {
		throw new ConflictError("Já existe um convite pendente para este email", {
			code: MEMBER_CODES.INVITE_ALREADY_PENDING,
		});
	}

	let invitation: { id: string; token: string };
	try {
		invitation = await db.eventInvitation.create({
			data: {
				eventId: input.eventId,
				invitedBy: input.invitedBy,
				email,
				role: input.role,
				token: randomBytes(32).toString("base64url"),
				expiresAt: new Date(
					Date.now() + MEMBER_INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000,
				),
				pendingKey: pendingKeyFor(input.eventId, email),
			},
			select: { id: true, token: true },
		});
	} catch (error) {
		// Lost the race against a parallel invite for the same (event, email).
		if (isUniqueViolation(error)) {
			throw new ConflictError("Já existe um convite pendente para este email", {
				code: MEMBER_CODES.INVITE_ALREADY_PENDING,
			});
		}
		throw error;
	}

	// Delivery is best-effort (never throws), so an SMTP failure cannot leave
	// the invitation unrecorded.
	await MailService.sendMemberInvitation({
		to: email,
		eventName: event.name,
		invitedBy: inviter?.name,
		roleLabel: roleLabel(input.role),
		acceptUrl: memberInvitePageUrl(invitation.token),
		declineUrl: memberInviteDeclineUrl(invitation.token),
		expiresInDays: MEMBER_INVITATION_TTL_DAYS,
	});

	// In-app + realtime notification, only if the invitee already has an
	// account. Inviting an unregistered e-mail still works (the e-mail carries
	// the token); there is simply no inbox to notify yet.
	const invitee = await db.user.findUnique({
		where: { email },
		select: { id: true },
	});
	if (invitee) {
		const data: MemberInviteNotificationData = {
			kind: "MEMBER_INVITE",
			invitationId: invitation.id,
			eventId: event.id,
			eventName: event.name,
			role: input.role,
			inviterName: inviter?.name ?? null,
		};
		await NotificationService.notify({
			userId: invitee.id,
			eventId: event.id,
			type: "MEMBERS",
			title: "Convite para colaborar num evento",
			message: `${inviter?.name ?? "Alguém"} convidou-te para a equipa de "${event.name}" como ${roleLabel(input.role)}.`,
			priority: "IMPORTANT",
			data,
		});
	}

	return invitation;
}

/**
 * Accept an invitation, transactionally: the invitation flips to ACCEPTED
 * (losing its `pendingKey`) and exactly one ACTIVE membership is created. If
 * the membership already exists the unique constraint turns the race into a
 * clean conflict instead of a duplicate.
 */
export async function acceptInvitation(
	invitation: LoadedInvitation,
	user: { id: string; name: string },
) {
	try {
		const member = await db.$transaction(async (tx) => {
			await tx.eventInvitation.update({
				where: { id: invitation.id },
				data: {
					status: "ACCEPTED",
					acceptedAt: new Date(),
					respondedBy: user.id,
					pendingKey: null,
				},
			});

			const roleRef = await tx.role.findUnique({
				where: { name: invitation.role as MemberRole },
				select: { id: true },
			});

			return tx.eventMember.create({
				data: {
					eventId: invitation.eventId,
					userId: user.id,
					role: invitation.role as MemberRole,
					status: "ACTIVE",
					joinedAt: new Date(),
					roleId: roleRef?.id ?? null,
				},
			});
		});

		await safeNotify(() =>
			notifyOwnerOfResponse(invitation, "ACCEPTED", user.name),
		);

		return { member, eventName: invitation.event.name };
	} catch (error) {
		if (isUniqueViolation(error)) {
			// A parallel accept already created the membership. Settle the
			// invitation anyway so no stray PENDING row lingers, then report.
			await db.eventInvitation
				.update({
					where: { id: invitation.id },
					data: {
						status: "ACCEPTED",
						acceptedAt: new Date(),
						respondedBy: user.id,
						pendingKey: null,
					},
				})
				.catch(() => {});
			throw new ConflictError("Já és membro deste evento", {
				code: MEMBER_CODES.ALREADY_EXISTS,
			});
		}
		throw error;
	}
}

/**
 * Reject an invitation. No membership is ever created. Repeated rejections are
 * rejected up-front by `assertClaimable`, so no duplicate owner notification.
 */
export async function declineInvitation(
	invitation: LoadedInvitation,
	user: { id: string; name: string },
) {
	await db.eventInvitation.update({
		where: { id: invitation.id },
		data: {
			status: "REJECTED" satisfies InvitationStatus,
			respondedBy: user.id,
			pendingKey: null,
		},
	});

	await safeNotify(() =>
		notifyOwnerOfResponse(invitation, "REJECTED", user.name),
	);

	return { success: true, eventName: invitation.event.name };
}

/**
 * Post-commit side effects (owner notification) must never turn a successful
 * accept/decline into a 5xx: the invitation is already settled, and a missing
 * notification is a far smaller problem than a misleading error. Failures are
 * logged, not swallowed silently.
 */
async function safeNotify(fn: () => Promise<unknown>): Promise<void> {
	try {
		await fn();
	} catch (error) {
		console.error("[members] notification failed", error);
	}
}

/** Tell the event owner (or, if that is the inviter, the inviter) the outcome. */
async function notifyOwnerOfResponse(
	invitation: LoadedInvitation,
	status: "ACCEPTED" | "REJECTED",
	responderName: string,
) {
	const event = await db.event.findUnique({
		where: { id: invitation.eventId },
		select: { ownerId: true, name: true },
	});
	if (!event) return;

	const verb = status === "ACCEPTED" ? "aceitou" : "recusou";
	await NotificationService.notify({
		userId: event.ownerId,
		eventId: invitation.eventId,
		type: "MEMBERS",
		title: status === "ACCEPTED" ? "Convite aceite" : "Convite recusado",
		message: `${responderName} ${verb} o convite para ${roleLabel(invitation.role)} do evento "${event.name}".`,
		priority: "INFO",
		data: {
			kind: "MEMBER_INVITE_RESPONSE",
			invitationId: invitation.id,
			eventId: invitation.eventId,
			eventName: event.name,
			status,
			memberName: responderName,
			role: invitation.role,
		},
	});
}
