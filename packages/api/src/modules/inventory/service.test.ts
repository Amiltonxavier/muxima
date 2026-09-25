import { describe, expect, it, vi } from "vitest";

import { type InventoryDb, InventoryRepository } from "./repository";
import {
	computeCompletionPercentage,
	computeMovementCost,
	computeStatus,
	InventoryService,
} from "./service";

type FakeItem = {
	id: string;
	eventId: string;
	name: string;
	category: "DRINK" | "FOOD" | "CAKE" | "DECORATION" | "OTHER";
	unit:
		| "UNIT"
		| "BOX"
		| "CASE"
		| "BOTTLE"
		| "KG"
		| "LITER"
		| "PACKAGE"
		| "OTHER";
	status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
	plannedQuantity: number;
	currentQuantity: number;
	venueQuantity: number;
	unitPrice: number | null;
	vendorId: string | null;
	notes: string | null;
	createdAt: Date;
	updatedAt: Date;
	vendor: null;
};

type FakeMovement = {
	id: string;
	inventoryItemId: string;
	type: string;
	quantity: number;
	unitPrice: number | null;
	totalCost: number | null;
	reason: string | null;
	createdBy: string;
	createdAt: Date;
	creator: { id: string; name: string; email: string };
};

function makeItem(overrides: Partial<FakeItem> & { id: string }): FakeItem {
	return {
		eventId: "evt_1",
		name: "Cadeiras",
		category: "OTHER",
		unit: "UNIT",
		status: "PENDING",
		plannedQuantity: 10,
		currentQuantity: 0,
		venueQuantity: 0,
		unitPrice: null,
		vendorId: null,
		notes: null,
		createdAt: new Date("2026-01-01"),
		updatedAt: new Date("2026-01-01"),
		vendor: null,
		...overrides,
	};
}

function createFakeDb(initialItems: FakeItem[]) {
	const items: FakeItem[] = initialItems.map((item) => ({ ...item }));
	const movements: FakeMovement[] = [];
	const seq = 1;

	const db = {
		inventoryItem: {
			findMany: vi.fn(async () => items.map((item) => ({ ...item }))),
			count: vi.fn(async () => items.length),
			findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
				const item = items.find((candidate) => candidate.id === where.id);
				return item ? { ...item } : null;
			}),
			create: vi.fn(async ({ data }: { data: Partial<FakeItem> }) => {
				const created = makeItem({
					...data,
					id: `inv_${seq}`,
				} as Partial<FakeItem> & { id: string });
				items.push(created);
				return { ...created };
			}),
			update: vi.fn(
				async ({
					where,
					data,
				}: {
					where: { id: string };
					data: Partial<FakeItem>;
				}) => {
					const index = items.findIndex(
						(candidate) => candidate.id === where.id,
					);
					if (index === -1) throw new Error("Item não encontrado");
					const existing = items[index];
					if (!existing) throw new Error("Item não encontrado");
					const updated = { ...existing, ...data };
					items[index] = updated;
					return updated;
				},
			),
			delete: vi.fn(async ({ where }: { where: { id: string } }) => {
				const index = items.findIndex((candidate) => candidate.id === where.id);
				if (index === -1) throw new Error("Item não encontrado");
				const [removed] = items.splice(index, 1);
				return removed;
			}),
		},
		inventoryMovement: {
			count: vi.fn(
				async ({ where }: { where: { inventoryItem: { eventId: string } } }) =>
					movements.filter((movement) =>
						items.some(
							(item) =>
								item.id === movement.inventoryItemId &&
								item.eventId === where.inventoryItem.eventId,
						),
					).length,
			),
			create: vi.fn(
				async ({
					data,
					include,
				}: {
					data: Omit<FakeMovement, "id" | "createdAt" | "creator">;
					include?: { creator: { select: { id: true } } };
				}) => {
					const created: FakeMovement = {
						...data,
						id: `mov_${seq}`,
						createdAt: new Date(),
						creator: {
							id: data.createdBy,
							name: "Amílton",
							email: "amilton@muxima.ao",
						},
					};
					movements.push(created);
					void include;
					return { ...created };
				},
			),
			findMany: vi.fn(
				async ({ where }: { where: { inventoryItemId: string } }) =>
					movements
						.filter(
							(movement) => movement.inventoryItemId === where.inventoryItemId,
						)
						.map((movement) => ({ ...movement })),
			),
		},
	};

	return {
		fake: db as unknown as InventoryDb,
		store: { items, movements },
	};
}

