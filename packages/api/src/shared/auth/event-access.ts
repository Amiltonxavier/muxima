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
		| "vendor"
		| "inventoryItem"
		| "document"
		| "expense"
		| "budgetCategory"
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
		case "vendor": {
			const v = await db.vendor.findUnique({
				where: { id: resourceId },
				select: { eventId: true },
			});
			return v?.eventId ?? null;
		}
		case "inventoryItem": {
			const i = await db.inventoryItem.findUnique({
				where: { id: resourceId },
				select: { eventId: true },
			});
			return i?.eventId ?? null;
		}
		case "document": {
			const d = await db.document.findUnique({
				where: { id: resourceId },
				select: { eventId: true },
			});
			return d?.eventId ?? null;
		}
		case "expense": {
			const e = await db.expense.findUnique({
				where: { id: resourceId },
				select: { eventId: true },
			});
			return e?.eventId ?? null;
		}
		case "budgetCategory": {
			const bc = await db.budgetCategory.findUnique({
				where: { id: resourceId },
				select: { eventId: true },
			});
			return bc?.eventId ?? null;
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
