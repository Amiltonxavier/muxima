import type { ChecklistStatus } from "@muxima/db/prisma";

import { isFullyPaid } from "../../shared/finance/supplier-money";

/**
 * The rules that turn a supplier or an inventory item into checklist state.
 *
 * Pure on purpose: the checklist status is owned by the API, so these rules are
 * the single implementation and are unit tested without a database.
 */

export type SupplierChecklistInput = {
	supplierStatus: string;
	/** Agreed price, in cents. */
	price: number;
	/** Amount already paid, in cents. */
	paid: number;
};

export type InventoryChecklistInput = {
	itemStatus: string;
	plannedQuantity: number;
	currentQuantity: number;
};

/**
 * A supplier checklist item is complete when the supplier is CONFIRMED and
 * fully paid. A cancelled supplier can never be complete.
 */
export function resolveSupplierChecklistStatus(
	input: SupplierChecklistInput,
): ChecklistStatus {
	// A cancelled supplier can never be complete, whatever it was paid.
	if (input.supplierStatus === "CANCELLED") return "CANCELLED";

	const fullyPaid = isFullyPaid({
		price: input.price,
		paid: input.paid,
		cancelled: false,
	});

	if (input.supplierStatus === "CONFIRMED" && fullyPaid) return "COMPLETED";
	if (input.supplierStatus === "CONFIRMED") return "IN_PROGRESS";
	return "PENDING";
}

/**
 * An inventory checklist item is complete when the item itself is COMPLETED or
 * the planned quantity has been reached.
 */
export function resolveInventoryChecklistStatus(
	input: InventoryChecklistInput,
): ChecklistStatus {
	if (input.itemStatus === "COMPLETED") return "COMPLETED";
	if (
		input.plannedQuantity > 0 &&
		input.currentQuantity >= input.plannedQuantity
	) {
		return "COMPLETED";
	}
	if (input.itemStatus === "IN_PROGRESS") return "IN_PROGRESS";
	return "PENDING";
}