describe("computeStatus", () => {
	it("is COMPLETED when current reaches planned", () => {
		expect(computeStatus(10, 10)).toBe("COMPLETED");
	});

	it("is PENDING when there is no current quantity", () => {
		expect(computeStatus(10, 0)).toBe("PENDING");
	});

	it("is IN_PROGRESS when partially fulfilled", () => {
		expect(computeStatus(10, 6)).toBe("IN_PROGRESS");
	});
});

describe("computeCompletionPercentage", () => {
	it("never exceeds 100%", () => {
		expect(computeCompletionPercentage(10, 12)).toBe(100);
	});

	it("returns 0 when nothing is planned", () => {
		expect(computeCompletionPercentage(0, 0)).toBe(0);
	});
});

describe("computeMovementCost", () => {
	it("calculates quantity × unit price", () => {
		expect(computeMovementCost(2, 10_000)).toBe(20_000);
	});

	it("returns undefined when there is no price", () => {
		expect(computeMovementCost(2)).toBeUndefined();
	});
});

describe("InventoryService.create", () => {
	it("creates the item with computed status and initial movement", async () => {
		const { fake, store } = createFakeDb([]);

		const item = await InventoryService.create(fake, "evt_1", "usr_1", {
			name: "Cadeiras",
			category: "OTHER",
			unit: "UNIT",
			plannedQuantity: 10,
			currentQuantity: 4,
			venueQuantity: 8,
			unitPrice: 1_000,
		});

		expect(item.status).toBe("IN_PROGRESS");
		expect(item.currentQuantity).toBe(4);
		expect(item.totalValue).toBe(10_000);
		expect(item.completedValue).toBe(4_000);
		expect(store.movements).toHaveLength(1);
		expect(store.movements[0]?.quantity).toBe(4);
		expect(store.movements[0]?.totalCost).toBe(4_000);
	});

	it("rejects venue quantity above planned quantity", async () => {
		const { fake, store } = createFakeDb([]);

		await expect(
			InventoryService.create(fake, "evt_1", "usr_1", {
				name: "Cadeiras",
				category: "OTHER",
				unit: "UNIT",
				plannedQuantity: 10,
				currentQuantity: 0,
				venueQuantity: 20,
				unitPrice: undefined,
			}),
		).rejects.toThrow(
			"A quantidade destinada ao salão não pode superar a quantidade planeada",
		);
		expect(store.items).toHaveLength(0);
	});
});

