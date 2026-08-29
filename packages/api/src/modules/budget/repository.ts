import db from "@muxima/db";

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

	updateCategory(id: string, data: Record<string, unknown>) {
		return db.budgetCategory.update({ where: { id }, data });
	},

	deleteCategory(id: string) {
		return db.budgetCategory.delete({ where: { id } });
	},

	findExpensesByEventId(eventId: string) {
		return db.expense.findMany({
			where: { eventId },
			include: { vendor: true, budgetCategory: true, payments: true },
			orderBy: { createdAt: "desc" },
		});
	},

	createExpense(data: {
		eventId: string;
		description: string;
		totalAmount: number;
		budgetCategoryId?: string;
		vendorId?: string;
		dueDate?: Date;
		notes?: string;
		createdBy: string;
	}) {
		return db.expense.create({ data });
	},

	updateExpense(id: string, data: Record<string, unknown>) {
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
