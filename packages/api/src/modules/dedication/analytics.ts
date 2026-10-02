import db from "@muxima/db";
import type { PrismaClient } from "@muxima/db/prisma";
import type { DedicationStats } from "../../shared/types/entities";
import { DedicationService } from "./service";

/**
 * Dedication analytics.
 *
 * Delegates to `DedicationService.getStats`, which is scoped to what the caller
 * may see (owned + explicitly shared). The report never aggregates dedications
 * itself, so the privacy model of the module is preserved exactly: a viewer sees
 * statistics about their own grants, never about private texts.
 */
export type { DedicationStats };

export async function getDedicationAnalytics(
	client: PrismaClient,
	eventId: string,
	userId: string,
): Promise<DedicationStats> {
	return DedicationService.getStats(client, { eventId, userId });
}

export const dedicationAnalytics = {
	get: (eventId: string, userId: string) =>
		getDedicationAnalytics(db, eventId, userId),
};