describe("InventoryService.addMovement", () => {
	it("adds quantity within the planned limit and computes the cost", async () => {
		const { fake, store } = createFakeDb([
			makeItem({ id: "inv_1", plannedQuantity: 10, currentQuantity: 0 }),
		]);

		const movement = await InventoryService.addMovement(
			fake,
			"inv_1",
			"usr_1",
			{
				type: "ADD",
				quantity: 2,
				unitPrice: 10_000,
				reason: "Primeira entrada",
			},
		);

		expect(movement.quantity).toBe(2);
		expect(movement.unitPrice).toBe(10_000);
		expect(movement.totalCost).toBe(20_000);
		expect(movement.creator?.name).toBe("Amílton");
		expect(store.items[0]?.currentQuantity).toBe(2);
		expect(store.items[0]?.status).toBe("IN_PROGRESS");
	});

	it("allows filling exactly the remaining quantity", async () => {
		const { fake, store } = createFakeDb([
			makeItem({ id: "inv_1", plannedQuantity: 10, currentQuantity: 8 }),
		]);

		await InventoryService.addMovement(fake, "inv_1", "usr_1", {
			type: "ADD",
			quantity: 2,
		});

		expect(store.items[0]?.currentQuantity).toBe(10);
		expect(store.items[0]?.status).toBe("COMPLETED");
	});

	it("rejects adding more than the remaining quantity", async () => {
		const { fake, store } = createFakeDb([
			makeItem({ id: "inv_1", plannedQuantity: 10, currentQuantity: 8 }),
		]);

		await expect(
			InventoryService.addMovement(fake, "inv_1", "usr_1", {
				type: "ADD",
				quantity: 3,
			}),
		).rejects.toThrow(
			"Não é possível adicionar 3 unidades. Apenas 2 unidades restam para completar a quantidade planeada.",
		);
		expect(store.items[0]?.currentQuantity).toBe(8);
		expect(store.movements).toHaveLength(0);
	});

	it("rejects any addition when the planned quantity is fulfilled", async () => {
		const { fake, store } = createFakeDb([
			makeItem({
				id: "inv_1",
				plannedQuantity: 10,
				currentQuantity: 10,
				status: "COMPLETED",
			}),
		]);

		await expect(
			InventoryService.addMovement(fake, "inv_1", "usr_1", {
				type: "ADD",
				quantity: 1,
			}),
		).rejects.toThrow("Apenas 0 unidades restam");
		expect(store.movements).toHaveLength(0);
	});

	it("clamps decreases at zero", async () => {
		const { fake, store } = createFakeDb([
			makeItem({ id: "inv_1", plannedQuantity: 10, currentQuantity: 3 }),
		]);

		await InventoryService.addMovement(fake, "inv_1", "usr_1", {
			type: "LOSS",
			quantity: 5,
		});

		expect(store.items[0]?.currentQuantity).toBe(0);
		expect(store.items[0]?.status).toBe("PENDING");
	});

	it("rejects adjustments above the planned quantity", async () => {
		const { fake } = createFakeDb([
			makeItem({ id: "inv_1", plannedQuantity: 10, currentQuantity: 5 }),
		]);

		await expect(
			InventoryService.addMovement(fake, "inv_1", "usr_1", {
				type: "ADJUSTMENT",
				quantity: 12,
			}),
		).rejects.toThrow(
			"A quantidade ajustada não pode superar a quantidade planeada",
		);
	});

	it("preserves the historical price of each entry", async () => {
		const { fake, store } = createFakeDb([
			makeItem({ id: "inv_1", plannedQuantity: 10, currentQuantity: 0 }),
		]);

		await InventoryService.addMovement(fake, "inv_1", "usr_1", {
			type: "ADD",
			quantity: 2,
			unitPrice: 10_000,
		});
		await InventoryService.addMovement(fake, "inv_1", "usr_1", {
			type: "ADD",
			quantity: 3,
			unitPrice: 12_000,
		});

		expect(store.movements.map((movement) => movement.unitPrice)).toEqual([
			10_000, 12_000,
		]);
		expect(store.movements.map((movement) => movement.totalCost)).toEqual([
			20_000, 36_000,
		]);
		expect(store.items[0]?.currentQuantity).toBe(5);
	});
});

describe("InventoryService.update", () => {
	it("rejects lowering planned below current quantity", async () => {
		const { fake } = createFakeDb([
			makeItem({ id: "inv_1", plannedQuantity: 10, currentQuantity: 8 }),
		]);

		await expect(
			InventoryService.update(fake, "inv_1", { plannedQuantity: 5 }),
		).rejects.toThrow(
			"A quantidade planeada não pode ser inferior à quantidade actual",
		);
	});

	it("rejects venue quantity above the new planned quantity", async () => {
		const { fake } = createFakeDb([
			makeItem({ id: "inv_1", plannedQuantity: 10, venueQuantity: 10 }),
		]);

		await expect(
			InventoryService.update(fake, "inv_1", { plannedQuantity: 4 }),
		).rejects.toThrow(
			"A quantidade destinada ao salão não pode superar a quantidade planeada",
		);
	});

	it("recomputes the status after updating the planned quantity", async () => {
		const { fake } = createFakeDb([
			makeItem({ id: "inv_1", plannedQuantity: 10, currentQuantity: 6 }),
		]);

		const updated = await InventoryService.update(fake, "inv_1", {
			plannedQuantity: 6,
			venueQuantity: 6,
		});

		expect(updated.status).toBe("COMPLETED");
		expect(updated.remainingQuantity).toBe(0);
		expect(updated.completionPercentage).toBe(100);
	});
});

