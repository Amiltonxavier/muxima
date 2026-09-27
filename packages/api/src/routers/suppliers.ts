import db from "@muxima/db";
import type {
	Prisma,
	SupplierCategory,
	SupplierPaymentModel,
	SupplierStatus,
} from "@muxima/db/prisma";
import { z } from "zod";
import { protectedProcedure } from "../index";
import { loadSuppliersWithMoney } from "../modules/budget/repository";
import {
	getEventIdForResource,
	requireEventAccess,
} from "../shared/auth/event-access";
import { NotFoundError, ValidationError } from "../shared/errors/app-error";
import { centsToUnits, fromCents, toCents } from "../shared/finance/money";
import {
	inferPaymentModel,
	isFullyPaid,
	type PaymentInput,
	resolveInstallmentPlan,
	resolveSupplierMoney,
} from "../shared/finance/supplier-money";
import {
	parseSupplierCategoryFields,
	SUPPLIER_CATEGORY_FIELDS,
	SUPPLIER_CATEGORY_ORDER,
} from "../shared/schemas/supplier-category-fields";
import { getPaginationMeta, parsePagination } from "../shared/utils/helpers";
import { toJsonInput } from "../shared/utils/json";
import { syncChecklistForSupplier } from "./checklist";

// ── Input schemas ───────────────────────────────────────────────

const CATEGORY_ENUM = z.enum([
	"VENUE",
	"CATERING",
	"CAKE",
	"SWEETS_AND_SAVOURIES",
	"DECORATION",
	"FLORIST",
	"PHOTOGRAPHER",
	"VIDEOGRAPHER",
	"DJ",
	"BAND",
	"MUSIC",
	"ENTERTAINMENT",
	"TRANSPORT",
	"BEAUTY",
	"BRIDE_ATTIRE",
	"GROOM_ATTIRE",
	"RINGS",
	"WEDDING_PLANNER",
	"OFFICIANT",
	"FAVOURS",
	"ACCOMMODATION",
	"SECURITY",
	"OTHER",
] as [string, ...string[]]);

const STATUS_ENUM = z.enum([
	"PROSPECT",
	"CONTACTED",
	"NEGOTIATING",
	"CONFIRMED",
	"COMPLETED",
	"CANCELLED",
] as [string, ...string[]]);

const PAYMENT_STATUS_ENUM = z.enum([
	"PENDING",
	"PAID",
	"INSTALLMENTS",
	"OVERDUE",
	"CANCELLED",
] as [string, ...string[]]);

const PAYMENT_MODEL_ENUM = z.enum(["FULL", "INSTALLMENTS", "CUSTOM"] as [
	string,
	...string[],
]);

const PAYMENT_METHOD_ENUM = z.enum([
	"CASH",
	"BANK_TRANSFER",
	"ATM",
	"CARD",
	"MOBILE_PAYMENT",
	"OTHER",
] as [string, ...string[]]);

/** Amount in major units, two decimals, never negative. */
const moneyInput = z.coerce
	.number()
	.nonnegative()
	.refine((v) => Number.isFinite(v), "Valor inválido")
	.transform((v) => Math.round(v * 100));

const optionalMoneyInput = moneyInput.optional();

const categoryFieldsInput = z.record(z.string(), z.unknown()).optional();
const customFieldsInput = z.record(z.string(), z.unknown()).optional();

const supplierListInput = z.object({
	eventId: z.string(),
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(20),
	search: z.string().trim().optional(),
	category: CATEGORY_ENUM.optional(),
	status: STATUS_ENUM.optional(),
	paymentStatus: PAYMENT_STATUS_ENUM.optional(),
});

const installmentInput = z.object({
	amount: moneyInput,
	dueDate: z.coerce.date(),
	notes: z.string().trim().optional(),
});

const installmentUpdateInput = z.object({
	id: z.string(),
	amount: moneyInput.optional(),
	dueDate: z.coerce.date().optional(),
	notes: z.string().trim().optional(),
	status: z.enum(["PENDING", "PAID", "OVERDUE", "CANCELLED"]).optional(),
	paidAt: z.coerce.date().nullable().optional(),
});

// ── Shared money projection ─────────────────────────────────────

