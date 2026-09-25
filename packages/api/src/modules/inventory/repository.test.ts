import { describe, expect, it, vi } from "vitest";

import {
	buildInventoryWhere,
	type InventoryDb,
	InventoryRepository,
} from "./repository";

describe("buildInventoryWhere", () => {
	it("always scopes by eventId", () => {
		expect(buildInventoryWhere("evt_1")).toEqual({
			AND: [{ eventId: "evt_1" }],
		});
	});

	it("adds a case-insensitive search over name and notes", () => {
		const where = buildInventoryWhere("evt_1", { search: "vinho" });

		expect(where.AND).toContainEqual({
			OR: [
				{ name: { contains: "vinho", mode: "insensitive" } },
				{ notes: { contains: "vinho", mode: "insensitive" } },
			],
		});
	});

	it("combines category, status and vendorId filters", () => {
		const where = buildInventoryWhere("evt_1", {
			category: "DRINK",
			status: "PENDING",
			vendorId: "vnd_1",
		});

		expect(where.AND).toEqual([
			{ eventId: "evt_1" },
			{ category: "DRINK" },
			{ status: "PENDING" },
			{ vendorId: "vnd_1" },
		]);
	});

	it("ignores empty filters", () => {
		expect(buildInventoryWhere("evt_1", {})).toEqual({
			AND: [{ eventId: "evt_1" }],
		});
	});
});

describe("InventoryRepository.findMany", () => {
	it("applies skip/take from page and limit", async () => {
		const findMany = vi.fn(async () => []);
		const db = {
			inventoryItem: { findMany },
		} as unknown as InventoryDb;

		await InventoryRepository.findMany(db, "evt_1", { page: 3, limit: 10 });

		expect(findMany).toHaveBeenCalledWith(
			expect.objectContaining({ skip: 20, take: 10 }),
		);
	});

	it("uses page 1 as offset zero", async () => {
		const findMany = vi.fn(async () => []);
		const db = {
			inventoryItem: { findMany },
		} as unknown as InventoryDb;

		await InventoryRepository.findMany(db, "evt_1", { page: 1, limit: 20 });

		expect(findMany).toHaveBeenCalledWith(
			expect.objectContaining({ skip: 0, take: 20 }),
		);
	});
});

describe("InventoryRepository.findMetricsRows", () => {
	it("selects only the columns needed by the stats calculation", async () => {
		const findMany = vi.fn(async () => []);
		const db = {
			inventoryItem: { findMany },
		} as unknown as InventoryDb;

		await InventoryRepository.findMetricsRows(db, "evt_1");

		expect(findMany).toHaveBeenCalledWith({
			where: { eventId: "evt_1" },
			select: {
				status: true,
				plannedQuantity: true,
				currentQuantity: true,
				venueQuantity: true,
				unitPrice: true,
			},
		});
	});
});
