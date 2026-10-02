import db from "@muxima/db";

import { getBudgetLines } from "../../modules/budget/repository";
import { getEventSummaryAnalytics } from "../../modules/dashboard/event-analytics";
import { centsToUnits } from "../../shared/finance/money";
import type { ExportContext } from "../core/export-context";
import {
	formatDate,
	formatDateTime,
	formatMoney,
	formatNumber,
	formatTime,
} from "../core/format";
import type {
	ReportColumn,
	ReportDefinition,
	ReportRow,
	ReportSection,
} from "../core/report-definition";
import {
	labelEventStatus,
	labelEventType,
	labelGuestStatus,
	labelMemberRole,
} from "../core/report-labels";
import { CHECKLIST_COLUMNS, loadChecklistRows } from "./rows/checklist";
import {
	FOOD_PLAN_CATEGORY_COLUMNS,
	FOOD_PLAN_ITEM_COLUMNS,
	loadFoodPlanRows,
} from "./rows/food-plan";
import { INVENTORY_ITEM_COLUMNS, loadInventoryRows } from "./rows/inventory";
import { loadSupplierRows, SUPPLIER_COLUMNS } from "./rows/suppliers";
import { loadTaskRows, TASK_COLUMNS } from "./rows/tasks";

/**
 * Full event report.
 *
 * This is the aggregate document. Every figure comes from
 * `getEventSummaryAnalytics`, which in turn delegates to each module's own
 * analytics — this file never re-derives a number. It only assembles the
 * per-module sections and, for the row-level tables, reads the same rows the
 * corresponding module screen reads (unpaginated).
 */

const GUEST_STATUS_COLUMNS: ReportColumn[] = [
	{ header: "Estado", key: "label", weight: 1.6 },
	{
		header: "Convidados",
		key: "count",
		type: "number",
		align: "right",
		weight: 1,
	},
	{
		header: "% do total",
		key: "percentage",
		type: "percent",
		align: "right",
		weight: 0.9,
	},
];

const TABLE_COLUMNS: ReportColumn[] = [
	{ header: "Mesa", key: "name", weight: 1.6 },
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
	{ header: "Convidados atribuídos", key: "guests", weight: 2.6 },
];

const SCHEDULE_COLUMNS: ReportColumn[] = [
	{ header: "Início", key: "startAt", type: "datetime", weight: 1.3 },
	{ header: "Atividade", key: "title", weight: 2.4 },
	{ header: "Fim", key: "endAt", type: "datetime", weight: 1.3 },
	{ header: "Local", key: "location", weight: 1.4 },
	{ header: "Responsável", key: "responsible", weight: 1.4 },
	{ header: "Estado", key: "status", weight: 1 },
];

const BUDGET_LINE_COLUMNS: ReportColumn[] = [
	{ header: "Descrição", key: "label", weight: 2.4 },
	{ header: "Origem", key: "source", weight: 1 },
	{ header: "Planeado", key: "planned", type: "money", weight: 1 },
	{ header: "Pago", key: "paid", type: "money", weight: 1 },
	{ header: "Pendente", key: "pending", type: "money", weight: 1 },
];

const MEMBER_COLUMNS: ReportColumn[] = [
	{ header: "Membro", key: "name", weight: 2 },
	{ header: "Email", key: "email", weight: 2 },
	{ header: "Papel", key: "role", weight: 1 },
	{ header: "Estado", key: "status", weight: 1 },
	{ header: "Desde", key: "joinedAt", type: "date", weight: 1 },
];

const NOT_AVAILABLE: ReportDefinition = {
	title: "Relatório do Evento",
	sections: [{ kind: "paragraphs", paragraphs: ["Evento não encontrado."] }],
};

