import db from "@muxima/db";
import type { PrismaClient } from "@muxima/db/prisma";
import {
	ForbiddenError,
	NotFoundError,
	ValidationError,
} from "../../shared/errors/app-error";
import { InventoryService } from "../inventory/service";
import { BudgetRepository, type ExpenseFilterParams } from "./repository";
import type {
	ExpenseInventoryInput,
	CreateExpenseInput as ParsedCreateExpenseInput,
	UpdateExpenseInput,
} from "./schemas";

type ExpenseStatusValue =
	| "PLANNED"
	| "PARTIALLY_PAID"
	| "PAID"
	| "OVERDUE"
	| "CANCELLED";

function expenseStatusFromPaidPercentage(
	paidPercentage: number,
): ExpenseStatusValue {
	if (paidPercentage >= 100) return "PAID";
	if (paidPercentage > 0) return "PARTIALLY_PAID";
	return "PLANNED";
}

function toInventoryData(
	inventory: ExpenseInventoryInput,
	vendorId?: string | null,
) {
	return {
		name: inventory.name,
		category: inventory.category,
		unit: inventory.unit,
		plannedQuantity: inventory.plannedQuantity,
		currentQuantity: 0,
		venueQuantity: inventory.venueQuantity ?? 0,
		unitPrice: inventory.unitPrice,
		notes: inventory.notes,
		vendorId: vendorId ?? undefined,
	};
}

/**
 * Creates an expense, optionally together with the inventory item it
 * represents, inside a single transaction: either both records are persisted
 * or none is.
 */
export async function createExpenseWithInventory(
	client: PrismaClient,
	eventId: string,
	userId: string,
	input: ParsedCreateExpenseInput,
) {
	return client.$transaction(async (tx) => {
		let inventoryItemId: string | null = null;

		if (input.isInventoryItem && input.inventory) {
			const item = await InventoryService.create(
				tx,
				eventId,
				userId,
				toInventoryData(input.inventory, input.vendorId),
			);
			inventoryItemId = item.id;
		}

		const paidPercentage = input.paidPercentage ?? 0;
		return tx.expense.create({
			data: {
				eventId,
				budgetCategoryId: input.budgetCategoryId,
				vendorId: input.vendorId,
				inventoryItemId,
				description: input.description,
				type: input.type ?? "EXPENSE",
				totalAmount: input.totalAmount,
				dueDate: input.dueDate ? new Date(input.dueDate) : null,
				status: expenseStatusFromPaidPercentage(paidPercentage),
				paidPercentage,
				notes: input.notes,
				createdBy: userId,
			},
		});
	});
}

/**
 * Updates an expense and keeps its inventory relationship consistent:
 * - `isInventoryItem: true` creates the inventory item when there is none and
 *   updates the linked item when the payload is provided;
 * - `isInventoryItem: false` detaches the relationship (the inventory item
 *   itself is preserved so its history is never lost).
 */
export async function updateExpenseWithInventory(
	client: PrismaClient,
	userId: string,
	input: UpdateExpenseInput & { id: string },
) {
	return client.$transaction(async (tx) => {
		const expense = await tx.expense.findUnique({
			where: { id: input.id },
		});
		if (!expense) throw new NotFoundError("Despesa não encontrada");

		let inventoryItemId = expense.inventoryItemId;

		if (input.isInventoryItem === false) {
			// Detach only — the inventory item and its history are preserved.
			inventoryItemId = null;
		} else if (input.isInventoryItem === true) {
			if (expense.inventoryItemId) {
				if (input.inventory) {
					await InventoryService.update(tx, expense.inventoryItemId, {
						name: input.inventory.name,
						category: input.inventory.category,
						unit: input.inventory.unit,
						plannedQuantity: input.inventory.plannedQuantity,
						venueQuantity: input.inventory.venueQuantity,
						unitPrice: input.inventory.unitPrice,
						notes: input.inventory.notes,
					});
				}
			} else {
				if (!input.inventory) {
					throw new ValidationError(
						"Dados de inventário obrigatórios para um item do inventário",
					);
				}
				const item = await InventoryService.create(
					tx,
					expense.eventId,
					userId,
					toInventoryData(input.inventory, expense.vendorId),
				);
				inventoryItemId = item.id;
			}
		}

		return tx.expense.update({
			where: { id: expense.id },
			data: {
				description: input.description,
				vendorId: input.vendorId,
				totalAmount: input.totalAmount,
				dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
				notes: input.notes,
				status: input.status,
				inventoryItemId,
			},
		});
	});
}

export const BudgetService = {
	async getByEventId(eventId: string, _userId: string) {
		const [budget, categories] = await Promise.all([
			BudgetRepository.findByEventId(eventId),
			BudgetRepository.findCategoriesByEventId(eventId),
		]);
		return { ...budget, categories };
	},

	async upsert(
		eventId: string,
		_userId: string,
		data: { plannedAmount: number; reserveAmount?: number; notes?: string },
	) {
		return BudgetRepository.upsert(eventId, data);
	},

	async createCategory(
		eventId: string,
		data: { name: string; description?: string; plannedAmount?: number },
	) {
		return BudgetRepository.createCategory({ eventId, ...data });
	},

	async updateCategory(
		id: string,
		data: Partial<{
			name: string;
			description: string;
			plannedAmount: number;
		}>,
	) {
		return BudgetRepository.updateCategory(id, data);
	},

	async deleteCategory(id: string) {
		return BudgetRepository.deleteCategory(id);
	},

	async getExpenses(
		eventId: string,
		pagination: { page: number; limit: number },
		filters?: ExpenseFilterParams,
	) {
		const [data, total] = await Promise.all([
			BudgetRepository.findExpensesByEventId(eventId, pagination, filters),
			BudgetRepository.countExpensesByEventId(eventId, filters),
		]);
		return { data, total };
	},

	async createExpense(
		eventId: string,
		userId: string,
		data: ParsedCreateExpenseInput,
	) {
		return createExpenseWithInventory(db, eventId, userId, data);
	},

	async createPayment(
		expenseId: string,
		userId: string,
		data: {
			amount: number;
			paymentDate: string;
			method:
				| "CASH"
				| "BANK_TRANSFER"
				| "ATM"
				| "CARD"
				| "MOBILE_PAYMENT"
				| "OTHER";
			reference?: string;
			notes?: string;
		},
	) {
		const expense = await BudgetRepository.findExpenseById(expenseId);
		if (!expense) throw new NotFoundError("Despesa não encontrada");

		const totalPaid =
			await BudgetRepository.aggregatePaymentsByExpense(expenseId);
		const currentPaid = totalPaid._sum.amount?.toNumber() ?? 0;
		if (currentPaid + data.amount > expense.totalAmount.toNumber()) {
			throw new ForbiddenError("Valor excede o total da despesa");
		}

		const payment = await BudgetRepository.createPayment({
			expenseId,
			amount: data.amount,
			paymentDate: new Date(data.paymentDate),
			method: data.method,
			reference: data.reference,
			notes: data.notes,
			createdBy: userId,
		});

		// Update expense status
		const newTotalPaid = currentPaid + data.amount;
		let status = "PLANNED";
		if (newTotalPaid >= expense.totalAmount.toNumber()) {
			status = "PAID";
		} else if (newTotalPaid > 0) {
			status = "PARTIALLY_PAID";
		}
		await BudgetRepository.updateExpense(expenseId, {
			status: status as
				| "PLANNED"
				| "PARTIALLY_PAID"
				| "PAID"
				| "OVERDUE"
				| "CANCELLED",
		});

		return payment;
	},
};
