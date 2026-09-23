import db from "@muxima/db";
import type { ExpenseStatus, ExpenseType, Prisma } from "@muxima/db/prisma";

export type ExpenseFilterParams = {
	search?: string;
	status?: ExpenseStatus;
	type?: ExpenseType;
	vendorId?: string;
};

function buildExpenseWhere(
	eventId: string,
	filters?: ExpenseFilterParams,
): Prisma.ExpenseWhereInput {
	const conditions: Prisma.ExpenseWhereInput[] = [{ eventId }];

	if (filters?.search) {
		conditions.push({
			OR: [
				{ description: { contains: filters.search, mode: "insensitive" } },
				{ notes: { contains: filters.search, mode: "insensitive" } },
			],
		});
	}
	if (filters?.status) {
		conditions.push({ status: filters.status });
	}
	if (filters?.type) {
		conditions.push({ type: filters.type });
	}
	if (filters?.vendorId) {
		conditions.push({ vendorId: filters.vendorId });
	}

	return { AND: conditions };
}

export const BudgetRepository = {
	findByEventId(eventId: string) {
		return db.budget.findUnique({ where: { eventId } });
	},

	upsert(
		eventId: string,
		data: { plannedAmount: number; reserveAmount?: number; notes?: string },
	) {
		return db.budget.upsert({
			where: { eventId },
			update: data,
			create: { eventId, ...data },
		});
	},

	findCategoriesByEventId(eventId: string) {
		return db.budgetCategory.findMany({ where: { eventId } });
	},

	createCategory(data: {
		eventId: string;
		name: string;
		description?: string;
		plannedAmount?: number;
	}) {
		return db.budgetCategory.create({ data });
	},

	updateCategory(
		id: string,
		data: Partial<{
			name: string;
			description: string;
			plannedAmount: number;
		}>,
	) {
		return db.budgetCategory.update({ where: { id }, data });
	},

	deleteCategory(id: string) {
		return db.budgetCategory.delete({ where: { id } });
	},

	findExpensesByEventId(
		eventId: string,
		pagination: { page: number; limit: number },
		filters?: ExpenseFilterParams,
	) {
		const skip = (pagination.page - 1) * pagination.limit;
		return db.expense.findMany({
			where: buildExpenseWhere(eventId, filters),
			include: { vendor: true, budgetCategory: true, payments: true },
			orderBy: { createdAt: "desc" },
			skip,
			take: pagination.limit,
		});
	},

	countExpensesByEventId(eventId: string, filters?: ExpenseFilterParams) {
		return db.expense.count({ where: buildExpenseWhere(eventId, filters) });
	},

	updateExpense(
		id: string,
		data: Partial<{
			description: string;
			totalAmount: number;
			budgetCategoryId: string;
			vendorId: string;
			dueDate: Date;
			status: "PLANNED" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "CANCELLED";
			paidPercentage: number;
			notes: string;
		}>,
	) {
		return db.expense.update({ where: { id }, data });
	},

	findExpenseById(id: string) {
		return db.expense.findUnique({ where: { id } });
	},

	createPayment(data: {
		expenseId: string;
		amount: number;
		paymentDate: Date;
		method:
			| "CASH"
			| "BANK_TRANSFER"
			| "ATM"
			| "CARD"
			| "MOBILE_PAYMENT"
			| "OTHER";
		reference?: string;
		notes?: string;
		createdBy: string;
	}) {
		return db.payment.create({ data });
	},

	aggregatePaymentsByExpense(expenseId: string) {
		return db.payment.aggregate({
			where: { expenseId },
			_sum: { amount: true },
		});
	},
};
