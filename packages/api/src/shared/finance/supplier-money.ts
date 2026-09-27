import type {
	InstallmentStatus,
	SupplierPaymentModel,
	SupplierPaymentStatus,
} from "@muxima/db/prisma";

/**
 * Single source of truth for supplier money and payment status.
 *
 * Every rule in here is intentionally pure and free of Prisma so it can be unit
 * tested in isolation and reused by the suppliers, budget and checklist
 * modules without any of them re-deriving the same numbers.
 *
 * Money is handled as integer cents (`number`) at the boundary: Prisma
 * `Decimal` values are converted once, on the way in and out. Sums are
 * therefore exact — no floating point drift.
 */

export type MoneyInput = {
	/** Agreed price in cents. */
	price: number;
};

export type InstallmentInput = {
	amount: number;
	dueDate: Date;
	status: InstallmentStatus;
	paidAt: Date | null;
};

export type PaymentInput = {
	amount: number;
	paymentDate: Date;
};

export type InstallmentPlanInput = {
	installments: InstallmentInput[];
	payments: PaymentInput[];
	price: number;
	now: Date;
};

export type InstallmentPlanResult = {
	/** Sum of the installment amounts, in cents. */
	total: number;
	/** Amount already settled through installments, in cents. */
	paid: number;
	/** `total - paid`, never negative. */
	remaining: number;
	/** `total - paid` expressed as a 0..100 ratio. */
	percentage: number;
	status: InstallmentStatus;
	/** Nearest unsettled due date, or null when nothing is left to pay. */
	nextDueDate: Date | null;
};

export type SupplierMoneyInput = {
	price: number;
	payments: PaymentInput[];
	installments: InstallmentInput[];
	now: Date;
};

export type SupplierMoneyResult = {
	/** Agreed price in cents; 0 when unknown. */
	total: number;
	/** Sum of the recorded payments, in cents. */
	paid: number;
	/** Amount still owed, never negative. */
	pending: number;
	/** `paid` expressed as a 0..100 ratio of `total`. */
	percentage: number;
	paymentStatus: SupplierPaymentStatus;
	/** Nearest unsettled due date across installments. */
	nextDueDate: Date | null;
	hasInstallments: boolean;
};

const isSettled = (installment: InstallmentInput): boolean =>
	installment.status === "PAID" || installment.paidAt !== null;

const ratio = (part: number, whole: number): number =>
	whole <= 0 ? 0 : Math.min(100, Math.max(0, Math.round((part / whole) * 100)));

/**
 * Overdue is defined once, here: a due date strictly in the past that has not
 * been settled. No module is allowed to re-implement this comparison.
 */
export const isOverdue = (
	dueDate: Date,
	settled: boolean,
	now: Date,
): boolean => !settled && dueDate.getTime() < now.getTime();

export function resolveInstallmentPlan({
	installments,
	payments,
	now,
}: InstallmentPlanInput): InstallmentPlanResult {
	const active = installments.filter((i) => i.status !== "CANCELLED");
	const total = active.reduce((sum, i) => sum + i.amount, 0);
	const paid = active.filter(isSettled).reduce((sum, i) => sum + i.amount, 0);
	const paidFromPayments = payments.reduce((sum, p) => sum + p.amount, 0);

	// Payments recorded outside the installment schedule settle it from the
	// earliest due date onwards, so the effective settled amount is the greater
	// of the two — a payment and its installment are never double counted.
	const settled = Math.min(total, Math.max(paid, paidFromPayments));
	const remaining = Math.max(0, total - settled);

	const nextDueDate =
		remaining > 0
			? ([...active]
					.filter((i) => !isSettled(i))
					.map((i) => i.dueDate)
					.sort((a, b) => a.getTime() - b.getTime())[0] ?? null)
			: null;

	let status: InstallmentStatus;
	if (active.length === 0) {
		status = "PENDING";
	} else if (remaining === 0) {
		status = "PAID";
	} else if (nextDueDate && isOverdue(nextDueDate, false, now)) {
		status = "OVERDUE";
	} else {
		status = "PENDING";
	}

	return {
		total,
		paid: settled,
		remaining,
		percentage: ratio(settled, total),
		status,
		nextDueDate,
	};
}

/**
 * Derives the payment status of a supplier.
 *
 * A supplier is OVERDUE when it has installments with a due date in the past
 * that are not settled. A partially paid supplier keeps INSTALLMENTS rather
 * than OVERDUE so the UI can still show progress; the explicit OVERDUE only
 * wins when money is actually late.
 */
export function resolveSupplierMoney({
	price,
	payments,
	installments,
	now,
}: SupplierMoneyInput): SupplierMoneyResult {
	const active = installments.filter((i) => i.status !== "CANCELLED");
	const hasInstallments = active.length > 0;

	const paid = payments.reduce((sum, p) => sum + p.amount, 0);
	// Guard against a corrupted schedule pushing the pending amount negative.
	const pending = Math.max(0, price - paid);

	const plan = hasInstallments
		? resolveInstallmentPlan({ installments, payments, price, now })
		: null;

	let paymentStatus: SupplierPaymentStatus;
	if (hasInstallments && plan?.status === "OVERDUE") {
		paymentStatus = "OVERDUE";
	} else if (price > 0 && paid >= price) {
		paymentStatus = "PAID";
	} else if (hasInstallments && paid > 0) {
		paymentStatus = "INSTALLMENTS";
	} else if (paid > 0) {
		paymentStatus = "INSTALLMENTS";
	} else {
		paymentStatus = "PENDING";
	}

	return {
		total: price,
		paid,
		pending,
		percentage: ratio(paid, price),
		paymentStatus,
		nextDueDate: plan?.nextDueDate ?? null,
		hasInstallments,
	};
}

/**
 * A supplier is fully paid when the recorded payments cover the agreed price,
 * or when it has no price and at least one payment was recorded.
 */
export function isFullyPaid(input: {
	price: number;
	paid: number;
	cancelled: boolean;
}): boolean {
	if (input.cancelled) return false;
	if (input.price <= 0) return input.paid > 0;
	return input.paid >= input.price;
}

export function inferPaymentModel(input: {
	hasInstallments: boolean;
	requested?: SupplierPaymentModel | undefined;
}): SupplierPaymentModel {
	if (input.requested) return input.requested;
	return input.hasInstallments ? "INSTALLMENTS" : "FULL";
}
