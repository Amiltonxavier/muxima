import db from "@muxima/db";
import type { PrismaClient } from "@muxima/db/prisma";
import type { InventoryStats } from "../../shared/types/entities";
import { InventoryService } from "./service";

/**
 * Inventory analytics.
 *
 * Delegates to `InventoryService.getStats`, the same service the inventory
 * router uses. The report never re-derives quantities or costs.
 */

export type { InventoryStats };

export async function getInventoryAnalytics(
	client: PrismaClient,
	eventId: string,
): Promise<InventoryStats> {
	return InventoryService.getStats(client, eventId);
}

export const inventoryAnalytics = {
	get: (eventId: string) => getInventoryAnalytics(db, eventId),
};
