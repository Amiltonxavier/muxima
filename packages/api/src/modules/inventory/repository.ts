import db from "@muxima/db";
import type {
	InventoryCategory,
	MovementType,
	Prisma,
} from "@muxima/db/prisma";

export type InventoryFilterParams = {
	search?: string;
	category?: InventoryCategory;
	vendorId?: string;
};

function buildInventoryWhere(
	eventId: string,
	filters?: InventoryFilterParams,
): Prisma.InventoryItemWhereInput {
	const conditions: Prisma.InventoryItemWhereInput[] = [{ eventId }];

	if (filters?.search) {
		conditions.push({
			OR: [
				{ name: { contains: filters.search, mode: "insensitive" } },
				{ notes: { contains: filters.search, mode: "insensitive" } },
			],
		});
	}
	if (filters?.category) {
		conditions.push({ category: filters.category });
	}
	if (filters?.vendorId) {
		conditions.push({ vendorId: filters.vendorId });
	}

	return { AND: conditions };
}

export const InventoryRepository = {
	findByEventId(
		eventId: string,
		pagination: { page: number; limit: number },
		filters?: InventoryFilterParams,
	) {
		const skip = (pagination.page - 1) * pagination.limit;
		return db.inventoryItem.findMany({
			where: buildInventoryWhere(eventId, filters),
			include: { vendor: true, movements: true },
			orderBy: { createdAt: "desc" },
			skip,
			take: pagination.limit,
		});
	},

	countByEventId(eventId: string, filters?: InventoryFilterParams) {
		return db.inventoryItem.count({
			where: buildInventoryWhere(eventId, filters),
		});
	},

	findById(id: string) {
		return db.inventoryItem.findUnique({
			where: { id },
			include: { vendor: true, movements: true },
		});
	},

	create(data: {
		eventId: string;
		name: string;
		category: InventoryCategory;
		plannedQuantity: number;
		currentQuantity?: number;
		unit:
			| "UNIT"
			| "BOX"
			| "CASE"
			| "BOTTLE"
			| "KG"
			| "LITER"
			| "PACKAGE"
			| "OTHER";
		unitPrice?: number;
		vendorId?: string;
		notes?: string;
	}) {
		return db.inventoryItem.create({ data });
	},

	update(
		id: string,
		data: Partial<{
			name: string;
			category: "DRINK" | "FOOD" | "CAKE" | "DECORATION" | "OTHER";
			plannedQuantity: number;
			currentQuantity: number;
			unit:
				| "UNIT"
				| "BOX"
				| "CASE"
				| "BOTTLE"
				| "KG"
				| "LITER"
				| "PACKAGE"
				| "OTHER";
			unitPrice: number;
			vendorId: string;
			notes: string;
		}>,
	) {
		return db.inventoryItem.update({ where: { id }, data });
	},

	delete(id: string) {
		return db.inventoryItem.delete({ where: { id } });
	},

	addMovement(data: {
		inventoryItemId: string;
		type: MovementType;
		quantity: number;
		reason?: string;
		createdBy: string;
	}) {
		return db.inventoryMovement.create({ data });
	},
};
