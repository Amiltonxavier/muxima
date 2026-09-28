import type { PAYMENT_METHOD_LABELS } from "@/utils/status-helpers";
import type {
	SupplierCategoryValue,
	SupplierPaymentStatusValue,
	SupplierStatusValue,
} from "../-queries/suppliers-queries";

export type SupplierCategoryFilter = "ALL" | SupplierCategoryValue;
export type SupplierStatusFilter = "ALL" | SupplierStatusValue;
export type SupplierPaymentStatusFilter = "ALL" | SupplierPaymentStatusValue;

/** Shape held by the form while the user is typing. */
export type SupplierFormValues = {
	name: string;
	category: SupplierCategoryValue;
	price: number;
	phone: string;
	email: string;
	address: string;
	nif: string;
	iban: string;
	hasMcxExpress: boolean;
	mcxPhone: string;
	description: string;
	notes: string;
	status: SupplierStatusValue;
};

/** Optional first payment captured in the create/edit form. */
export type SupplierFormPayment = {
	amount: number;
	paymentDate: string;
	method: SupplierPaymentMethod;
	reference: string;
};

/** Optional installment row captured in the create/edit form. */
export type SupplierFormInstallment = {
	/** Stable key for React while the draft rows are edited. */
	draftId: string;
	amount: string;
	dueDate: string;
};

/**
 * Payload sent to the API: the empty strings of the form become `undefined` so
 * the backend applies its own defaults instead of persisting blanks. Status is
 * set through the dedicated `changeStatus` action, not the generic update.
 */
export type SupplierSubmitValues = {
	name: string;
	category: SupplierCategoryValue;
	price?: number;
	phone?: string;
	email?: string;
	address?: string;
	nif?: string;
	iban?: string;
	hasMcxExpress?: boolean;
	mcxPhone?: string;
	description?: string;
	notes?: string;
	status?: SupplierStatusValue;
	payment?: {
		amount: number;
		paymentDate: Date;
		method: SupplierPaymentMethod;
		reference?: string;
	};
	installments?: Array<{ amount: number; dueDate: Date; notes?: string }>;
	customFields?: Record<string, unknown>;
};

export type SupplierCustomFields = Record<string, unknown>;

/** One field of `suppliers.getCategorySchema`, defined by the API at runtime. */
export type SupplierFieldSpec = {
	name: string;
	label: string;
	type: "text" | "textarea" | "number" | "boolean" | "date" | "tags" | "items";
	placeholder?: string;
	required?: boolean;
};

export type SupplierProductItem = {
	name: string;
	quantity: string;
	unit: string;
};

/** An installment as the API returns it, used to seed the editable plan. */
export type SupplierInstallmentInput = {
	amount: number;
	dueDate: string | Date;
	notes?: string;
};

/** An installment row while it is being edited, kept as raw input strings. */
export type SupplierInstallmentDraft = {
	amount: string;
	dueDate: string;
	notes: string;
};

export type SupplierInstallmentValue = {
	amount: number;
	dueDate: Date;
	notes?: string;
};

export type SupplierPaymentMethod = keyof typeof PAYMENT_METHOD_LABELS;

export type SupplierPaymentValues = {
	supplierId: string;
	amount: number;
	paymentDate: Date;
	method: SupplierPaymentMethod;
	reference?: string;
};
