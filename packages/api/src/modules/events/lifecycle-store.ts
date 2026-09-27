import db from "@muxima/db";

import type { EventStatus } from "@muxima/db/prisma";

/**
 * Persistence boundary for the lazy lifecycle. Kept separate from the pure
 * functions in `lifecycle.ts` so the derivation logic is unit-testable
 * without a database.
 */
export const lifecycleStore = {
	async persistStatus(eventId: string, status: EventStatus): Promise<void> {
		await db.event.update({
			where: { id: eventId },
			data: { status },
		});
	},
};

// Re-exported indirection used by `syncEventLifecycle` to avoid a circular
// import between the lifecycle module and the db client in test runners.
export async function deriveStatusForEvent(
	eventId: string,
	status: EventStatus,
): Promise<void> {
	return lifecycleStore.persistStatus(eventId, status);
}
