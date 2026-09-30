import db from "@muxima/db";

/**
 * Verify that a user is a member of the given event.
 * Throws Error if not.
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
		throw new Error("Não tem permissão para aceder a este evento");
	}

	if (allowedRoles && !allowedRoles.includes(membership.role)) {
		throw new Error("Não tem permissão suficiente para esta operação");
	}
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
