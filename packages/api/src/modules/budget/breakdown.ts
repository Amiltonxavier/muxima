import { isOverdue } from "../../shared/finance/supplier-money";
import type {
	BudgetBreakdownEntry,
	BudgetTotals,
} from "../../shared/types/entities";

/**
 * Pure budget maths.
 *
 * The budget screen is the only place in the product that aggregates money, so
 * every rule is kept here as a plain function over already-resolved numbers:
 * no Prisma, no dates fetched internally, no hidden state. That makes the
 * arithmetic testable and keeps `repository.ts` responsible for nothing but
 * loading rows.
 *
 * All amounts are integer cents throughout.
 */

export type BudgetSource = "INVENTORY" | "SUPPLIER";

export type BudgetLine = {
	id: string;
	label: string;
	source: BudgetSource;
	/** Agreed/planned amount. */
	planned: number;
	/** Amount already settled. */
	paid: number;
	/** Amount still owed. */
	pending: number;
	/** Percentage of `planned` already settled, 0..100. */
	percentage: number;
	status: string | null;
};

/**
 * `BudgetTotals` and `BudgetBreakdownEntry` live in the shared entities so the
 * API and the clients read the same shape; every field is documented there.
 */
export type { BudgetBreakdownEntry, BudgetTotals };

export type BudgetAnalytics = {
	byCategory: BudgetBreakdownEntry[];
	bySource: BudgetBreakdownEntry[];
	byPaymentStatus: BudgetBreakdownEntry[];
	topPendingSuppliers: Array<{
		id: string;
		name: string;
		category: string;
		planned: number;
		pending: number;
		paymentStatus: string;
		nextDueDate: Date | null;
	}>;
	overdueSuppliers: Array<{
		id: string;
		name: string;
		overdueAmount: number;
		nextDueDate: Date | null;
	}>;
	monthlySpend: Array<{ month: string; amount: number }>;
};

export type BudgetSnapshot = {
	totals: BudgetTotals;
	lines: BudgetLine[];
	breakdown: BudgetAnalytics;
	/** True when no target was ever set for the event. */
	hasTarget: boolean;
};

export type SupplierWithMoney = {
	id: string;
	name: string;
	category: string;
	price: number;
	paid: number;
	pending: number;
	paymentStatus: string;
	nextDueDate: Date | null;
};

export type InventoryWithMoney = {
	id: string;
	name: string;
	category: string;
	status: string;
	planned: number;
	spent: number;
	pending: number;
};

export type OverdueSupplierInput = {
	id: string;
	name: string;
	installments: Array<{ amount: number; dueDate: Date }>;
};

/**
 * A supplier only takes part in the budget when it actually holds money: an
 * agreed price, a payment, or both. Prospects and first contacts are dropped,
 * because a row worth 0 would inflate the counts without moving any total, and
 * a cancelled supplier is forced to 0 by the loader for the same reason.
 */
export function committedSuppliers(
	suppliers: SupplierWithMoney[],
): SupplierWithMoney[] {
	return suppliers.filter((s) => s.price > 0 || s.paid > 0);
}

/** Percentage of `whole` represented by `part`, clamped to 0..100. */
export const ratio = (part: number, whole: number): number =>
	whole <= 0 ? 0 : Math.min(100, Math.max(0, Math.round((part / whole) * 100)));

