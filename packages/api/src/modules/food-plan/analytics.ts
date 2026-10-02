import db from "@muxima/db";
import type { PrismaClient } from "@muxima/db/prisma";
import type { FoodPlanStats } from "./stats";
import { getFoodPlanStats } from "./stats";

/**
 * Food plan analytics. Delegates to the shared `getFoodPlanStats`, which the
 * food-plan and checklist routers already use.
 */
export type { FoodPlanStats };

export async function getFoodPlanAnalytics(
	_client: PrismaClient,
	eventId: string,
): Promise<FoodPlanStats> {
	return getFoodPlanStats(eventId);
}

export const foodPlanAnalytics = {
	get: (eventId: string) => getFoodPlanAnalytics(db, eventId),
};
