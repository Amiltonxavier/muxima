import db from "@muxima/db";
import { getInventoryAnalytics } from "../../modules/inventory/analytics";
import type { ExportContext } from "../core/export-context";
import { formatMoney, formatNumber } from "../core/format";
import type {
	ReportColumn,
	ReportDefinition,
	ReportRow,
} from "../core/report-definition";
import { labelMovementType } from "../core/report-labels";
import { INVENTORY_ITEM_COLUMNS, loadInventoryRows } from "./rows/inventory";

/**
 * Inventory report: every item of the event plus its movement history.
 *
 * Item rows reuse `toListItem`, the exact mapper the inventory router returns,
 * so planned/current quantities and costs are identical to the screen.
 */

const MOVEMENT_COLUMNS: ReportColumn[] = [
	{ header: "Data", key: "createdAt", type: "datetime", weight: 1.2 },
	{ header: "Item", key: "item", weight: 2.2 },
	{ header: "Tipo", key: "type", weight: 1.1 },
	{
		header: "Quantidade",
		key: "quantity",
		type: "number",
		align: "right",
		weight: 0.9,
	},
	{ header: "Custo total", key: "totalCost", type: "money", weight: 1 },
	{ header: "Motivo", key: "reason", weight: 1.6 },
	{ header: "Registado por", key: "creator", weight: 1.6 },
];

export async function buildInventoryReport(
	eventId: string,
	context: ExportContext,
): Promise<ReportDefinition> {
	const currency = context.event?.currency ?? "AOA";

	const [stats, itemRows, movements] = await Promise.all([
		getInventoryAnalytics(db, eventId),
		loadInventoryRows(eventId),
		db.inventoryMovement.findMany({
			where: { inventoryItem: { eventId } },
			include: {
				inventoryItem: { select: { name: true } },
				creator: { select: { name: true } },
			},
			orderBy: { createdAt: "desc" },
		}),
	]);

	const movementRows: ReportRow[] = movements.map((movement) => ({
		createdAt: movement.createdAt,
		item: movement.inventoryItem.name,
		type: labelMovementType(movement.type),
		quantity: Number(movement.quantity),
		totalCost: movement.totalCost === null ? null : Number(movement.totalCost),
		reason: movement.reason ?? "—",
		creator: movement.creator.name,
	}));

	return {
		title: "Relatório de Inventário",
		subtitle: "Itens planeados, quantidades, custos e movimentações do evento",
		sections: [
			{
				kind: "kpis",
				title: "Resumo",
				items: [
					{ label: "Total de itens", value: formatNumber(stats.totalItems) },
					{ label: "Concluídos", value: formatNumber(stats.completedItems) },
					{ label: "Em progresso", value: formatNumber(stats.inProgressItems) },
					{ label: "Pendentes", value: formatNumber(stats.pendingItems) },
					{
						label: "Progresso",
						value: `${formatNumber(stats.completionPercentage)}%`,
					},
					{
						label: "Valor total",
						value: formatMoney(stats.totalValue, currency),
					},
					{
						label: "Valor pendente",
						value: formatMoney(stats.pendingValue, currency),
					},
					{ label: "Movimentações", value: formatNumber(stats.movementCount) },
				],
			},
			{
				kind: "table",
				title: "Itens de inventário",
				sheetName: "Itens",
				columns: INVENTORY_ITEM_COLUMNS,
				rows: itemRows,
				emptyMessage: "Nenhum item de inventário registado.",
				totals: {
					label: "Total",
					values: {
						totalValue: stats.totalValue,
						completedValue: stats.completedValue,
						pendingValue: stats.pendingValue,
					},
				},
			},
			{
				kind: "table",
				title: "Movimentações",
				sheetName: "Movimentações",
				columns: MOVEMENT_COLUMNS,
				rows: movementRows,
				emptyMessage: "Sem movimentações registadas.",
			},
		],
	};
}
