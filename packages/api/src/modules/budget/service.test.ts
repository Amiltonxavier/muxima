import type { PrismaClient } from "@muxima/db/prisma";
import { describe, expect, it, vi } from "vitest";

// The tested functions receive the db client as an argument, so the real
// client (and its environment bootstrap) is never needed here.
vi.mock("@muxima/db", () => ({ default: {} }));

import {
	createExpenseWithInventory,
	updateExpenseWithInventory,
} from "./service";

type FakeItem = {
	id: string;
	eventId: string;
	name: string;
	category: string;
	unit: string;
	status: string;
	plannedQuantity: number;
	currentQuantity: number;
	venueQuantity: number;
	unitPrice: number | null;
	vendorId: string | null;
	notes: string | null;
	createdAt: Date;
	updatedAt: Date;
};

type FakeExpense = {
	id: string;
	eventId: string;
	description: string;
	type: string;
	totalAmount: number;
	budgetCategoryId: string | null;
	vendorId: string | null;
	inventoryItemId: string | null;
	status: string;
	paidPercentage: number;
	dueDate: Date | null;
	notes: string | null;
	createdBy: string;
	createdAt: Date;
	updatedAt: Date;
};

function makeExpense(
	overrides: Partial<FakeExpense> & { id: string; eventId: string },
): FakeExpense {
	return {
		description: "Compra de vinho",
		type: "EXPENSE",
		totalAmount: 100_000,
		budgetCategoryId: null,
		vendorId: null,
		inventoryItemId: null,
		status: "PLANNED",
		paidPercentage: 0,
		dueDate: null,
		notes: null,
		createdBy: "usr_1",
		createdAt: new Date("2026-01-01"),
		updatedAt: new Date("2026-01-01"),
		...overrides,
	};
}

function makeItem(overrides: Partial<FakeItem> & { id: string }): FakeItem {
	return {
		eventId: "evt_1",
		name: "Vinho",
		category: "DRINK",
		unit: "BOTTLE",
		status: "PENDING",
		plannedQuantity: 10,
		currentQuantity: 0,
		venueQuantity: 0,
		unitPrice: null,
		vendorId: null,
		notes: null,
		createdAt: new Date("2026-01-01"),
		updatedAt: new Date("2026-01-01"),
		...overrides,
	};
}

/**
 * Fake Prisma client with a `$transaction` that snapshots the stores and
 * restores them on failure, emulating ROLLBACK semantics.
 */
function createFakeClient(options?: { failExpenseCreate?: boolean }) {
	const items: FakeItem[] = [];
	const expenses: FakeExpense[] = [];
	const movements: Array<{ id: string; inventoryItemId: string }> = [];
	const seq = 1;

	const client = {
		inventoryItem: {
			create: vi.fn(async ({ data }: { data: Partial<FakeItem> }) => {
				const created = makeItem({
					...data,
					id: `inv_${seq}`,
				} as Partial<FakeItem> & { id: string });
				items.push(created);
				return { ...created };
			}),
			findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
				const item = items.find((candidate) => candidate.id === where.id);
				return item ? { ...item, vendor: null } : null;
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
		},
		inventoryMovement: {
			create: vi.fn(async ({ data }: { data: { id?: string } }) => {
				const created = { id: `mov_${seq}`, ...data };
				movements.push(created as { id: string; inventoryItemId: string });
				return created;
			}),
		},
		expense: {
			create: vi.fn(async ({ data }: { data: Partial<FakeExpense> }) => {
				if (options?.failExpenseCreate) {
					throw new Error("DB failure");
				}
				const created = makeExpense({
					...data,
					id: `exp_${seq}`,
					eventId: data.eventId ?? "evt_1",
				} as Partial<FakeExpense> & { id: string; eventId: string });
				expenses.push(created);
				return { ...created };
			}),
			findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
				const expense = expenses.find((candidate) => candidate.id === where.id);
				return expense ? { ...expense } : null;
			}),
			update: vi.fn(
				async ({
					where,
					data,
				}: {
					where: { id: string };
					data: Partial<FakeExpense>;
				}) => {
					const index = expenses.findIndex(
						(candidate) => candidate.id === where.id,
					);
					if (index === -1) throw new Error("Despesa não encontrada");
					const existing = expenses[index];
					if (!existing) throw new Error("Despesa não encontrada");
					const updated = { ...existing, ...data };
					expenses[index] = updated;
					return updated;
				},
			),
		},
		$transaction: vi.fn(
			async (fn: (tx: typeof client) => Promise<unknown>): Promise<unknown> => {
				const itemsSnapshot = items.map((item) => ({ ...item }));
				const expensesSnapshot = expenses.map((expense) => ({ ...expense }));
				const movementsSnapshot = movements.map((movement) => ({
					...movement,
				}));
				try {
					return await fn(client);
				} catch (error) {
					items.splice(0, items.length, ...itemsSnapshot);
					expenses.splice(0, expenses.length, ...expensesSnapshot);
					movements.splice(0, movements.length, ...movementsSnapshot);
					throw error;
				}
			},
		),
	};

	return {
		client: client as unknown as PrismaClient,
		store: { items, expenses, movements },
	};
}

