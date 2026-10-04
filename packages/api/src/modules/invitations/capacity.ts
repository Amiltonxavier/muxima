import type { Prisma, PrismaClient } from "@muxima/db/prisma";
import { BadRequestError, ConflictError } from "../../shared/errors/app-error";
import { INVITATION_CODES } from "../../shared/errors/codes";

/**
 * Capacity of a single invitation: how many PEOPLE (guests + companions) it
 * may hold. One rule, one message, enforced by the backend on every operation
 * that can increase the number of people of an invitation:
 *
 *   - creating an invitation (`createInvitation`);
 *   - adding a companion (`guests.addCompanion`);
 *   - any future endpoint that grows the guest list of an invitation.
 *
 * The value comes from `Event.maxGuestsPerInvitation` (database default: 2)
 * and is re-read from the database on every operation — never from the
 * client payload.
 */

/** Database default: every new event starts with 2 people per invitation. */
export const DEFAULT_MAX_GUESTS_PER_INVITATION = 2;

/** Accepted range for the user-configurable limit (validated by the API). */
export const MIN_MAX_GUESTS_PER_INVITATION = 1;
export const MAX_MAX_GUESTS_PER_INVITATION = 20;

export type InvitationCapacityInput = {
	/** `Event.maxGuestsPerInvitation`. */
	maxPeople: number;
	/** People already in the invitation (or in the guest's party). */
	currentPeople: number;
	/** People the operation wants to add. */
	addedPeople: number;
};

/** The single PT-PT capacity message, with the correct singular/plural. */
export function invitationCapacityMessage(maxPeople: number): string {
	const noun = maxPeople === 1 ? "pessoa" : "pessoas";
	return `Este convite permite no máximo ${maxPeople} ${noun}.`;
}

/**
 * Throws `400 INVITATION_CAPACITY_REACHED` (PT-PT) when the operation would
 * push the invitation above its limit. Never a plain `Error`.
 */
export function assertInvitationCapacity(input: InvitationCapacityInput): void {
	const total = input.currentPeople + input.addedPeople;
	if (total <= input.maxPeople) return;

	throw new BadRequestError(invitationCapacityMessage(input.maxPeople), {
		code: INVITATION_CODES.CAPACITY_REACHED,
	});
}

export type CapacityDb = Prisma.TransactionClient | PrismaClient;

/**
 * People of one invitation: every linked guest plus their companions.
 * A guest counts as 1 person, each companion as 1 more.
 */
export async function countInvitationPeople(
	prisma: CapacityDb,
	invitationId: string,
): Promise<number> {
	const invitation = await prisma.guestInvitation.findUnique({
		where: { id: invitationId },
		select: {
			guests: {
				select: {
					guest: { select: { _count: { select: { companions: true } } } },
				},
			},
		},
	});
	if (!invitation) return 0;

	return countGuestsPeople(invitation.guests.map(({ guest }) => guest));
}

/**
 * People a set of guests represents: 1 per guest + their companions.
 */
export function countGuestsPeople(
	guests: Array<{ _count: { companions: number } }>,
): number {
	return guests.reduce(
		(total, guest) => total + 1 + guest._count.companions,
		0,
	);
}

export type InvitationPeopleViolation = {
	invitationId: string;
	code: string;
	people: number;
};

/**
 * Invitations that already hold more people than `maxPeople`.
 * Used by the limit configuration to explain exactly what must be corrected.
 */
export async function findInvitationsOverCapacity(
	prisma: CapacityDb,
	eventId: string,
	maxPeople: number,
): Promise<InvitationPeopleViolation[]> {
	const invitations = await prisma.guestInvitation.findMany({
		where: { eventId },
		select: {
			id: true,
			code: true,
			guests: {
				select: {
					guest: { select: { _count: { select: { companions: true } } } },
				},
			},
		},
	});

	return invitations
		.map((invitation) => ({
			invitationId: invitation.id,
			code: invitation.code,
			people: countGuestsPeople(invitation.guests.map(({ guest }) => guest)),
		}))
		.filter((invitation) => invitation.people > maxPeople);
}

/**
 * Guard used when the user LOWERS `Event.maxGuestsPerInvitation`:
 * existing invitations are never silently changed, so a limit that would
 * leave data invalid is rejected with `409 INVITATION_CAPACITY_REACHED` and
 * the exact list of invitations to correct.
 */
export async function assertMaxGuestsPerInvitationIsRespected(
	prisma: CapacityDb,
	eventId: string,
	maxPeople: number,
): Promise<void> {
	const violations = await findInvitationsOverCapacity(
		prisma,
		eventId,
		maxPeople,
	);
	if (violations.length === 0) return;

	const codes = violations
		.slice(0, 5)
		.map((violation) => violation.code)
		.join(", ");
	const suffix = violations.length > 5 ? "…" : "";

	throw new ConflictError(
		`Não é possível aplicar este limite: existem convites com mais de ${maxPeople} pessoas (${codes}${suffix}). Corrija primeiro os convites indicados.`,
		{
			code: INVITATION_CODES.CAPACITY_REACHED,
			details: { maxPeople, violations },
		},
	);
}
