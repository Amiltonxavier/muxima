import db from "@muxima/db";
import { getBudgetAnalytics } from "../../modules/budget/analytics";
import {
	getBudgetLines,
	getBudgetSnapshot,
} from "../../modules/budget/repository";
import { centsToUnits } from "../../shared/finance/money";
import type { ExportContext } from "../core/export-context";
import { formatMoney } from "../core/format";
import type {
	ReportColumn,
	ReportDefinition,
	ReportRow,
	ReportSection,
} from "../core/report-definition";

/**
 * Budget report.
 *
 * Reads the same aggregators the budget screen uses (`getBudgetSnapshot`,
 * `getBudgetLines`), so the report shows every relevant line of the module — not
 * only what the paginated table happens to display.
 */

const CATEGORY_COLUMNS: ReportColumn[] = [
	{ header: "Origem", key: "source", weight: 1.1 },
	{ header: "Categoria", key: "category", weight: 1.4 },
	{ header: "Nº", key: "count", type: "number", align: "right", weight: 0.5 },
	{ header: "Planeado", key: "planned", type: "money", weight: 1.1 },
	{ header: "Pago", key: "paid", type: "money", weight: 1.1 },
	{ header: "Pendente", key: "pending", type: "money", weight: 1.1 },
	{
		header: "% Pago",
		key: "percentage",
		type: "percent",
		align: "right",
		weight: 0.6,
	},
];

const LINE_COLUMNS: ReportColumn[] = [
	{ header: "Descrição", key: "label", weight: 2.2 },
	{ header: "Origem", key: "source", weight: 0.9 },
	{ header: "Estado", key: "status", weight: 0.9 },
	{ header: "Planeado", key: "planned", type: "money", weight: 1 },
	{ header: "Pago", key: "paid", type: "money", weight: 1 },
	{ header: "Pendente", key: "pending", type: "money", weight: 1 },
];

const OVERDUE_COLUMNS: ReportColumn[] = [
	{ header: "Fornecedor", key: "name", weight: 2 },
	{ header: "Em atraso", key: "overdueAmount", type: "money", weight: 1 },
	{ header: "Próximo vencimento", key: "nextDueDate", type: "date", weight: 1 },
];

const PAYMENT_STATUS_COLUMNS: ReportColumn[] = [
	{ header: "Estado de pagamento", key: "label", weight: 1.4 },
	{ header: "Nº", key: "count", type: "number", align: "right", weight: 0.5 },
	{ header: "Planeado", key: "planned", type: "money", weight: 1 },
	{ header: "Pago", key: "paid", type: "money", weight: 1 },
	{ header: "Pendente", key: "pending", type: "money", weight: 1 },
];

