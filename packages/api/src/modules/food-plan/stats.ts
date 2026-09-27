import db from "@muxima/db";

/**
 * Food plan statistics.
 *
 * Kept out of the router on purpose: the checklist summary needs the same
 * numbers, and importing a router from a router would create a cycle through
 * the app router index.
 */

export type FoodPlanCategoryBreakdown = {
	key: string;
	label: string;
	count: number;
	totalQuantity: number;
	completed: number;
};

export type FoodPlanStats = {
	totalItems: number;
	completedItems: number;
	inProgressItems: number;
	pendingItems: number;
	completionPercentage: number;
	totalQuantity: number;
	byCategory: FoodPlanCategoryBreakdown[];
	hasSupplier: boolean;
	supplierId: string | null;
	supplierName: string | null;
};

const CATEGORY_LABELS: Record<string, string> = {
	STARTER: "Entradas",
	MAIN_COURSE: "Pratos principais",
	SIDE_DISH: "Acompanhamentos",
	DESSERT: "Sobremesas",
	FRUIT: "Frutas",
	OTHER: "Outros",
};

export async function getFoodPlanStats(
	eventId: string,
): Promise<FoodPlanStats> {
	const plan = await db.foodPlan.findUnique({
		where: { eventId },
		include: {
			supplier: { select: { id: true, name: true } },
			items: true,
		},
	});

	const items = plan?.items ?? [];
	const byCategory = new Map<string, FoodPlanCategoryBreakdown>();

	let totalQuantity = 0;
	let completedItems = 0;

	for (const item of items) {
		const quantity = Number(item.quantity);
		totalQuantity += quantity;
		if (item.status === "COMPLETED") completedItems += 1;

		const entry = byCategory.get(item.category) ?? {
			key: item.category,
			label: CATEGORY_LABELS[item.category] ?? item.category,
			count: 0,
			totalQuantity: 0,
			completed: 0,
		};
		entry.count += 1;
		entry.totalQuantity += quantity;
		if (item.status === "COMPLETED") entry.completed += 1;
		byCategory.set(item.category, entry);
	}

	return {
		totalItems: items.length,
		completedItems,
		inProgressItems: items.filter((i) => i.status === "IN_PROGRESS").length,
		pendingItems: items.filter((i) => i.status === "PENDING").length,
		completionPercentage:
			items.length === 0
				? 0
				: Math.round((completedItems / items.length) * 100),
		totalQuantity,
		byCategory: [...byCategory.values()].sort((a, b) =>
			a.label.localeCompare(b.label, "pt-PT"),
		),
		hasSupplier: Boolean(plan?.supplierId),
		supplierId: plan?.supplierId ?? null,
		supplierName: plan?.supplier?.name ?? null,
	};
}
