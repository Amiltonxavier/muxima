import db from "@muxima/db";
import type { PrismaClient } from "@muxima/db/prisma";
import type { InventoryStats } from "../../shared/types/entities";
import { InventoryRepository } from "./repository";
import { InventoryService, roundMoney, toNumber } from "./service";

/**
 * Inventory analytics.
 *
 * Delegates to `InventoryService.getStats`, the same service the inventory
 * router uses. The report never re-derives quantities or costs.
 */

export type { InventoryStats };

/** One bar of the costliest-items chart, already ranked by the backend. */
export type InventoryCostPoint = {
	/** Item name, the chart category. */
	label: string;
	/** Total planned cost of the item (`plannedQuantity x unitPrice`). */
	value: number;
};

/**
 * Pure ranking of the most expensive inventory items. The cost of each item is
 * `plannedQuantity x unitPrice` — the same definition used by the stats card —
 * so the chart can never disagree with the KPI. Items worth 0 are dropped and
 * the rest are ranked heaviest first.
 */
export function buildCostliestItems(
	items: Array<{
		name: string;
		plannedQuantity: number;
		unitPrice: number | null;
	}>,
	limit = 5,
): InventoryCostPoint[] {
	return items
		.map((item) => ({
			label: item.name,
			value: roundMoney(item.plannedQuantity * (item.unitPrice ?? 0)),
		}))
		.filter((point) => point.value > 0)
		.sort((a, b) => b.value - a.value)
		.slice(0, limit);
}

export async function getInventoryAnalytics(
	client: PrismaClient,
	eventId: string,
): Promise<InventoryStats> {
	return InventoryService.getStats(client, eventId);
}

/**
 * Loads the rows, converts the Prisma `Decimal`s and hands them to the pure
 * ranking. Every figure is computed here: the client only renders the result.
 */
export async function getCostliestInventoryItems(
	client: PrismaClient,
	eventId: string,
	limit?: number,
): Promise<InventoryCostPoint[]> {
	const rows = await InventoryRepository.findMetricsRows(client, eventId);
	return buildCostliestItems(
		rows.map((row) => ({
			name: row.name,
			plannedQuantity: toNumber(row.plannedQuantity),
			unitPrice: row.unitPrice === null ? null : toNumber(row.unitPrice),
		})),
		limit,
	);
}

export const inventoryAnalytics = {
	get: (eventId: string) => getInventoryAnalytics(db, eventId),
};
