import type { ACTION_TYPES_EXPENSE } from "../-constants";

export type ActionTypeExpense =
	(typeof ACTION_TYPES_EXPENSE)[keyof typeof ACTION_TYPES_EXPENSE];

export interface Budget {
	id: string;
	eventId: string;
	title?: string;
	budgetLimit?: number;
	expenses?: Expense[];
}

export interface Expense {
	id: string;
	vendorId?: string;
	description: string;
	totalAmount: number;
	expenseDate?: string;
	isPaid: boolean;
	paymentMethod?: string;
	category?: string;
	vendor?: {
		id: string;
		name: string;
	};
}

export const CATEGORY_OPTIONS = [
	{ value: "FOOD", label: "Alimentacao" },
	{ value: "DRINKS", label: "Bebidas" },
	{ value: "VENUE", label: "Espaco" },
	{ value: "DECOR", label: "Decoracao" },
	{ value: "PHOTO", label: "Fotografia" },
	{ value: "MUSIC", label: "Musica" },
	{ value: "FASHION", label: "Vestuario" },
	{ value: "STATIONERY", label: "Convites/Papelaria" },
	{ value: "OTHER", label: "Outros" },
];

export const PAYMENT_METHOD_OPTIONS = [
	{ value: "CASH", label: "Dinheiro" },
	{ value: "TRANSFER", label: "Transferencia" },
	{ value: "CARD", label: "Cartao" },
	{ value: "MPESA", label: "M-Pesa" },
	{ value: "OTHER", label: "Outro" },
];

export const CATEGORY_MAP: Record<string, string> = Object.fromEntries(
	CATEGORY_OPTIONS.map((c) => [c.value, c.label]),
);
