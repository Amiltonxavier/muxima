import db from "@muxima/db";

import { toListItem } from "../../../modules/inventory/service";
import type { ReportColumn, ReportRow } from "../../core/report-definition";
import {
	labelInventoryCategory,
	labelInventoryStatus,
	labelInventoryUnit,
} from "../../core/report-labels";

/**
 * The inventory rows, in one place.
 *
 * Rows go through `toListItem`, the exact mapper the inventory router returns,
 * so planned/current quantities, progress and costs are identical to the screen.
 */

export const INVENTORY_ITEM_COLUMNS: ReportColumn[] = [
	{ header: "Item", key: "name", weight: 2.4 },
	{ header: "Categoria", key: "category", weight: 1.1 },
	{ header: "Estado", key: "status", weight: 1 },
	{
		header: "Planeado",
		key: "plannedQuantity",
		type: "number",
		align: "right",
		weight: 0.8,
	},
	{
		header: "Atual",
		key: "currentQuantity",
		type: "number",
		align: "right",
		weight: 0.7,
	},
	{
		header: "Restante",
		key: "remainingQuantity",
		type: "number",
		align: "right",
		weight: 0.8,
	},
	{ header: "Unidade", key: "unit", weight: 0.8 },
	{
		header: "Progresso",
		key: "completionPercentage",
		type: "percent",
		align: "right",
		weight: 0.8,
	},
	{ header: "Preço unitário", key: "unitPrice", type: "money", weight: 1 },
	{ header: "Valor total", key: "totalValue", type: "money", weight: 1 },
	{ header: "Adquirido", key: "completedValue", type: "money", weight: 1 },
];

export async function loadInventoryRows(eventId: string): Promise<ReportRow[]> {
	const items = await db.inventoryItem.findMany({
		where: { eventId },
		orderBy: [{ category: "asc" }, { name: "asc" }],
	});

	return items.map((item) => {
		const row = toListItem(item);
		return {
			name: row.name,
			category: labelInventoryCategory(row.category),
			status: labelInventoryStatus(row.status),
			plannedQuantity: row.plannedQuantity,
			currentQuantity: row.currentQuantity,
			remainingQuantity: row.remainingQuantity,
			unit: labelInventoryUnit(row.unit),
			completionPercentage: row.completionPercentage,
			unitPrice: row.unitPrice,
			totalValue: row.totalValue,
			completedValue: row.completedValue,
		};
	});
}
