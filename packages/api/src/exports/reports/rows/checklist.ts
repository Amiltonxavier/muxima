import db from "@muxima/db";

import type { ReportColumn, ReportRow } from "../../core/report-definition";
import { labelChecklistStatus } from "../../core/report-labels";

/**
 * The checklist rows, in one place.
 *
 * The overdue marker and the supplier/inventory origin are resolved here, so a
 * checklist item reads the same in the PDF, in the spreadsheet and in the
 * "Atrasados" table — and `getChecklistAnalytics` applies the same overdue rule
 * to the same `dueDate`/`status` pair.
 */

export const CHECKLIST_COLUMNS: ReportColumn[] = [
	{ header: "#", key: "position", type: "number", align: "right", weight: 0.4 },
	{ header: "Item", key: "title", weight: 2.6 },
	{ header: "Estado", key: "status", weight: 1 },
	{ header: "Prazo", key: "dueDate", type: "date", weight: 1 },
	{ header: "Concluída em", key: "completedAt", type: "date", weight: 1.1 },
	{ header: "Origem", key: "source", weight: 1.3 },
	{ header: "Descrição", key: "description", weight: 2.4 },
];

export async function loadChecklistRows(
	eventId: string,
	now: Date,
): Promise<ReportRow[]> {
	const items = await db.checklistItem.findMany({
		where: { eventId },
		include: {
			supplier: { select: { name: true } },
			inventoryItem: { select: { name: true } },
		},
		orderBy: [{ position: "asc" }, { createdAt: "asc" }],
	});

	return items.map((item) => {
		const done = item.status === "COMPLETED" || item.status === "CANCELLED";
		const overdue = item.dueDate !== null && item.dueDate < now && !done;

		return {
			position: item.position + 1,
			title: item.title,
			status: overdue
				? `${labelChecklistStatus(item.status)} · em atraso`
				: labelChecklistStatus(item.status),
			dueDate: item.dueDate,
			completedAt: item.completedAt,
			source: item.supplier
				? `Fornecedor: ${item.supplier.name}`
				: item.inventoryItem
					? `Inventário: ${item.inventoryItem.name}`
					: item.autoManaged
						? "Automático"
						: "Manual",
			description: item.description ?? "—",
		};
	});
}
