import db from "@muxima/db";

import { loadSuppliersWithMoney } from "../../../modules/budget/repository";
import { centsToUnits } from "../../../shared/finance/money";
import type { ReportColumn, ReportRow } from "../../core/report-definition";
import {
	labelPaymentStatus,
	labelSupplierCategory,
	labelSupplierStatus,
} from "../../core/report-labels";

/**
 * The supplier rows, in one place.
 *
 * The supplier report and the aggregate event report both render them. Money
 * comes from the shared resolver (`loadSuppliersWithMoney`) rather than from the
 * denormalised column on the row, because that column can be stale — so the
 * budget, the suppliers screen and both exports always show the same figure.
 */

export const SUPPLIER_COLUMNS: ReportColumn[] = [
	{ header: "Fornecedor", key: "name", weight: 2.2 },
	{ header: "Categoria", key: "category", weight: 1.3 },
	{ header: "Estado", key: "status", weight: 1.1 },
	{ header: "Pagamento", key: "paymentStatus", weight: 1.1 },
	{ header: "Valor acordado", key: "price", type: "money", weight: 1.1 },
	{ header: "Pago", key: "paid", type: "money", weight: 1 },
	{ header: "Pendente", key: "pending", type: "money", weight: 1 },
	{
		header: "Próximo vencimento",
		key: "nextDueDate",
		type: "date",
		weight: 1.1,
	},
	{ header: "Contacto", key: "contact", weight: 1.4 },
];

export async function loadSupplierRows(
	eventId: string,
	now: Date,
): Promise<ReportRow[]> {
	const [money, suppliers] = await Promise.all([
		loadSuppliersWithMoney(eventId, now),
		db.supplier.findMany({
			where: { eventId },
			select: {
				id: true,
				name: true,
				category: true,
				status: true,
				phone: true,
				email: true,
			},
			orderBy: { name: "asc" },
		}),
	]);

	const moneyById = new Map(money.map((entry) => [entry.id, entry]));

	return suppliers.map((supplier) => {
		const resolved = moneyById.get(supplier.id);
		return {
			name: supplier.name,
			category: labelSupplierCategory(supplier.category),
			status: labelSupplierStatus(supplier.status),
			paymentStatus: labelPaymentStatus(resolved?.paymentStatus),
			price: centsToUnits(resolved?.price ?? 0),
			paid: centsToUnits(resolved?.paid ?? 0),
			pending: centsToUnits(resolved?.pending ?? 0),
			nextDueDate: resolved?.nextDueDate ?? null,
			contact:
				[supplier.phone, supplier.email].filter(Boolean).join(" • ") || "—",
		};
	});
}
