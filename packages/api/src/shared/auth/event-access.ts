import db from "@muxima/db";
import { ForbiddenError, NotFoundError } from "../errors/app-error";
import { EVENT_CODES } from "../errors/codes";
import { assertEventIsMutable } from "../events/event-lock";

/**
 * Verify that a user is an ACTIVE member of the given event.
 *
 * Throws a `ForbiddenError` (`403 EVENT_ACCESS_DENIED`) so an authorization
 * failure can never surface as a `500`. Used by every oRPC procedure and REST
 * route that touches event-scoped data.
 */
export async function requireEventAccess(
	userId: string,
	eventId: string,
	allowedRoles?: string[],
): Promise<void> {
	const membership = await db.eventMember.findFirst({
		where: {
			eventId,
			userId,
			status: "ACTIVE",
		},
	});

	if (!membership) {
		throw new ForbiddenError("Não tem acesso a este evento", {
			code: "EVENT_ACCESS_DENIED",
		});
	}

	if (allowedRoles && !allowedRoles.includes(membership.role)) {
		throw new ForbiddenError(
			"Não tem permissão suficiente para esta operação",
			{
				code: "EVENT_ROLE_REQUIRED",
			},
		);
	}
}

/**
 * Assert that the event currently accepts mutations (`EVENT_LOCKED`).
 *
 * The event row is re-read on every call so the check always uses the
 * CURRENT state — nothing sent by the client is trusted. Throws the standard
 * `409 EVENT_LOCKED` envelope (PT-PT message), never a plain `Error`.
 */
export async function assertEventIsMutableById(eventId: string): Promise<void> {
	const event = await db.event.findUnique({
		where: { id: eventId },
		select: { status: true, eventDate: true, startTime: true },
	});

	if (!event) {
		throw new NotFoundError("Evento não encontrado", {
			code: EVENT_CODES.NOT_FOUND,
		});
	}

	assertEventIsMutable(event);
}

/**
 * Every guard an event-scoped MUTATION needs: active membership (and role,
 * when supplied) plus the global operational lock (`EVENT_LOCKED`).
 *
 * Read-only procedures keep using `requireEventAccess`. Maintenance of the
 * event itself (editing its fields, changing its status, deleting it) is not
 * an event-data mutation and therefore does not go through this guard.
 */
export async function requireEventMutable(
	userId: string,
	eventId: string,
	allowedRoles?: string[],
): Promise<void> {
	await requireEventAccess(userId, eventId, allowedRoles);
	await assertEventIsMutableById(eventId);
}

/**
 * Get the eventId for a resource by entity type and ID.
 * Returns null if not found.
 */
export async function getEventIdForResource(
	entity:
		| "guest"
		| "task"
		| "supplier"
		| "inventoryItem"
		| "foodPlan"
		| "checklistItem"
		| "schedule",
	resourceId: string,
): Promise<string | null> {
	switch (entity) {
		case "guest": {
			const g = await db.guest.findUnique({
				where: { id: resourceId },
				select: { eventId: true },
			});
			return g?.eventId ?? null;
		}
		case "task": {
			const t = await db.task.findUnique({
				where: { id: resourceId },
				select: { eventId: true },
			});
			return t?.eventId ?? null;
		}
		case "supplier": {
			const s = await db.supplier.findUnique({
				where: { id: resourceId },
				select: { eventId: true },
			});
			return s?.eventId ?? null;
		}
		case "inventoryItem": {
			const i = await db.inventoryItem.findUnique({
				where: { id: resourceId },
				select: { eventId: true },
			});
			return i?.eventId ?? null;
		}
		case "foodPlan": {
			const f = await db.foodPlan.findUnique({
				where: { id: resourceId },
				select: { eventId: true },
			});
			return f?.eventId ?? null;
		}
		case "checklistItem": {
			const c = await db.checklistItem.findUnique({
				where: { id: resourceId },
				select: { eventId: true },
			});
			return c?.eventId ?? null;
		}
		case "schedule": {
			const s = await db.schedule.findUnique({
				where: { id: resourceId },
				select: { eventId: true },
			});
			return s?.eventId ?? null;
		}
		default:
			return null;
	}
}
