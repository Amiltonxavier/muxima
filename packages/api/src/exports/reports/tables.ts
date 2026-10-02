import db from "@muxima/db";

import { getTableAnalytics } from "../../modules/guests/analytics";
import type { ExportContext } from "../core/export-context";
import { formatNumber } from "../core/format";
import type {
	ReportColumn,
	ReportDefinition,
	ReportRow,
} from "../core/report-definition";
import { labelGuestStatus } from "../core/report-labels";

/**
 * Tables report: every table with its assigned guests, plus occupancy stats.
 */

const TABLE_COLUMNS: ReportColumn[] = [
	{ header: "Mesa", key: "name", weight: 1.8 },
	{ header: "Nº", key: "number", type: "number", align: "right", weight: 0.5 },
	{
		header: "Capacidade",
		key: "capacity",
		type: "number",
		align: "right",
		weight: 0.8,
	},
	{
		header: "Ocupados",
		key: "occupied",
		type: "number",
		align: "right",
		weight: 0.8,
	},
	{
		header: "Disponíveis",
		key: "available",
		type: "number",
		align: "right",
		weight: 0.9,
	},
	{
		header: "Ocupação",
		key: "occupancy",
		type: "percent",
		align: "right",
		weight: 0.8,
	},
	{ header: "Local", key: "location", weight: 1.2 },
	{ header: "Convidados atribuídos", key: "guests", weight: 2.6 },
	{ header: "Notas", key: "notes", weight: 1.6 },
];

export async function buildTablesReport(
	eventId: string,
	_context: ExportContext,
): Promise<ReportDefinition> {
	const [analytics, tables] = await Promise.all([
		getTableAnalytics(db, eventId),
		db.table.findMany({
			where: { eventId, deletedAt: null },
			include: {
				tableGuests: {
					include: { guest: { select: { name: true, status: true } } },
				},
			},
			orderBy: [{ number: "asc" }, { name: "asc" }],
		}),
	]);

	const rows: ReportRow[] = tables.map((table) => {
		const occupied = table.tableGuests.length;
		return {
			name: table.name,
			number: table.number,
			capacity: table.capacity,
			occupied,
			available: Math.max(0, table.capacity - occupied),
			occupancy:
				table.capacity > 0 ? Math.round((occupied / table.capacity) * 100) : 0,
			location: table.location ?? "—",
			guests:
				table.tableGuests
					.map(
						({ guest }) =>
							`${guest.name} (${labelGuestStatus(guest.status).toLowerCase()})`,
					)
					.join(", ") || "—",
			notes: table.notes ?? "—",
		};
	});

	return {
		title: "Relatório de Mesas",
		subtitle: "Distribuição de convidados por mesa e ocupação de lugares",
		sections: [
			{
				kind: "kpis",
				title: "Resumo",
				items: [
					{ label: "Total de mesas", value: formatNumber(analytics.total) },
					{
						label: "Capacidade total",
						value: formatNumber(analytics.totalCapacity),
					},
					{
						label: "Lugares ocupados",
						value: formatNumber(analytics.totalOccupied),
					},
					{
						label: "Lugares disponíveis",
						value: formatNumber(analytics.available),
					},
					{
						label: "Mesas completas",
						value: formatNumber(analytics.fullTables),
					},
					{
						label: "Mesas parciais",
						value: formatNumber(analytics.partialTables),
					},
					{ label: "Mesas vazias", value: formatNumber(analytics.emptyTables) },
					{
						label: "Ocupação",
						value: `${formatNumber(analytics.occupancyRate)}%`,
					},
				],
			},
			{
				kind: "table",
				title: "Mesas",
				sheetName: "Mesas",
				columns: TABLE_COLUMNS,
				rows,
				emptyMessage: "Nenhuma mesa configurada.",
				totals: {
					label: "Total",
					values: {
						capacity: analytics.totalCapacity,
						occupied: analytics.totalOccupied,
						available: analytics.available,
					},
				},
			},
		],
	};
}