export async function buildBudgetReport(
	eventId: string,
	context: ExportContext,
): Promise<ReportDefinition> {
	const [snapshot, lines, suppliers] = await Promise.all([
		getBudgetSnapshot(eventId, context.generatedAt),
		getBudgetLines(eventId, {}, context.generatedAt),
		getBudgetAnalytics(db, eventId, context.generatedAt),
	]);
	const currency = snapshot.totals.currency;

	const categoryRows: ReportRow[] = snapshot.breakdown.byCategory.map(
		(entry) => ({
			source: entry.label,
			category: entry.label,
			count: entry.count,
			planned: centsToUnits(entry.planned),
			paid: centsToUnits(entry.paid),
			pending: centsToUnits(entry.pending),
			percentage: entry.percentage,
		}),
	);

	const lineRows: ReportRow[] = lines.map((line) => ({
		label: line.label,
		source: line.source === "SUPPLIER" ? "Fornecedor" : "Inventário",
		status: line.status ?? "—",
		planned: centsToUnits(line.planned),
		paid: centsToUnits(line.paid),
		pending: centsToUnits(line.pending),
	}));

	const overdueRows: ReportRow[] = snapshot.breakdown.overdueSuppliers.map(
		(entry) => ({
			name: entry.name,
			overdueAmount: centsToUnits(entry.overdueAmount),
			nextDueDate: entry.nextDueDate,
		}),
	);

	const paymentStatusRows: ReportRow[] = snapshot.breakdown.byPaymentStatus.map(
		(entry) => ({
			label: entry.label,
			count: entry.count,
			planned: centsToUnits(entry.planned),
			paid: centsToUnits(entry.paid),
			pending: centsToUnits(entry.pending),
		}),
	);

	const sections: ReportSection[] = [
		{
			kind: "kpis",
			title: "Resumo do orçamento",
			items: [
				{
					label: "Orçamento total",
					value: formatMoney(
						centsToUnits(snapshot.totals.totalBudget),
						currency,
					),
					hint: snapshot.hasTarget ? "Meta definida" : "Sem meta definida",
				},
				{
					label: "Total gasto",
					value: formatMoney(centsToUnits(snapshot.totals.spent), currency),
				},
				{
					label: "Total pendente",
					value: formatMoney(centsToUnits(snapshot.totals.pending), currency),
				},
				{
					label: "Em atraso",
					value: formatMoney(centsToUnits(snapshot.totals.overdue), currency),
				},
			],
		},
		{
			kind: "pairs",
			title: "Totais",
			items: [
				{
					label: "Orçamento planeado",
					value: formatMoney(
						centsToUnits(snapshot.totals.totalBudget),
						currency,
					),
				},
				{
					label: "Reserva",
					value: formatMoney(centsToUnits(snapshot.totals.reserve), currency),
				},
				{
					label: "Disponível",
					value: formatMoney(centsToUnits(snapshot.totals.available), currency),
				},
				{
					label: "Comprometido (inventário + fornecedores)",
					value: formatMoney(centsToUnits(snapshot.totals.planned), currency),
				},
				{
					label: "Pago",
					value: formatMoney(centsToUnits(snapshot.totals.spent), currency),
				},
				{
					label: "Pendente",
					value: formatMoney(centsToUnits(snapshot.totals.pending), currency),
				},
				{
					label: "Em atraso",
					value: formatMoney(centsToUnits(snapshot.totals.overdue), currency),
				},
				{
					label: "Disponível após compromissos",
					value: formatMoney(centsToUnits(snapshot.totals.remaining), currency),
				},
				{
					label: "Taxa de utilização",
					value: `${snapshot.totals.usagePercentage}%`,
				},
				{
					label: "Taxa de pagamento",
					value: `${snapshot.totals.paymentPercentage}%`,
				},
				{
					label: "Fornecedores no orçamento",
					value: String(suppliers.supplierCount),
				},
				{
					label: "Categorias com custos",
					value: String(categoryRows.length),
				},
			],
		},
		{
			kind: "table",
			title: "Distribuição por categoria",
			sheetName: "Categorias",
			columns: CATEGORY_COLUMNS,
			rows: categoryRows,
			emptyMessage: "Sem categorias com custos registados.",
		},
		{
			kind: "table",
			title: "Todas as linhas do orçamento",
			description:
				"Todos os itens de inventário e fornecedores contribuem para o orçamento do evento.",
			sheetName: "Linhas",
			columns: LINE_COLUMNS,
			rows: lineRows,
			emptyMessage: "Sem linhas de orçamento.",
			totals: {
				label: "Total",
				values: {
					planned: centsToUnits(snapshot.totals.planned),
					paid: centsToUnits(snapshot.totals.spent),
					pending: centsToUnits(snapshot.totals.pending),
				},
			},
		},
		{
			kind: "table",
			title: "Estado de pagamento",
			sheetName: "Pagamentos",
			columns: PAYMENT_STATUS_COLUMNS,
			rows: paymentStatusRows,
			emptyMessage: "Sem fornecedores registados.",
		},
		{
			kind: "table",
			title: "Fornecedores em atraso",
			sheetName: "Atrasos",
			columns: OVERDUE_COLUMNS,
			rows: overdueRows,
			emptyMessage: "Nenhum pagamento em atraso.",
		},
	];

	return {
		title: "Relatório de Orçamento",
		subtitle: snapshot.hasTarget
			? "Planeamento, pagamentos e pendências financeiras do evento"
			: "Planeamento e pagamentos do evento (sem meta definida)",
		sections,
	};
}

/** Exposed for the event summary report, which reuses the same columns. */
export const budgetReportColumns = {
	category: CATEGORY_COLUMNS,
	lines: LINE_COLUMNS,
};