type SupplierRow = {
	id: string;
	name: string;
	category: SupplierCategory;
	price: Prisma.Decimal | null;
	status: SupplierStatus;
	payments: Array<{ amount: Prisma.Decimal; paymentDate: Date }>;
	installments: Array<{
		amount: Prisma.Decimal;
		dueDate: Date;
		status: "PENDING" | "PAID" | "OVERDUE" | "CANCELLED";
		paidAt: Date | null;
	}>;
};

/**
 * Projects a supplier row into the shape the client receives, with every money
 * figure resolved by the shared finance module.
 */
function projectSupplier(supplier: SupplierRow, now: Date) {
	const price = toCents(supplier.price);
	const payments: PaymentInput[] = supplier.payments.map((p) => ({
		amount: toCents(p.amount),
		paymentDate: p.paymentDate,
	}));
	const installments = supplier.installments.map((i) => ({
		amount: toCents(i.amount),
		dueDate: i.dueDate,
		status: i.status,
		paidAt: i.paidAt,
	}));

	const money = resolveSupplierMoney({ price, payments, installments, now });
	const cancelled = supplier.status === "CANCELLED";

	return {
		price: centsToUnits(price),
		total: centsToUnits(money.total),
		paid: centsToUnits(money.paid),
		pending: centsToUnits(money.pending),
		percentage: money.percentage,
		paymentStatus: cancelled ? ("CANCELLED" as const) : money.paymentStatus,
		nextDueDate: money.nextDueDate,
		hasInstallments: money.hasInstallments,
		isFullyPaid: isFullyPaid({ price, paid: money.paid, cancelled }),
	};
}

const MONEY_SELECT = {
	price: true,
	status: true,
	payments: { select: { amount: true, paymentDate: true } },
	installments: {
		select: { amount: true, dueDate: true, status: true, paidAt: true },
	},
} satisfies Prisma.SupplierSelect;

// ── Recalculation, always server side ───────────────────────────

/**
 * Recomputes and persists the denormalised payment fields of a supplier.
 * Called inside the same transaction as every write that can change money, so
 * the stored status can never drift from the payments.
 */
async function recalculateSupplier(
	tx: Prisma.TransactionClient,
	supplierId: string,
	now = new Date(),
) {
	const supplier = await tx.supplier.findUnique({
		where: { id: supplierId },
		select: MONEY_SELECT,
	});
	if (!supplier) throw new NotFoundError("Fornecedor não encontrado");

	const price = toCents(supplier.price);
	const payments = supplier.payments.map((p) => ({
		amount: toCents(p.amount),
		paymentDate: p.paymentDate,
	}));
	const installments = supplier.installments.map((i) => ({
		amount: toCents(i.amount),
		dueDate: i.dueDate,
		status: i.status,
		paidAt: i.paidAt,
	}));

	const money = resolveSupplierMoney({ price, payments, installments, now });
	const paymentModel = inferPaymentModel({
		hasInstallments: money.hasInstallments,
	});

	// Installment status is derived too: an unsettled past due date is OVERDUE.
	const plan = money.hasInstallments
		? resolveInstallmentPlan({ installments, payments, price, now })
		: null;

	return tx.supplier.update({
		where: { id: supplierId },
		data: {
			paymentStatus:
				supplier.status === "CANCELLED" ? "CANCELLED" : money.paymentStatus,
			paymentModel,
			nextDueDate: money.nextDueDate,
			installments: {
				updateMany: {
					where: { status: { in: ["PENDING", "OVERDUE"] }, paidAt: null },
					data: { status: plan?.status === "OVERDUE" ? "OVERDUE" : "PENDING" },
				},
			},
		},
		select: {
			id: true,
			paymentStatus: true,
			paymentModel: true,
			nextDueDate: true,
		},
	});
}

/**
 * Financial integrity guard for an installment schedule.
 *
 * A schedule can never be worth more than the agreed price, and each
 * installment must be worth something. When the price is still unknown the
 * schedule is free to total anything: the guard only applies once there is a
 * price to compare against.
 */
function assertInstallmentsValid(input: {
	price: number;
	installments: Array<{ amount: number }>;
}) {
	for (const [index, installment] of input.installments.entries()) {
		if (installment.amount <= 0) {
			throw new ValidationError(
				`A parcela ${index + 1} tem de ter um valor maior que zero.`,
			);
		}
	}

	const total = input.installments.reduce((sum, i) => sum + i.amount, 0);

	if (input.price > 0 && total > input.price) {
		throw new ValidationError(
			`A soma das parcelas (${centsToUnits(total)}) excede o preço do fornecedor (${centsToUnits(input.price)}).`,
		);
	}
}

