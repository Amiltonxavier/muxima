import { ForbiddenError, NotFoundError } from "../../shared/errors/app-error";
import { BudgetRepository, type ExpenseFilterParams } from "./repository";

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
		data: {
			description: string;
			totalAmount: number;
			budgetCategoryId?: string;
			vendorId?: string;
			dueDate?: string;
			notes?: string;
		},
	) {
		return BudgetRepository.createExpense({
			eventId,
			description: data.description,
			totalAmount: data.totalAmount,
			budgetCategoryId: data.budgetCategoryId,
			vendorId: data.vendorId,
			dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
			notes: data.notes,
			createdBy: userId,
		});
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
