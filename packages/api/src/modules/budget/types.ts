export type BudgetInput = {
	plannedAmount: number;
	reserveAmount?: number;
	notes?: string;
};

export type ExpenseInput = {
	description: string;
	totalAmount: number;
	budgetCategoryId?: string;
	vendorId?: string;
	dueDate?: string;
	notes?: string;
};

export type PaymentInput = {
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
};