export async function buildEventReport(
	eventId: string,
	context: ExportContext,
): Promise<ReportDefinition> {
	const summary = await getEventSummaryAnalytics(
		db,
		eventId,
		context.actor.id,
		context.generatedAt,
	);
	if (!summary) return NOT_AVAILABLE;

	const {
		event,
		countdown,
		guests,
		invitations,
		tables,
		schedule,
		budget,
		suppliers,
		inventory,
		tasks,
		checklist,
		foodPlan,
		dedications,
	} = summary;
	const currency = event.currency;

	const now = context.generatedAt;
	const [
		tableRows,
		scheduleRows,
		budgetLines,
		members,
		supplierRows,
		inventoryRows,
		taskRows,
		checklistRows,
		foodPlanRows,
	] = await Promise.all([
		db.table.findMany({
			where: { eventId, deletedAt: null },
			include: {
				tableGuests: { include: { guest: { select: { name: true } } } },
			},
			orderBy: [{ number: "asc" }, { name: "asc" }],
		}),
		db.schedule.findMany({
			where: { eventId },
			orderBy: { startAt: "asc" },
		}),
		getBudgetLines(eventId, {}, context.generatedAt),
		db.eventMember.findMany({
			where: { eventId },
			include: { user: { select: { name: true, email: true } } },
			orderBy: { createdAt: "asc" },
		}),
		// Every row-level table comes from the same loader the module's own report
		// uses, so a number can never differ between the module report and the
		// aggregate one.
		loadSupplierRows(eventId, now),
		loadInventoryRows(eventId),
		loadTaskRows(eventId, now),
		loadChecklistRows(eventId, now),
		loadFoodPlanRows(eventId),
	]);

	const guestStatusRows: ReportRow[] = Object.entries(guests.byStatus)
		.filter(([, count]) => count > 0)
		.map(([status, count]) => ({
			label: labelGuestStatus(status),
			count,
			percentage:
				guests.totalGuests > 0
					? Math.round((count / guests.totalGuests) * 100)
					: 0,
		}));

	const budgetLineRows: ReportRow[] = budgetLines.map((line) => ({
		label: line.label,
		source: line.source === "SUPPLIER" ? "Fornecedor" : "Inventário",
		planned: centsToUnits(line.planned),
		paid: centsToUnits(line.paid),
		pending: centsToUnits(line.pending),
	}));

	const sections: ReportSection[] = [
		{
			kind: "pairs",
			title: "1. Informações gerais",
			items: [
				{ label: "Evento", value: event.name },
				{ label: "Tipo", value: labelEventType(event.type) },
				{ label: "Estado", value: labelEventStatus(event.status) },
				{ label: "Data", value: formatDate(event.eventDate) },
				{
					label: "Hora",
					value: `${formatTime(event.startTime)}${event.endTime ? ` – ${formatTime(event.endTime)}` : ""}`,
				},
				{ label: "Local", value: event.venueName ?? "—" },
				{
					label: "Endereço",
					value:
						[event.address, event.municipality, event.province]
							.filter(Boolean)
							.join(", ") || "—",
				},
				{
					label: "Capacidade",
					value:
						event.capacity !== null
							? formatNumber(event.capacity)
							: "Sem limite definido",
				},
				{ label: "Moeda", value: currency },
				{
					label: "Contagem regressiva",
					value: countdown.hasDate
						? countdown.isPast
							? "Evento já realizado"
							: `${formatNumber(countdown.daysRemaining)} dias, ${formatNumber(countdown.hoursRemaining)} horas`
						: "Sem data definida",
				},
			],
		},
		{
			kind: "kpis",
			title: "2. Indicadores gerais",
			items: [
				{ label: "Convidados", value: formatNumber(guests.totalGuests) },
				{
					label: "Pessoas confirmadas",
					value: formatNumber(guests.totalConfirmedPeople),
				},
				{ label: "Tarefas", value: formatNumber(tasks.total) },
				{
					label: "Tarefas concluídas",
					value: `${formatNumber(tasks.completionRate)}%`,
				},
				{
					label: "Orçamento",
					value: formatMoney(budget.totalBudget, currency),
				},
				{ label: "Gasto", value: formatMoney(budget.spent, currency) },
				{ label: "Pendente", value: formatMoney(budget.pending, currency) },
				{
					label: "Checklist",
					value: `${formatNumber(checklist.completionPercentage)}%`,
				},
			],
		},
		{
			kind: "pairs",
			title: "3. Convidados e RSVP",
			items: [
				{
					label: "Total de convidados",
					value: formatNumber(guests.totalGuests),
				},
				{ label: "Confirmados", value: formatNumber(guests.confirmed) },
				{ label: "Pendentes", value: formatNumber(guests.pending) },
				{ label: "Recusados", value: formatNumber(guests.declined) },
				{ label: "Talvez", value: formatNumber(guests.maybe) },
				{ label: "Acompanhantes", value: formatNumber(guests.totalCompanions) },
				{
					label: "Pessoas confirmadas",
					value: formatNumber(guests.totalConfirmedPeople),
				},
				{
					label: "Capacidade",
					value:
						guests.capacity > 0
							? `${formatNumber(guests.totalConfirmedPeople)} / ${formatNumber(guests.capacity)}`
							: "Sem limite",
				},
				{
					label: "Convites publicados",
					value: formatNumber(invitations.published),
				},
				{
					label: "Convites respondidos",
					value: formatNumber(invitations.responded),
				},
				{
					label: "Taxa de resposta",
					value: `${formatNumber(invitations.responseRate)}%`,
				},
			],
		},
		{
			kind: "table",
			title: "Convidados por estado",
			sheetName: "Convidados",
			columns: GUEST_STATUS_COLUMNS,
			rows: guestStatusRows,
			emptyMessage: "Sem convidados registados.",
		},
		{
			kind: "pairs",
			title: "4. Mesas",
			items: [
				{ label: "Total de mesas", value: formatNumber(tables.total) },
				{
					label: "Capacidade total",
					value: formatNumber(tables.totalCapacity),
				},
				{
					label: "Lugares ocupados",
					value: formatNumber(tables.totalOccupied),
				},
				{ label: "Lugares disponíveis", value: formatNumber(tables.available) },
				{ label: "Mesas completas", value: formatNumber(tables.fullTables) },
				{ label: "Ocupação", value: `${formatNumber(tables.occupancyRate)}%` },
			],
		},
		{
			kind: "table",
			title: "Mesas",
			sheetName: "Mesas",
			columns: TABLE_COLUMNS,
			rows: tableRows.map((table) => ({
				name: table.name,
				number: table.number,
				capacity: table.capacity,
				occupied: table.tableGuests.length,
				available: Math.max(0, table.capacity - table.tableGuests.length),
				guests:
					table.tableGuests.map(({ guest }) => guest.name).join(", ") || "—",
			})),
			emptyMessage: "Nenhuma mesa configurada.",
		},
		{
			kind: "pairs",
			title: "5. Programa",
			items: [
				{ label: "Atividades", value: formatNumber(schedule.total) },
				{ label: "Concluídas", value: formatNumber(schedule.completed) },
				{ label: "Pendentes", value: formatNumber(schedule.pending) },
				{
					label: "Duração total",
					value:
						schedule.totalDurationMinutes > 0
							? `${formatNumber(Math.round(schedule.totalDurationMinutes / 60))} h`
							: "—",
				},
				{
					label: "Primeira atividade",
					value: formatTime(schedule.firstStartAt),
				},
				{ label: "Última atividade", value: formatTime(schedule.lastEndAt) },
			],
		},
		{
			kind: "table",
			title: "Atividades",
			sheetName: "Programa",
			columns: SCHEDULE_COLUMNS,
			rows: scheduleRows.map((item) => ({
				startAt: item.startAt,
				title: item.title,
				endAt: item.endAt,
				location: item.location ?? "—",
				responsible: item.responsible ?? "—",
				status: item.status,
			})),
			emptyMessage: "Nenhuma atividade agendada.",
		},
		{
			kind: "pairs",
			title: "6. Orçamento",
			items: [
				{
					label: "Orçamento total",
					value: formatMoney(budget.totalBudget, currency),
				},
				{ label: "Reserva", value: formatMoney(budget.reserve, currency) },
				{ label: "Disponível", value: formatMoney(budget.available, currency) },
				{ label: "Planeado", value: formatMoney(budget.planned, currency) },
				{ label: "Gasto", value: formatMoney(budget.spent, currency) },
				{ label: "Pendente", value: formatMoney(budget.pending, currency) },
				{ label: "Em atraso", value: formatMoney(budget.overdue, currency) },
				{
					label: "Disponível após compromissos",
					value: formatMoney(budget.remaining, currency),
				},
				{
					label: "Utilização",
					value: `${formatNumber(budget.usagePercentage)}%`,
				},
			],
		},
		{
			kind: "table",
			title: "Linhas do orçamento",
			sheetName: "Orçamento",
			columns: BUDGET_LINE_COLUMNS,
			rows: budgetLineRows,
			emptyMessage: "Sem linhas de orçamento.",
			totals: {
				label: "Total",
				values: {
					planned: budget.planned,
					paid: budget.spent,
					pending: budget.pending,
				},
			},
		},
		{
			kind: "pairs",
			title: "7. Fornecedores",
			items: [
				{ label: "Total", value: formatNumber(suppliers.total) },
				{ label: "Confirmados", value: formatNumber(suppliers.confirmed) },
				{ label: "Em negociação", value: formatNumber(suppliers.pending) },
				{ label: "Concluídos", value: formatNumber(suppliers.completed) },
				{ label: "Cancelados", value: formatNumber(suppliers.cancelled) },
				{
					label: "Total contratado",
					value: formatMoney(suppliers.totalPrice, currency),
				},
				{
					label: "Total pago",
					value: formatMoney(suppliers.totalPaid, currency),
				},
				{
					label: "Pendente",
					value: formatMoney(suppliers.totalPending, currency),
				},
				{ label: "Em atraso", value: formatNumber(suppliers.overdueCount) },
			],
		},
		{
			kind: "table",
			title: "Fornecedores",
			sheetName: "Fornecedores",
			columns: SUPPLIER_COLUMNS,
			rows: supplierRows,
			emptyMessage: "Nenhum fornecedor registado.",
			totals: {
				label: "Total",
				values: {
					price: suppliers.totalPrice,
					paid: suppliers.totalPaid,
					pending: suppliers.totalPending,
				},
			},
		},
		{
			kind: "pairs",
			title: "8. Inventário",
			items: [
				{ label: "Itens", value: formatNumber(inventory.totalItems) },
				{ label: "Concluídos", value: formatNumber(inventory.completedItems) },
				{ label: "Pendentes", value: formatNumber(inventory.pendingItems) },
				{
					label: "Progresso",
					value: `${formatNumber(inventory.completionPercentage)}%`,
				},
				{
					label: "Valor total",
					value: formatMoney(inventory.totalValue, currency),
				},
				{
					label: "Valor pendente",
					value: formatMoney(inventory.pendingValue, currency),
				},
				{
					label: "Movimentações",
					value: formatNumber(inventory.movementCount),
				},
			],
		},
		{
			kind: "table",
			title: "Itens de inventário",
			sheetName: "Inventário",
			columns: INVENTORY_ITEM_COLUMNS,
			rows: inventoryRows,
			emptyMessage: "Nenhum item de inventário.",
		},
		{
			kind: "pairs",
			title: "9. Tarefas",
			items: [
				{ label: "Total", value: formatNumber(tasks.total) },
				{ label: "Concluídas", value: formatNumber(tasks.completed) },
				{ label: "Em progresso", value: formatNumber(tasks.inProgress) },
				{ label: "Por fazer", value: formatNumber(tasks.todo) },
				{ label: "Atrasadas", value: formatNumber(tasks.overdue) },
				{ label: "Progresso", value: `${formatNumber(tasks.completionRate)}%` },
			],
		},
		{
			kind: "table",
			title: "Tarefas",
			sheetName: "Tarefas",
			columns: TASK_COLUMNS,
			rows: taskRows,
			emptyMessage: "Nenhuma tarefa registada.",
		},
		{
			kind: "pairs",
			title: "10. Checklist",
			items: [
				{ label: "Itens", value: formatNumber(checklist.total) },
				{ label: "Concluídos", value: formatNumber(checklist.completed) },
				{ label: "Pendentes", value: formatNumber(checklist.pending) },
				{ label: "Atrasados", value: formatNumber(checklist.overdue) },
				{
					label: "Progresso",
					value: `${formatNumber(checklist.completionPercentage)}%`,
				},
			],
		},
		{
			kind: "table",
			title: "Itens do checklist",
			sheetName: "Checklist",
			columns: CHECKLIST_COLUMNS,
			rows: checklistRows,
			emptyMessage: "Nenhum item no checklist.",
		},
		{
			kind: "pairs",
			title: "11. Plano de alimentação",
			items: [
				{ label: "Itens", value: formatNumber(foodPlan.totalItems) },
				{ label: "Concluídos", value: formatNumber(foodPlan.completedItems) },
				{ label: "Pendentes", value: formatNumber(foodPlan.pendingItems) },
				{
					label: "Quantidade total",
					value: formatNumber(foodPlan.totalQuantity),
				},
				{
					label: "Fornecedor",
					value: foodPlan.supplierName ?? "Não atribuído",
				},
			],
		},
		{
			kind: "table",
			title: "Itens do plano",
			sheetName: "Alimentacao",
			columns: FOOD_PLAN_ITEM_COLUMNS,
			rows: foodPlanRows,
			emptyMessage: "Nenhum item no plano de alimentação.",
			totals: {
				label: "Total",
				values: { quantity: foodPlan.totalQuantity },
			},
		},
		{
			kind: "table",
			title: "Alimentação por categoria",
			sheetName: "Alim. Categoria",
			columns: FOOD_PLAN_CATEGORY_COLUMNS,
			rows: foodPlan.byCategory.map((entry) => ({
				category: entry.label,
				count: entry.count,
				quantity: entry.totalQuantity,
				completed: entry.completed,
			})),
			emptyMessage: "Sem itens por categoria.",
		},
		...(dedications
			? [
					{
						kind: "pairs" as const,
						title: "12. Dedicatórias",
						items: [
							{
								label: "Total visível",
								value: formatNumber(dedications.total),
							},
							{
								label: "Privadas",
								value: formatNumber(dedications.privateCount),
							},
							{
								label: "Partilhadas comigo",
								value: formatNumber(dedications.sharedWithMe),
							},
							{ label: "Prontas", value: formatNumber(dedications.ready) },
							{
								label: "Abertas por mim",
								value: formatNumber(dedications.openedByMe),
							},
						],
					},
				]
			: []),
		{
			kind: "table",
			title: "Equipa do evento",
			sheetName: "Equipa",
			columns: MEMBER_COLUMNS,
			rows: members.map((member) => ({
				name: member.user.name,
				email: member.user.email,
				role: labelMemberRole(member.role),
				status: member.status,
				joinedAt: member.createdAt,
			})),
			emptyMessage: "Sem membros registados.",
		},
		{
			kind: "paragraphs",
			title: "Notas",
			paragraphs: [
				`Relatório gerado por ${context.actor.name} a ${formatDateTime(context.generatedAt)}.`,
			],
		},
	];

	return {
		title: "Relatório Completo do Evento",
		subtitle: `${labelEventType(event.type)} · ${event.name}`,
		sections,
	};
}
