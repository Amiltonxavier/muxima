import { ValidationError } from "../errors/app-error";

/**
 * Business guards for supplier money, shared by every write path (create,
 * addPayment, setInstallments, updateInstallment).
 *
 * Like `supplier-money.ts`, this module is intentionally pure — no Prisma — so
 * the rules can be unit tested once and reused by every route. The routes load
 * the supplier, convert the Decimals to cents and delegate the decision here;
 * the frontend only mirrors these rules for UX (disabled states), never for
 * security.
 *
 * Money is integer cents, matching `supplier-money.ts`.
 */

export type SupplierRuleStatus =
	| "PROSPECT"
	| "CONTACTED"
	| "NEGOTIATING"
	| "CONFIRMED"
	| "COMPLETED"
	| "CANCELLED";

/** A payment can only be recorded on a confirmed supplier. */
export function assertPaymentAllowedOnStatus(status: SupplierRuleStatus): void {
	if (status !== "CONFIRMED") {
		throw new ValidationError(
			"Só é possível registar pagamentos num fornecedor confirmado.",
		);
	}
}

/** An agreed amount must exist (and be positive) before any money moves. */
export function assertAgreedAmountExists(priceCents: number): void {
	if (!(priceCents > 0)) {
		throw new ValidationError(
			"Defina primeiro o montante acordado do fornecedor.",
		);
	}
}

/**
 * The recorded payments can never exceed the agreed amount. `currentPaidCents`
 * is what is already on record (excluding the payment being created, when the
 * caller is adding a new one).
 */
export function assertPaymentsWithinAgreed(input: {
	agreedCents: number;
	currentPaidCents: number;
	nextAmountCents: number;
}): void {
	if (input.nextAmountCents <= 0) {
		throw new ValidationError("O montante pago tem de ser maior que zero.");
	}
	const total = input.currentPaidCents + input.nextAmountCents;
	if (total > input.agreedCents) {
		throw new ValidationError(
			`A soma dos pagamentos excede o montante acordado. Em falta: ${(
				(input.agreedCents - input.currentPaidCents) /
				100
			)
				.toFixed(2)
				.replace(/\.00$/, "")}.`,
		);
	}
}

/** Installments are only planned while negotiating or after confirmation. */
export function assertInstallmentsAllowedOnStatus(
	status: SupplierRuleStatus,
): void {
	if (status !== "NEGOTIATING" && status !== "CONFIRMED") {
		throw new ValidationError(
			"As parcelas só podem ser geridas num fornecedor em negociação ou confirmado.",
		);
	}
}

/**
 * A schedule can never be worth more than the agreed amount, and each
 * installment must be worth something. The cap only applies once there is an
 * agreed amount to compare against.
 */
export function assertInstallmentPlanWithinAgreed(input: {
	agreedCents: number;
	installments: Array<{ amountCents: number }>;
}): void {
	for (const [index, installment] of input.installments.entries()) {
		if (installment.amountCents <= 0) {
			throw new ValidationError(
				`A parcela ${index + 1} tem de ter um montante maior que zero.`,
			);
		}
	}

	if (input.agreedCents <= 0) {
		throw new ValidationError(
			"Defina primeiro o montante acordado do fornecedor.",
		);
	}

	const total = input.installments.reduce((sum, i) => sum + i.amountCents, 0);
	if (total > input.agreedCents) {
		throw new ValidationError(
			`A soma das parcelas (${(total / 100).toFixed(2)}) excede o montante acordado (${(input.agreedCents / 100).toFixed(2)}).`,
		);
	}
}

/**
 * The status the user may pick when changing it explicitly. A supplier that is
 * confirmed cannot go back to earlier stages; cancellation is allowed from any
 * active stage.
 */
export function assertStatusTransition(
	current: SupplierRuleStatus,
	next: SupplierRuleStatus,
): void {
	if (current === next) return;

	const backwards =
		(current === "CONFIRMED" || current === "COMPLETED") &&
		(next === "PROSPECT" ||
			next === "CONTACTED" ||
			next === "NEGOTIATING" ||
			next === "CONFIRMED");
	if (backwards && current === "COMPLETED") {
		throw new ValidationError(
			"Um fornecedor concluído não pode voltar a estados anteriores.",
		);
	}
}
