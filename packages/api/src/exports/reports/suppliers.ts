import db from "@muxima/db";

import { getSupplierAnalytics } from "../../modules/suppliers/analytics";
import type { ExportContext } from "../core/export-context";
import { formatMoney, formatNumber } from "../core/format";
import type {
	ReportColumn,
	ReportDefinition,
	ReportRow,
} from "../core/report-definition";
import {
	labelPaymentMethod,
	labelPaymentStatus,
	labelSupplierCategory,
} from "../core/report-labels";
import { loadSupplierRows, SUPPLIER_COLUMNS } from "./rows/suppliers";

/**
 * Suppliers report: the list, its money and its payment/installment history.
 *
 * Aggregated amounts come from the shared money resolver, so the report cannot
 * disagree with the budget or the supplier screen.
 */

const PAYMENT_COLUMNS: ReportColumn[] = [
	{ header: "Data", key: "paymentDate", type: "date", weight: 1 },
	{ header: "Fornecedor", key: "supplier", weight: 2.2 },
	{ header: "Valor", key: "amount", type: "money", weight: 1 },
	{ header: "Método", key: "method", weight: 1.3 },
	{ header: "Referência", key: "reference", weight: 1.3 },
	{ header: "Notas", key: "notes", weight: 1.6 },
];

const INSTALLMENT_COLUMNS: ReportColumn[] = [
	{ header: "Fornecedor", key: "supplier", weight: 2.2 },
	{
		header: "Parcela",
		key: "position",
		type: "number",
		align: "right",
		weight: 0.6,
	},
	{ header: "Vencimento", key: "dueDate", type: "date", weight: 1 },
	{ header: "Valor", key: "amount", type: "money", weight: 1 },
	{ header: "Estado", key: "status", weight: 1 },
	{ header: "Pago em", key: "paidAt", type: "date", weight: 1 },
];

const CATEGORY_COLUMNS: ReportColumn[] = [
	{ header: "Categoria", key: "category", weight: 2 },
	{ header: "Nº", key: "count", type: "number", align: "right", weight: 0.5 },
	{ header: "Total contratado", key: "planned", type: "money", weight: 1.2 },
	{ header: "Pendente", key: "pending", type: "money", weight: 1.2 },
];

export async function buildSuppliersReport(
	eventId: string,
	context: ExportContext,
): Promise<ReportDefinition> {
	const currency = context.event?.currency ?? "AOA";

	const [analytics, supplierRows, payments, installments] = await Promise.all([
		getSupplierAnalytics(db, eventId, context.generatedAt),
		loadSupplierRows(eventId, context.generatedAt),
		db.supplierPayment.findMany({
			where: { supplier: { eventId } },
			include: { supplier: { select: { name: true } } },
			orderBy: { paymentDate: "desc" },
		}),
		db.supplierInstallment.findMany({
			where: { supplier: { eventId } },
			include: { supplier: { select: { name: true } } },
			orderBy: [{ dueDate: "asc" }],
		}),
	]);

	const paymentRows: ReportRow[] = payments.map((payment) => ({
		paymentDate: payment.paymentDate,
		supplier: payment.supplier.name,
		amount: Number(payment.amount),
		method: labelPaymentMethod(payment.method),
		reference: payment.reference ?? "—",
		notes: payment.notes ?? "—",
	}));

	const installmentRows: ReportRow[] = installments.map((installment) => ({
		supplier: installment.supplier.name,
		position: installment.position,
		dueDate: installment.dueDate,
		amount: Number(installment.amount),
		status: labelPaymentStatus(installment.status),
		paidAt: installment.paidAt,
	}));

	const categoryRows: ReportRow[] = analytics.byCategory.map((entry) => ({
		category: labelSupplierCategory(entry.key),
		count: entry.count,
		planned: entry.planned,
		pending: entry.pending,
	}));

	return {
		title: "Relatório de Fornecedores",
		subtitle: "Fornecedores contratados, pagamentos e parcelas do evento",
		sections: [
			{
				kind: "kpis",
				title: "Resumo",
				items: [
					{
						label: "Total de fornecedores",
						value: formatNumber(analytics.total),
					},
					{ label: "Confirmados", value: formatNumber(analytics.confirmed) },
					{ label: "Em negociação", value: formatNumber(analytics.pending) },
					{ label: "Concluídos", value: formatNumber(analytics.completed) },
					{
						label: "Total contratado",
						value: formatMoney(analytics.totalPrice, currency),
					},
					{
						label: "Total pago",
						value: formatMoney(analytics.totalPaid, currency),
					},
					{
						label: "Total pendente",
						value: formatMoney(analytics.totalPending, currency),
					},
					{ label: "Em atraso", value: formatNumber(analytics.overdueCount) },
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
						price: analytics.totalPrice,
						paid: analytics.totalPaid,
						pending: analytics.totalPending,
					},
				},
			},
			{
				kind: "table",
				title: "Distribuição por categoria",
				sheetName: "Categorias",
				columns: CATEGORY_COLUMNS,
				rows: categoryRows,
				emptyMessage: "Sem fornecedores por categoria.",
			},
			{
				kind: "table",
				title: "Pagamentos registados",
				sheetName: "Pagamentos",
				columns: PAYMENT_COLUMNS,
				rows: paymentRows,
				emptyMessage: "Nenhum pagamento registado.",
			},
			{
				kind: "table",
				title: "Parcelas",
				sheetName: "Parcelas",
				columns: INSTALLMENT_COLUMNS,
				rows: installmentRows,
				emptyMessage: "Nenhuma parcela registada.",
			},
		],
	};
}