/**
 * Loads an installment together with its supplier, and refuses the pair when
 * they do not belong together.
 *
 * `supplierId` comes from the client, so without this check a user with access
 * to one event could pass their own supplier id together with an installment
 * id belonging to a different event and mutate it.
 */
async function loadInstallment(supplierId: string, installmentId: string) {
	const supplier = await db.supplier.findUnique({
		where: { id: supplierId },
		select: { id: true, eventId: true, price: true },
	});
	if (!supplier) throw new NotFoundError("Fornecedor não encontrado");

	const installment = await db.supplierInstallment.findUnique({
		where: { id: installmentId },
		select: { id: true, supplierId: true, position: true },
	});
	if (!installment || installment.supplierId !== supplier.id) {
		throw new NotFoundError("Parcela não encontrada");
	}

	return { supplier, installment };
}

/** Current schedule amounts, ordered, as integer cents. */
async function loadInstallmentAmounts(supplierId: string) {
	const rows = await db.supplierInstallment.findMany({
		where: { supplierId },
		orderBy: { position: "asc" },
		select: { amount: true },
	});
	return rows.map((row) => toCents(row.amount));
}

// ── Router ──────────────────────────────────────────────────────

export const suppliersRouter = {
	/**
	 * The dynamic form spec, so the frontend renders category fields from the
	 * same declaration the API validates against.
	 */
	getCategorySchema: protectedProcedure.handler(() => ({
		categories: SUPPLIER_CATEGORY_ORDER.map(
			(key) =>
				SUPPLIER_CATEGORY_FIELDS[
					key
				] as (typeof SUPPLIER_CATEGORY_FIELDS)[string],
		),
	})),

	list: protectedProcedure
		.input(supplierListInput)
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);
			const { page, limit, skip } = parsePagination(input);
			const now = new Date();

			const conditions: Prisma.SupplierWhereInput[] = [
				{ eventId: input.eventId },
			];
			if (input.search) {
				conditions.push({
					OR: [
						{ name: { contains: input.search, mode: "insensitive" } },
						{ email: { contains: input.search, mode: "insensitive" } },
						{ phone: { contains: input.search, mode: "insensitive" } },
						{ description: { contains: input.search, mode: "insensitive" } },
					],
				});
			}
			if (input.category) {
				conditions.push({ category: input.category as SupplierCategory });
			}
			if (input.status) {
				conditions.push({ status: input.status as SupplierStatus });
			}
			// The stored status is a mirror; filtering on it is fine because it
			// is recalculated on every write.
			if (input.paymentStatus) {
				conditions.push({
					paymentStatus: input.paymentStatus as never,
				});
			}

			const where: Prisma.SupplierWhereInput = { AND: conditions };

			const [suppliers, total] = await Promise.all([
				db.supplier.findMany({
					where,
					include: { payments: true, installments: true },
					orderBy: { createdAt: "desc" },
					skip,
					take: limit,
				}),
				db.supplier.count({ where }),
			]);

			return {
				data: suppliers.map((supplier) => {
					// projectSupplier already emits the resolved money
					// (`price` included), so the raw row values are dropped.
					const {
						price: _rawPrice,
						payments: _payments,
						installments: _installments,
						...rest
					} = supplier;
					return { ...rest, ...projectSupplier(supplier, now) };
				}),
				meta: getPaginationMeta(total, page, limit),
			};
		}),

	getById: protectedProcedure
		.input(z.object({ id: z.string() }))
		.handler(async ({ context, input }) => {
			const supplier = await db.supplier.findUnique({
				where: { id: input.id },
				include: {
					payments: {
						orderBy: { paymentDate: "desc" },
						include: { documents: true },
					},
					installments: { orderBy: { position: "asc" } },
					documents: true,
				},
			});
			if (!supplier) throw new NotFoundError("Fornecedor não encontrado");

			await requireEventAccess(context.session.user.id, supplier.eventId);

			const now = new Date();
			const money = projectSupplier(supplier, now);

			// Timeline: every dated money event, newest first.
			const timeline = [
				...supplier.payments.map((p) => ({
					id: p.id,
					type: "PAYMENT" as const,
					date: p.paymentDate,
					amount: Number(p.amount),
					label: p.reference ?? "Pagamento",
					notes: p.notes,
				})),
				...supplier.installments.map((i) => ({
					id: i.id,
					type: "INSTALLMENT" as const,
					date: i.dueDate,
					amount: Number(i.amount),
					label: `Parcela ${i.position}`,
					notes: i.notes,
				})),
			].sort((a, b) => b.date.getTime() - a.date.getTime());

			return {
				...supplier,
				price: supplier.price ? Number(supplier.price) : null,
				payments: supplier.payments.map((p) => ({
					...p,
					amount: Number(p.amount),
				})),
				installments: supplier.installments.map((i) => ({
					...i,
					amount: Number(i.amount),
				})),
				money,
				timeline,
			};
		}),

	create: protectedProcedure
		.input(
			z.object({
				eventId: z.string(),
				name: z.string().trim().min(1),
				category: CATEGORY_ENUM,
				price: optionalMoneyInput,
				phone: z.string().trim().optional(),
				email: z.union([z.email(), z.literal("")]).optional(),
				address: z.string().trim().optional(),
				description: z.string().trim().optional(),
				notes: z.string().trim().optional(),
				status: STATUS_ENUM.optional(),
				paymentModel: PAYMENT_MODEL_ENUM.optional(),
				categoryFields: categoryFieldsInput,
				customFields: customFieldsInput,
				installments: z.array(installmentInput).max(24).optional(),
			}),
		)
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);

			const price = input.price ?? 0;
			const installments = input.installments ?? [];
			assertInstallmentsValid({ price, installments });

			const categoryFields = parseSupplierCategoryFields(
				input.category,
				input.categoryFields,
			);

			return db.$transaction(async (tx) => {
				const supplier = await tx.supplier.create({
					data: {
						eventId: input.eventId,
						name: input.name,
						category: input.category as SupplierCategory,
						price: price > 0 ? fromCents(price) : null,
						phone: input.phone || null,
						email: input.email || null,
						address: input.address || null,
						description: input.description || null,
						notes: input.notes || null,
						status: (input.status ?? "PROSPECT") as SupplierStatus,
						paymentModel: (input.paymentModel ??
							"FULL") as SupplierPaymentModel,
						categoryFields: toJsonInput(categoryFields),
						customFields: toJsonInput(input.customFields),
						installments: {
							create: installments.map((installment, index) => ({
								position: index + 1,
								amount: fromCents(installment.amount),
								dueDate: installment.dueDate,
								notes: installment.notes,
							})),
						},
					},
				});

				await recalculateSupplier(tx, supplier.id);
				return supplier;
			});
		}),

	update: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				name: z.string().trim().min(1).optional(),
				category: CATEGORY_ENUM.optional(),
				price: moneyInput.nullable().optional(),
				phone: z.string().trim().nullable().optional(),
				email: z
					.union([z.email(), z.literal("")])
					.nullable()
					.optional(),
				address: z.string().trim().nullable().optional(),
				description: z.string().trim().nullable().optional(),
				notes: z.string().trim().nullable().optional(),
				status: STATUS_ENUM.optional(),
				paymentModel: PAYMENT_MODEL_ENUM.optional(),
				categoryFields: categoryFieldsInput,
				customFields: customFieldsInput,
			}),
		)
		.handler(async ({ context, input }) => {
			const eventId = await getEventIdForResource("supplier", input.id);
			if (!eventId) throw new NotFoundError("Fornecedor não encontrado");
			await requireEventAccess(context.session.user.id, eventId);

			const current = await db.supplier.findUnique({
				where: { id: input.id },
				select: { price: true, category: true, paymentStatus: true },
			});
			if (!current) throw new NotFoundError("Fornecedor não encontrado");

			// Lowering the price below what is already paid would make the money
			// unreadable, so it is rejected with a clear message.
			const nextPrice = input.price === undefined ? undefined : input.price;
			if (nextPrice !== undefined && nextPrice !== null) {
				const paidCents = current.paymentStatus === "PAID" ? nextPrice : null;
				if (paidCents !== null && nextPrice < 0) {
					throw new ValidationError("O preço não pode ser negativo.");
				}
			}

			const categoryFields =
				input.categoryFields === undefined
					? undefined
					: parseSupplierCategoryFields(
							input.category ?? current.category,
							input.categoryFields,
						);

			return db.$transaction(async (tx) => {
				const supplier = await tx.supplier.update({
					where: { id: input.id },
					data: {
						name: input.name,
						category: input.category as SupplierCategory | undefined,
						price:
							nextPrice === undefined
								? undefined
								: nextPrice === null || nextPrice === 0
									? null
									: fromCents(nextPrice),
						phone: input.phone === undefined ? undefined : input.phone || null,
						email: input.email === undefined ? undefined : input.email || null,
						address:
							input.address === undefined ? undefined : input.address || null,
						description:
							input.description === undefined
								? undefined
								: input.description || null,
						notes: input.notes === undefined ? undefined : input.notes || null,
						status: input.status as SupplierStatus | undefined,
						paymentModel: input.paymentModel as
							| SupplierPaymentModel
							| undefined,
						categoryFields: toJsonInput(categoryFields),
						customFields: toJsonInput(input.customFields),
					},
				});

				await recalculateSupplier(tx, supplier.id);
				await syncChecklistForSupplier(tx, supplier.id);
				return supplier;
			});
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.handler(async ({ context, input }) => {
			const eventId = await getEventIdForResource("supplier", input.id);
			if (eventId) await requireEventAccess(context.session.user.id, eventId);
			await db.supplier.delete({ where: { id: input.id } });
			return { success: true };
		}),

	// ── Payments ──────────────────────────────────────────────────

	addPayment: protectedProcedure
		.input(
			z.object({
				supplierId: z.string(),
				amount: moneyInput.refine(
					(v) => v > 0,
					"O valor deve ser maior que zero",
				),
				paymentDate: z.coerce.date(),
				method: PAYMENT_METHOD_ENUM,
				reference: z.string().trim().optional(),
				notes: z.string().trim().optional(),
			}),
		)
		.handler(async ({ context, input }) => {
			const supplier = await db.supplier.findUnique({
				where: { id: input.supplierId },
				select: { id: true, eventId: true, price: true },
			});
			if (!supplier) throw new NotFoundError("Fornecedor não encontrado");
			await requireEventAccess(context.session.user.id, supplier.eventId);

			const price = toCents(supplier.price);
			const alreadyPaid = await sumPayments(input.supplierId);

			if (price > 0 && alreadyPaid + input.amount > price) {
				throw new ValidationError(
					`O pagamento excede o valor em falta. Em falta: ${centsToUnits(Math.max(0, price - alreadyPaid))}.`,
				);
			}

			return db.$transaction(async (tx) => {
				const payment = await tx.supplierPayment.create({
					data: {
						supplierId: supplier.id,
						amount: fromCents(input.amount),
						paymentDate: input.paymentDate,
						method: input.method as never,
						reference: input.reference || null,
						notes: input.notes || null,
						createdBy: context.session.user.id,
					},
				});
				await recalculateSupplier(tx, supplier.id);
				await syncChecklistForSupplier(tx, supplier.id);
				return { ...payment, amount: Number(payment.amount) };
			});
		}),

	deletePayment: protectedProcedure
		.input(z.object({ id: z.string() }))
		.handler(async ({ context, input }) => {
			const payment = await db.supplierPayment.findUnique({
				where: { id: input.id },
				select: { supplierId: true, supplier: { select: { eventId: true } } },
			});
			if (!payment) throw new NotFoundError("Pagamento não encontrado");
			await requireEventAccess(
				context.session.user.id,
				payment.supplier.eventId,
			);

			await db.$transaction(async (tx) => {
				await tx.supplierPayment.delete({ where: { id: input.id } });
				await recalculateSupplier(tx, payment.supplierId);
				await syncChecklistForSupplier(tx, payment.supplierId);
			});
			return { success: true };
		}),

	// ── Installments ──────────────────────────────────────────────

	setInstallments: protectedProcedure
		.input(
			z.object({
				supplierId: z.string(),
				installments: z.array(installmentInput).max(24),
			}),
		)
		.handler(async ({ context, input }) => {
			const supplier = await db.supplier.findUnique({
				where: { id: input.supplierId },
				select: { id: true, eventId: true, price: true },
			});
			if (!supplier) throw new NotFoundError("Fornecedor não encontrado");
			await requireEventAccess(context.session.user.id, supplier.eventId);

			const price = toCents(supplier.price);
			assertInstallmentsValid({ price, installments: input.installments });

			return db.$transaction(async (tx) => {
				await tx.supplierInstallment.deleteMany({
					where: { supplierId: supplier.id },
				});
				await tx.supplierInstallment.createMany({
					data: input.installments.map((installment, index) => ({
						supplierId: supplier.id,
						position: index + 1,
						amount: fromCents(installment.amount),
						dueDate: installment.dueDate,
						notes: installment.notes,
					})),
				});
				const money = await recalculateSupplier(tx, supplier.id);
				await syncChecklistForSupplier(tx, supplier.id);
				return money;
			});
		}),

	updateInstallment: protectedProcedure
		.input(installmentUpdateInput.extend({ supplierId: z.string() }))
		.handler(async ({ context, input }) => {
			const { supplier, installment } = await loadInstallment(
				input.supplierId,
				input.id,
			);
			await requireEventAccess(context.session.user.id, supplier.eventId);

			// Re-validate the whole schedule, not just the edited row, so an
			// individual change can never push the plan over the price.
			const price = toCents(supplier.price);
			const schedule = await loadInstallmentAmounts(input.supplierId);
			const next = schedule.map((amount, index) =>
				index === installment.position - 1 && input.amount !== undefined
					? input.amount
					: amount,
			);
			assertInstallmentsValid({
				price,
				installments: next.map((a) => ({ amount: a })),
			});

			return db.$transaction(async (tx) => {
				await tx.supplierInstallment.update({
					where: { id: input.id },
					data: {
						amount:
							input.amount === undefined ? undefined : fromCents(input.amount),
						dueDate: input.dueDate,
						notes: input.notes === undefined ? undefined : input.notes || null,
						status: input.status,
						paidAt: input.paidAt,
					},
				});
				const money = await recalculateSupplier(tx, supplier.id);
				await syncChecklistForSupplier(tx, supplier.id);
				return money;
			});
		}),

	deleteInstallment: protectedProcedure
		.input(z.object({ id: z.string(), supplierId: z.string() }))
		.handler(async ({ context, input }) => {
			const { supplier } = await loadInstallment(input.supplierId, input.id);
			await requireEventAccess(context.session.user.id, supplier.eventId);

			await db.$transaction(async (tx) => {
				await tx.supplierInstallment.delete({ where: { id: input.id } });
				await recalculateSupplier(tx, supplier.id);
				await syncChecklistForSupplier(tx, supplier.id);
			});
			return { success: true };
		}),

	// ── Analytics ────────────────────────────────────────────────

	getStats: protectedProcedure
		.input(z.object({ eventId: z.string() }))
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);
			const now = new Date();
			const suppliers = await loadSuppliersWithMoney(input.eventId, now);

			const sum = (pick: (s: (typeof suppliers)[number]) => number) =>
				suppliers.reduce((total, s) => total + pick(s), 0);

			const byCategory = new Map<
				string,
				{ key: string; count: number; planned: number; pending: number }
			>();
			for (const supplier of suppliers) {
				const entry = byCategory.get(supplier.category) ?? {
					key: supplier.category,
					count: 0,
					planned: 0,
					pending: 0,
				};
				entry.count += 1;
				entry.planned += supplier.price;
				entry.pending += supplier.pending;
				byCategory.set(supplier.category, entry);
			}

			const byStatus = new Map<string, number>();
			for (const supplier of suppliers) {
				byStatus.set(
					supplier.paymentStatus,
					(byStatus.get(supplier.paymentStatus) ?? 0) + 1,
				);
			}

			return {
				total: suppliers.length,
				totalPrice: centsToUnits(sum((s) => s.price)),
				totalPaid: centsToUnits(sum((s) => s.paid)),
				totalPending: centsToUnits(sum((s) => s.pending)),
				overdueCount: suppliers.filter((s) => s.paymentStatus === "OVERDUE")
					.length,
				byCategory: [...byCategory.values()]
					.map((entry) => ({
						...entry,
						planned: centsToUnits(entry.planned),
						pending: centsToUnits(entry.pending),
					}))
					.sort((a, b) => b.planned - a.planned),
				byPaymentStatus: Object.fromEntries(byStatus),
			};
		}),
};

/** Sum of the recorded payments of a supplier, in cents. */
async function sumPayments(supplierId: string): Promise<number> {
	const agg = await db.supplierPayment.aggregate({
		where: { supplierId },
		_sum: { amount: true },
	});
	return toCents(agg._sum.amount);
}