/** `YYYY-MM` in UTC, so the monthly chart never shifts with the server timezone. */
export const monthKey = (date: Date): string =>
	`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

/**
 * One line per drillable row. Inventory contributes planned and acquired spend,
 * suppliers contribute their agreed price and the payments actually made.
 */
export function buildLines(
	inventory: InventoryWithMoney[],
	suppliers: SupplierWithMoney[],
): BudgetLine[] {
	return [
		...inventory.map((item) => ({
			id: item.id,
			label: item.name,
			source: "INVENTORY" as const,
			planned: item.planned,
			paid: item.spent,
			pending: item.pending,
			percentage: ratio(item.spent, item.planned),
			status: item.status,
		})),
		...committedSuppliers(suppliers).map((supplier) => ({
			id: supplier.id,
			label: supplier.name,
			source: "SUPPLIER" as const,
			planned: supplier.price,
			paid: supplier.paid,
			pending: supplier.pending,
			percentage: ratio(supplier.paid, supplier.price),
			status: supplier.paymentStatus,
		})),
	];
}

export function buildTotals(input: {
	lines: BudgetLine[];
	totalBudget: number;
	reserve: number;
	overdue: number;
	currency: string;
}): BudgetTotals {
	const { lines, currency } = input;
	const planned = lines.reduce((sum, line) => sum + line.planned, 0);
	const spent = lines.reduce((sum, line) => sum + line.paid, 0);
	const pending = lines.reduce((sum, line) => sum + line.pending, 0);

	const reserve = input.reserve;
	const available = Math.max(0, input.totalBudget - reserve);

	return {
		totalBudget: input.totalBudget,
		reserve,
		available,
		planned,
		spent,
		pending,
		overdue: input.overdue,
		// Negative remaining is intentional: it is how the UI detects an
		// over-budget event.
		remaining: available - planned,
		// With no target, the denominator falls back to the committed spend so
		// the ratio stays a meaningful 100 rather than dividing by zero.
		usagePercentage: ratio(planned, available || planned),
		// How much of what was committed has actually been settled. The client
		// never derives this itself, it only renders it.
		paymentPercentage: ratio(spent, planned),
		currency,
	};
}

/**
 * pt-PT labels for the category keys stored on the rows. The key is always
 * returned as well, so the client can localise or group differently without a
 * new API call.
 */
const CATEGORY_LABELS: Record<string, string> = {
	// Inventory
	DRINK: "Bebidas",
	MATERIAL: "Materiais",
	EQUIPMENT: "Equipamento",
	FURNITURE: "Mobiliário",
	LINEN: "Loiça e têxteis",
	// Suppliers
	VENUE: "Espaço",
	DECORATION: "Decoração",
	FLORIST: "Flores",
	CATERING: "Catering",
	CAKE: "Bolo",
	SWEETS_AND_SAVOURIES: "Doces e salgados",
	PHOTOGRAPHER: "Fotografia",
	VIDEOGRAPHER: "Vídeo",
	DJ: "DJ",
	BAND: "Banda",
	MUSIC: "Música",
	ENTERTAINMENT: "Animação",
	TRANSPORT: "Transportes",
	BEAUTY: "Beleza",
	BRIDE_ATTIRE: "Vestido da noiva",
	GROOM_ATTIRE: "Traje do noivo",
	RINGS: "Alianças",
	WEDDING_PLANNER: "Planeamento",
	OFFICIANT: "Celebrante",
	FAVOURS: "Lembranças",
	ACCOMMODATION: "Alojamento",
	SECURITY: "Segurança",
	OTHER: "Outros",
};

/** Same for the payment statuses, which are stored as enum keys. */
const PAYMENT_STATUS_LABELS: Record<string, string> = {
	PENDING: "Por pagar",
	PAID: "Pago",
	INSTALLMENTS: "Em parcelas",
	OVERDUE: "Em atraso",
	CANCELLED: "Cancelado",
};

function emptyEntry(key: string, label: string): BudgetBreakdownEntry {
	return {
		key,
		label,
		planned: 0,
		paid: 0,
		pending: 0,
		percentage: 0,
		count: 0,
	};
}

const withRatio = (entry: BudgetBreakdownEntry): BudgetBreakdownEntry => ({
	...entry,
	percentage: ratio(entry.paid, entry.planned),
});

/** Spend grouped by category, heaviest first. */
export function buildCategoryBreakdown(
	inventory: InventoryWithMoney[],
	suppliers: SupplierWithMoney[],
): BudgetBreakdownEntry[] {
	const map = new Map<string, BudgetBreakdownEntry>();
	const upsert = (key: string) => {
		const existing = map.get(key);
		if (existing) return existing;
		const entry = emptyEntry(key, CATEGORY_LABELS[key] ?? key);
		map.set(key, entry);
		return entry;
	};

	for (const item of inventory) {
		const entry = upsert(item.category);
		entry.planned += item.planned;
		entry.paid += item.spent;
		entry.pending += item.pending;
		entry.count += 1;
	}
	for (const supplier of committedSuppliers(suppliers)) {
		const entry = upsert(supplier.category);
		entry.planned += supplier.price;
		entry.paid += supplier.paid;
		entry.pending += supplier.pending;
		entry.count += 1;
	}

	return [...map.values()].map(withRatio).sort((a, b) => b.planned - a.planned);
}

/** Inventory against suppliers, the split the overview leads with. */
export function buildSourceBreakdown(
	lines: BudgetLine[],
): BudgetBreakdownEntry[] {
	const map = new Map<BudgetSource, BudgetBreakdownEntry>();

	for (const line of lines) {
		const entry =
			map.get(line.source) ??
			(map
				.set(
					line.source,
					emptyEntry(
						line.source,
						line.source === "INVENTORY" ? "Inventário" : "Fornecedores",
					),
				)
				.get(line.source) as BudgetBreakdownEntry);
		entry.planned += line.planned;
		entry.paid += line.paid;
		entry.pending += line.pending;
		entry.count += 1;
		map.set(line.source, entry);
	}

	return [...map.values()].map(withRatio);
}

export function buildPaymentStatusBreakdown(
	suppliers: SupplierWithMoney[],
): BudgetBreakdownEntry[] {
	const map = new Map<string, BudgetBreakdownEntry>();

	for (const supplier of committedSuppliers(suppliers)) {
		const entry =
			map.get(supplier.paymentStatus) ??
			emptyEntry(
				supplier.paymentStatus,
				PAYMENT_STATUS_LABELS[supplier.paymentStatus] ?? supplier.paymentStatus,
			);
		entry.planned += supplier.price;
		entry.paid += supplier.paid;
		entry.pending += supplier.pending;
		entry.count += 1;
		map.set(supplier.paymentStatus, entry);
	}

	return [...map.values()].map(withRatio);
}

/** The suppliers that most need attention, biggest outstanding amount first. */
export function buildTopPendingSuppliers(
	suppliers: SupplierWithMoney[],
	limit = 5,
): BudgetAnalytics["topPendingSuppliers"] {
	return [...suppliers]
		.filter((s) => s.pending > 0)
		.sort((a, b) => b.pending - a.pending)
		.slice(0, limit)
		.map((s) => ({
			id: s.id,
			name: s.name,
			category: s.category,
			planned: s.price,
			pending: s.pending,
			paymentStatus: s.paymentStatus,
			nextDueDate: s.nextDueDate,
		}));
}

/**
 * Only the installments that are genuinely late count towards overdue, using
 * the single overdue definition from the finance module.
 */
export function resolveOverdueSuppliers(
	rows: OverdueSupplierInput[],
	now: Date,
): BudgetAnalytics["overdueSuppliers"] {
	return rows.map((supplier) => {
		const late = supplier.installments.filter((i) =>
			isOverdue(i.dueDate, false, now),
		);
		return {
			id: supplier.id,
			name: supplier.name,
			overdueAmount: late.reduce((sum, i) => sum + i.amount, 0),
			nextDueDate: supplier.installments[0]?.dueDate ?? null,
		};
	});
}

/** Cash out per calendar month, taken from the recorded payment dates. */
export function buildMonthlySpend(
	payments: Array<{ amount: number; paymentDate: Date }>,
): Array<{ month: string; amount: number }> {
	const map = new Map<string, number>();
	for (const payment of payments) {
		const key = monthKey(payment.paymentDate);
		map.set(key, (map.get(key) ?? 0) + payment.amount);
	}
	return [...map.entries()]
		.map(([month, amount]) => ({ month, amount }))
		.sort((a, b) => a.month.localeCompare(b.month));
}