const inventoryPayload = {
	name: "Cadeiras",
	category: "OTHER" as const,
	unit: "UNIT" as const,
	plannedQuantity: 300,
	venueQuantity: 280,
	unitPrice: 10_000,
};

describe("createExpenseWithInventory", () => {
	it("creates a plain expense without touching inventory", async () => {
		const { client, store } = createFakeClient();

		const expense = await createExpenseWithInventory(client, "evt_1", "usr_1", {
			description: "Aluguer do salão",
			totalAmount: 500_000,
			isInventoryItem: false,
		});

		expect(expense.inventoryItemId).toBeNull();
		expect(store.items).toHaveLength(0);
		expect(store.expenses).toHaveLength(1);
	});

	it("creates the inventory item and links it to the expense", async () => {
		const { client, store } = createFakeClient();

		const expense = await createExpenseWithInventory(client, "evt_1", "usr_1", {
			description: "Compra de cadeiras",
			totalAmount: 3_000_000,
			paidPercentage: 50,
			isInventoryItem: true,
			inventory: inventoryPayload,
		});

		expect(store.items).toHaveLength(1);
		expect(store.items[0]?.name).toBe("Cadeiras");
		expect(store.items[0]?.plannedQuantity).toBe(300);
		expect(store.items[0]?.venueQuantity).toBe(280);
		expect(store.items[0]?.status).toBe("PENDING");
		expect(expense.inventoryItemId).toBe(store.items[0]?.id);
		expect(expense.status).toBe("PARTIALLY_PAID");
	});

	it("rolls back the inventory item when the expense fails", async () => {
		const { client, store } = createFakeClient({ failExpenseCreate: true });

		await expect(
			createExpenseWithInventory(client, "evt_1", "usr_1", {
				description: "Compra de cadeiras",
				totalAmount: 3_000_000,
				isInventoryItem: true,
				inventory: inventoryPayload,
			}),
		).rejects.toThrow("DB failure");

		// Nothing may remain partially persisted.
		expect(store.items).toHaveLength(0);
		expect(store.expenses).toHaveLength(0);
	});
});

describe("updateExpenseWithInventory", () => {
	it("creates and links an inventory item when toggled on", async () => {
		const { client, store } = createFakeClient();
		store.expenses.push(makeExpense({ id: "exp_1", eventId: "evt_1" }));

		const updated = await updateExpenseWithInventory(client, "usr_1", {
			id: "exp_1",
			isInventoryItem: true,
			inventory: inventoryPayload,
		});

		expect(store.items).toHaveLength(1);
		expect(updated.inventoryItemId).toBe(store.items[0]?.id);
	});

	it("updates the linked inventory item when edited together", async () => {
		const { client, store } = createFakeClient();
		store.items.push(
			makeItem({ id: "inv_1", name: "Cadeiras", plannedQuantity: 300 }),
		);
		store.expenses.push(
			makeExpense({
				id: "exp_1",
				eventId: "evt_1",
				inventoryItemId: "inv_1",
			}),
		);

		const updated = await updateExpenseWithInventory(client, "usr_1", {
			id: "exp_1",
			isInventoryItem: true,
			inventory: { ...inventoryPayload, plannedQuantity: 350 },
		});

		expect(store.items[0]?.plannedQuantity).toBe(350);
		expect(updated.inventoryItemId).toBe("inv_1");
	});

	it("detaches the relationship without deleting the inventory item", async () => {
		const { client, store } = createFakeClient();
		store.items.push(makeItem({ id: "inv_1" }));
		store.expenses.push(
			makeExpense({
				id: "exp_1",
				eventId: "evt_1",
				inventoryItemId: "inv_1",
			}),
		);

		const updated = await updateExpenseWithInventory(client, "usr_1", {
			id: "exp_1",
			isInventoryItem: false,
		});

		expect(updated.inventoryItemId).toBeNull();
		// The item and its history are preserved.
		expect(store.items).toHaveLength(1);
	});

	it("requires inventory data when toggled on without an existing link", async () => {
		const { client, store } = createFakeClient();
		store.expenses.push(makeExpense({ id: "exp_1", eventId: "evt_1" }));

		await expect(
			updateExpenseWithInventory(client, "usr_1", {
				id: "exp_1",
				isInventoryItem: true,
			}),
		).rejects.toThrow(
			"Dados de inventário obrigatórios para um item do inventário",
		);
		expect(store.items).toHaveLength(0);
	});
});
