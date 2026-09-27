import type { Prisma, PrismaClient } from "@muxima/db/prisma";
import type {
	InventoryCategory,
	InventoryStatus,
	InventoryUnit,
	MovementType,
} from "../../shared/types/entities";
import { toJsonInput } from "../../shared/utils/json";

/**
 * Every function accepts the db client so the same data access works both
 * against the global client and inside `db.$transaction`.
 */
export type InventoryDb = PrismaClient | Prisma.TransactionClient;

export type InventoryFilterParams = {
	search?: string;
	category?: InventoryCategory;
	status?: InventoryStatus;
};

export function buildInventoryWhere(
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
	if (filters?.status) {
		conditions.push({ status: filters.status });
	}

	return { AND: conditions };
}

export const InventoryRepository = {
	findMany(
		db: InventoryDb,
		eventId: string,
		pagination: { page: number; limit: number },
		filters?: InventoryFilterParams,
	) {
		const skip = (pagination.page - 1) * pagination.limit;
		return db.inventoryItem.findMany({
			where: buildInventoryWhere(eventId, filters),
			orderBy: { createdAt: "desc" },
			skip,
			take: pagination.limit,
		});
	},

	count(db: InventoryDb, eventId: string, filters?: InventoryFilterParams) {
		return db.inventoryItem.count({
			where: buildInventoryWhere(eventId, filters),
		});
	},

	findById(db: InventoryDb, id: string) {
		return db.inventoryItem.findUnique({ where: { id } });
	},

	findMetricsRows(db: InventoryDb, eventId: string) {
		return db.inventoryItem.findMany({
			where: { eventId },
			select: {
				status: true,
				plannedQuantity: true,
				currentQuantity: true,
				unitPrice: true,
			},
		});
	},

	create(
		db: InventoryDb,
		data: {
			eventId: string;
			name: string;
			category: InventoryCategory;
			plannedQuantity: number;
			currentQuantity: number;
			status: InventoryStatus;
			unit: InventoryUnit;
			unitPrice?: number;
			notes?: string;
			customFields?: Record<string, unknown>;
		},
	) {
		return db.inventoryItem.create({
			data: { ...data, customFields: toJsonInput(data.customFields) },
		});
	},

	update(
		db: InventoryDb,
		id: string,
		data: Partial<{
			name: string;
			category: InventoryCategory;
			plannedQuantity: number;
			status: InventoryStatus;
			unit: InventoryUnit;
			unitPrice: number;
			notes: string;
			customFields: Record<string, unknown>;
		}>,
	) {
		return db.inventoryItem.update({
			where: { id },
			data: { ...data, customFields: toJsonInput(data.customFields) },
		});
	},

	delete(db: InventoryDb, id: string) {
		return db.inventoryItem.delete({ where: { id } });
	},

	createMovement(
		db: InventoryDb,
		data: {
			inventoryItemId: string;
			type: MovementType;
			quantity: number;
			unitPrice?: number;
			totalCost?: number;
			reason?: string;
			createdBy: string;
		},
	) {
		return db.inventoryMovement.create({
			data,
			include: {
				creator: { select: { id: true, name: true, email: true } },
			},
		});
	},

	updateQuantity(
		db: InventoryDb,
		id: string,
		data: { currentQuantity: number; status: InventoryStatus },
	) {
		return db.inventoryItem.update({ where: { id }, data });
	},

	findMovements(db: InventoryDb, inventoryItemId: string) {
		return db.inventoryMovement.findMany({
			where: { inventoryItemId },
			include: {
				creator: { select: { id: true, name: true, email: true } },
			},
			orderBy: { createdAt: "desc" },
		});
	},
};