describe("InventoryService.list", () => {
	it("returns an empty page when there are no items", async () => {
		const { fake } = createFakeDb([]);

		const result = await InventoryService.list(fake, "evt_1", {
			page: 1,
			limit: 20,
		});

		expect(result.data).toEqual([]);
		expect(result.total).toBe(0);
	});

	it("returns mapped items with pagination meta inputs", async () => {
		const { fake } = createFakeDb([
			makeItem({ id: "inv_1", name: "Vinho Tinto", plannedQuantity: 10 }),
			makeItem({ id: "inv_2", name: "Champanhe", plannedQuantity: 5 }),
		]);

		const result = await InventoryService.list(fake, "evt_1", {
			page: 1,
			limit: 1,
		});

		// repository applies skip/take; the fake returns the store as-is,
		// but the service must map DTO fields for whatever it receives.
		expect(result.total).toBe(2);
		expect(result.data[0]).toMatchObject({
			id: "inv_1",
			name: "Vinho Tinto",
			status: "PENDING",
		});
		expect(result.data[0]).toHaveProperty("completionPercentage");
		expect(result.data[0]).toHaveProperty("remainingQuantity");
	});

	it("forwards filters to the repository", async () => {
		const findMany = vi
			.spyOn(InventoryRepository, "findMany")
			.mockResolvedValue([]);
		const count = vi.spyOn(InventoryRepository, "count").mockResolvedValue(0);
		const fake = {} as InventoryDb;

		await InventoryService.list(
			fake,
			"evt_1",
			{ page: 2, limit: 10 },
			{ search: "vinho", category: "DRINK", status: "PENDING" },
		);

		expect(findMany).toHaveBeenCalledWith(
			fake,
			"evt_1",
			{ page: 2, limit: 10 },
			{ search: "vinho", category: "DRINK", status: "PENDING" },
		);
		expect(count).toHaveBeenCalledWith(fake, "evt_1", {
			search: "vinho",
			category: "DRINK",
			status: "PENDING",
		});

		findMany.mockRestore();
		count.mockRestore();
	});
});

describe("InventoryService.getStats", () => {
	it("aggregates quantities, values and progress on the backend", async () => {
		const { fake } = createFakeDb([
			makeItem({
				id: "inv_1",
				plannedQuantity: 10,
				currentQuantity: 10,
				venueQuantity: 10,
				status: "COMPLETED",
				unitPrice: 100,
			}),
			makeItem({
				id: "inv_2",
				plannedQuantity: 20,
				currentQuantity: 5,
				venueQuantity: 8,
				status: "IN_PROGRESS",
				unitPrice: 50,
			}),
			makeItem({
				id: "inv_3",
				plannedQuantity: 5,
				currentQuantity: 0,
				venueQuantity: 5,
				status: "PENDING",
				unitPrice: null,
			}),
		]);

		const stats = await InventoryService.getStats(fake, "evt_1");

		expect(stats).toEqual({
			totalItems: 3,
			totalQuantity: 35,
			totalCurrent: 15,
			totalVenue: 23,
			totalRemaining: 20,
			completionPercentage: 43,
			totalValue: 2_000,
			completedValue: 1_250,
			pendingValue: 750,
			completedItems: 1,
			inProgressItems: 1,
			pendingItems: 1,
			lowStockItems: 1,
			outOfStockItems: 1,
			movementCount: 0,
		});
	});

	it("returns zeroed stats when there are no items", async () => {
		const { fake } = createFakeDb([]);

		const stats = await InventoryService.getStats(fake, "evt_1");

		expect(stats.totalItems).toBe(0);
		expect(stats.completionPercentage).toBe(0);
		expect(stats.totalValue).toBe(0);
	});
});

describe("InventoryService.getHistory", () => {
	it("returns the summary and totals calculated by the backend", async () => {
		const { fake, store } = createFakeDb([
			makeItem({
				id: "inv_1",
				plannedQuantity: 10,
				currentQuantity: 6,
				unitPrice: 10_000,
				status: "IN_PROGRESS",
			}),
		]);
		store.movements.push(
			{
				id: "mov_1",
				inventoryItemId: "inv_1",
				type: "ADD",
				quantity: 2,
				unitPrice: 10_000,
				totalCost: 20_000,
				reason: null,
				createdBy: "usr_1",
				createdAt: new Date("2026-09-23"),
				creator: { id: "usr_1", name: "Amílton", email: "a@muxima.ao" },
			},
			{
				id: "mov_2",
				inventoryItemId: "inv_1",
				type: "ADD",
				quantity: 4,
				unitPrice: 12_000,
				totalCost: 48_000,
				reason: null,
				createdBy: "usr_1",
				createdAt: new Date("2026-09-24"),
				creator: { id: "usr_1", name: "João", email: "j@muxima.ao" },
			},
		);

		const history = await InventoryService.getHistory(fake, "inv_1");

		expect(history.item.plannedQuantity).toBe(10);
		expect(history.item.currentQuantity).toBe(6);
		expect(history.item.remainingQuantity).toBe(4);
		expect(history.item.completionPercentage).toBe(60);
		expect(history.movements).toHaveLength(2);
		expect(history.movements[0]?.creator?.name).toBe("Amílton");
		expect(history.totals).toEqual({
			movementsCount: 2,
			totalEntered: 6,
			totalCost: 68_000,
		});
	});
});
