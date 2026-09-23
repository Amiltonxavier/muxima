import { ForbiddenError, NotFoundError } from "../../shared/errors/app-error";
import type {
	InventoryCategory,
	InventoryHistory,
	InventoryListItem,
	InventoryMovementDto,
	InventoryStats,
	InventoryStatus,
	InventoryUnit,
	MovementType,
	UserSummary,
	Vendor,
} from "../../shared/types/entities";
import { type InventoryDb, InventoryRepository } from "./repository";
import type {
	AddMovementInput,
	CreateInventoryItemInput,
	UpdateInventoryItemInput,
} from "./schemas";

// ── Numeric helpers ──────────────────────────────────────────────
// Prisma returns Decimal; tests and internal math use plain numbers.
type Numeric = number | { toNumber(): number };

export function toNumber(value: Numeric | null | undefined): number {
	if (value === null || value === undefined) return 0;
	return typeof value === "number" ? value : value.toNumber();
}

function roundMoney(value: number): number {
	return Math.round(value * 100) / 100;
}

function roundPercent(value: number): number {
	return Math.round(value);
}

// ── Domain rules (backend is the authority) ─────────────────────

export function computeStatus(
	plannedQuantity: number,
	currentQuantity: number,
): InventoryStatus {
	if (currentQuantity >= plannedQuantity && plannedQuantity > 0) {
		return "COMPLETED";
	}
	if (currentQuantity <= 0) return "PENDING";
	return "IN_PROGRESS";
}

export function computeCompletionPercentage(
	plannedQuantity: number,
	currentQuantity: number,
): number {
	if (plannedQuantity <= 0) return 0;
	return Math.min(100, roundPercent((currentQuantity / plannedQuantity) * 100));
}

export function computeItemMetrics(
	plannedQuantity: number,
	currentQuantity: number,
) {
	const remainingQuantity = Math.max(0, plannedQuantity - currentQuantity);
	return {
		remainingQuantity,
		completionPercentage: computeCompletionPercentage(
			plannedQuantity,
			currentQuantity,
		),
	};
}

export function computeValues(
	plannedQuantity: number,
	currentQuantity: number,
	unitPrice: number | null,
) {
	const price = unitPrice ?? 0;
	const totalValue = roundMoney(plannedQuantity * price);
	const completedValue = roundMoney(currentQuantity * price);
	return {
		totalValue,
		completedValue,
		pendingValue: Math.max(0, roundMoney(totalValue - completedValue)),
	};
}

const INCREASE_TYPES: readonly MovementType[] = ["PURCHASE", "ADD", "RETURN"];
const DECREASE_TYPES: readonly MovementType[] = ["CONSUMPTION", "LOSS"];

export function isIncreaseType(type: MovementType): boolean {
	return INCREASE_TYPES.includes(type);
}

export function computeMovementCost(
	quantity: number,
	unitPrice?: number,
): number | undefined {
	if (unitPrice === undefined) return undefined;
	return roundMoney(quantity * unitPrice);
}

// ── DTO mapping ──────────────────────────────────────────────────

type PrismaItem = {
	id: string;
	eventId: string;
	name: string;
	category: InventoryCategory;
	unit: InventoryUnit;
	status: InventoryStatus;
	plannedQuantity: Numeric;
	currentQuantity: Numeric;
	venueQuantity: Numeric;
	unitPrice: Numeric | null;
	vendorId: string | null;
	vendor?: Vendor | null;
	notes: string | null;
	createdAt: Date;
	updatedAt: Date;
};

export function toListItem(item: PrismaItem): InventoryListItem {
	const plannedQuantity = toNumber(item.plannedQuantity);
	const currentQuantity = toNumber(item.currentQuantity);
	const venueQuantity = toNumber(item.venueQuantity);
	const unitPrice = item.unitPrice === null ? null : toNumber(item.unitPrice);
	const { remainingQuantity, completionPercentage } = computeItemMetrics(
		plannedQuantity,
		currentQuantity,
	);
	const { totalValue, completedValue, pendingValue } = computeValues(
		plannedQuantity,
		currentQuantity,
		unitPrice,
	);

	return {
		id: item.id,
		eventId: item.eventId,
		name: item.name,
		category: item.category,
		unit: item.unit,
		status: item.status,
		plannedQuantity,
		currentQuantity,
		venueQuantity,
		remainingQuantity,
		completionPercentage,
		unitPrice,
		totalValue,
		completedValue,
		pendingValue,
		vendorId: item.vendorId,
		vendor: item.vendor ?? null,
		notes: item.notes,
		createdAt: item.createdAt,
		updatedAt: item.updatedAt,
	};
}

type PrismaMovement = {
	id: string;
	inventoryItemId: string;
	type: MovementType;
	quantity: Numeric;
	unitPrice: Numeric | null;
	totalCost: Numeric | null;
	reason: string | null;
	createdBy: string;
	createdAt: Date;
	creator?: UserSummary | null;
};

export function toMovementDto(movement: PrismaMovement): InventoryMovementDto {
	return {
		id: movement.id,
		inventoryItemId: movement.inventoryItemId,
		type: movement.type,
		quantity: toNumber(movement.quantity),
		unitPrice:
			movement.unitPrice === null ? null : toNumber(movement.unitPrice),
		totalCost:
			movement.totalCost === null ? null : toNumber(movement.totalCost),
		reason: movement.reason,
		createdBy: movement.createdBy,
		createdAt: movement.createdAt,
		creator: movement.creator ?? null,
	};
}

// ── Service ──────────────────────────────────────────────────────

export type InventoryPagination = { page: number; limit: number };

export const InventoryService = {
	async list(
		db: InventoryDb,
		eventId: string,
		pagination: InventoryPagination,
		filters?: {
			search?: string;
			category?: InventoryCategory;
			status?: InventoryStatus;
			vendorId?: string;
		},
	): Promise<{ data: InventoryListItem[]; total: number }> {
		const [items, total] = await Promise.all([
			InventoryRepository.findMany(db, eventId, pagination, filters),
			InventoryRepository.count(db, eventId, filters),
		]);
		return { data: items.map(toListItem), total };
	},

	async getById(db: InventoryDb, id: string): Promise<InventoryListItem> {
		const item = await InventoryRepository.findById(db, id);
		if (!item) throw new NotFoundError("Item de inventário não encontrado");
		return toListItem(item);
	},

	async getStats(db: InventoryDb, eventId: string): Promise<InventoryStats> {
		const rows = await InventoryRepository.findMetricsRows(db, eventId);

		let totalQuantity = 0;
		let totalCurrent = 0;
		let totalVenue = 0;
		let totalValue = 0;
		let completedValue = 0;
		let completedItems = 0;
		let inProgressItems = 0;
		let pendingItems = 0;

		for (const row of rows) {
			const planned = toNumber(row.plannedQuantity);
			const current = toNumber(row.currentQuantity);
			const venue = toNumber(row.venueQuantity);
			const unitPrice = row.unitPrice === null ? null : toNumber(row.unitPrice);

			totalQuantity += planned;
			totalCurrent += current;
			totalVenue += venue;

			const values = computeValues(planned, current, unitPrice);
			totalValue += values.totalValue;
			completedValue += values.completedValue;

			if (row.status === "COMPLETED") completedItems += 1;
			else if (row.status === "IN_PROGRESS") inProgressItems += 1;
			else pendingItems += 1;
		}

		const totalRemaining = Math.max(0, totalQuantity - totalCurrent);

		return {
			totalItems: rows.length,
			totalQuantity,
			totalCurrent,
			totalVenue,
			totalRemaining,
			completionPercentage: computeCompletionPercentage(
				totalQuantity,
				totalCurrent,
			),
			totalValue: roundMoney(totalValue),
			completedValue: roundMoney(completedValue),
			pendingValue: Math.max(0, roundMoney(totalValue - completedValue)),
			completedItems,
			inProgressItems,
			pendingItems,
		};
	},

	async create(
		db: InventoryDb,
		eventId: string,
		userId: string,
		input: CreateInventoryItemInput,
	): Promise<InventoryListItem> {
		if (input.venueQuantity > input.plannedQuantity) {
			throw new ForbiddenError(
				"A quantidade destinada ao salão não pode superar a quantidade planeada",
			);
		}
		if (input.currentQuantity > input.plannedQuantity) {
			throw new ForbiddenError(
				"A quantidade actual não pode superar a quantidade planeada",
			);
		}

		const item = await InventoryRepository.create(db, {
			eventId,
			name: input.name,
			category: input.category,
			plannedQuantity: input.plannedQuantity,
			currentQuantity: input.currentQuantity,
			venueQuantity: input.venueQuantity,
			status: computeStatus(input.plannedQuantity, input.currentQuantity),
			unit: input.unit,
			unitPrice: input.unitPrice,
			vendorId: input.vendorId,
			notes: input.notes,
		});

		// Initial stock is registered as a movement so the history is complete
		// from day one.
		if (input.currentQuantity > 0) {
			await InventoryRepository.createMovement(db, {
				inventoryItemId: item.id,
				type: "ADD",
				quantity: input.currentQuantity,
				unitPrice: input.unitPrice,
				totalCost: computeMovementCost(input.currentQuantity, input.unitPrice),
				reason: "Estoque inicial",
				createdBy: userId,
			});
		}

		return toListItem(item);
	},

	async update(
		db: InventoryDb,
		id: string,
		input: UpdateInventoryItemInput,
	): Promise<InventoryListItem> {
		const item = await InventoryRepository.findById(db, id);
		if (!item) throw new NotFoundError("Item de inventário não encontrado");

		const plannedQuantity =
			input.plannedQuantity ?? toNumber(item.plannedQuantity);
		const currentQuantity = toNumber(item.currentQuantity);
		const venueQuantity = input.venueQuantity ?? toNumber(item.venueQuantity);

		if (plannedQuantity < currentQuantity) {
			throw new ForbiddenError(
				"A quantidade planeada não pode ser inferior à quantidade actual",
			);
		}
		if (venueQuantity > plannedQuantity) {
			throw new ForbiddenError(
				"A quantidade destinada ao salão não pode superar a quantidade planeada",
			);
		}

		const updated = await InventoryRepository.update(db, id, {
			...input,
			status: computeStatus(plannedQuantity, currentQuantity),
		});
		return toListItem(updated);
	},

	async delete(db: InventoryDb, id: string): Promise<void> {
		const item = await InventoryRepository.findById(db, id);
		if (!item) throw new NotFoundError("Item de inventário não encontrado");
		await InventoryRepository.delete(db, id);
	},

	/**
	 * Registers a movement and updates the current quantity/status.
	 * Must be called inside a transaction (`db.$transaction`) so the movement
	 * and the item update are atomic.
	 */
	async addMovement(
		db: InventoryDb,
		inventoryItemId: string,
		userId: string,
		input: AddMovementInput,
	): Promise<InventoryMovementDto> {
		const item = await InventoryRepository.findById(db, inventoryItemId);
		if (!item) throw new NotFoundError("Item de inventário não encontrado");

		const plannedQuantity = toNumber(item.plannedQuantity);
		const currentQuantity = toNumber(item.currentQuantity);
		const { quantity, type, unitPrice, reason } = input;

		let newQuantity: number;
		if (isIncreaseType(type)) {
			if (currentQuantity + quantity > plannedQuantity) {
				const remaining = Math.max(0, plannedQuantity - currentQuantity);
				throw new ForbiddenError(
					`Não é possível adicionar ${quantity} unidades. Apenas ${remaining} unidades restam para completar a quantidade planeada.`,
				);
			}
			newQuantity = currentQuantity + quantity;
		} else if (DECREASE_TYPES.includes(type)) {
			newQuantity = Math.max(0, currentQuantity - quantity);
		} else {
			// ADJUSTMENT sets an absolute value
			if (quantity > plannedQuantity) {
				throw new ForbiddenError(
					"A quantidade ajustada não pode superar a quantidade planeada",
				);
			}
			newQuantity = quantity;
		}

		const movement = await InventoryRepository.createMovement(db, {
			inventoryItemId,
			type,
			quantity,
			unitPrice,
			totalCost: computeMovementCost(quantity, unitPrice),
			reason,
			createdBy: userId,
		});

		await InventoryRepository.updateQuantity(db, inventoryItemId, {
			currentQuantity: newQuantity,
			status: computeStatus(plannedQuantity, newQuantity),
		});

		return toMovementDto(movement);
	},

	async getHistory(
		db: InventoryDb,
		inventoryItemId: string,
	): Promise<InventoryHistory> {
		const item = await InventoryRepository.findById(db, inventoryItemId);
		if (!item) throw new NotFoundError("Item de inventário não encontrado");

		const movements = await InventoryRepository.findMovements(
			db,
			inventoryItemId,
		);

		const plannedQuantity = toNumber(item.plannedQuantity);
		const currentQuantity = toNumber(item.currentQuantity);
		const { remainingQuantity, completionPercentage } = computeItemMetrics(
			plannedQuantity,
			currentQuantity,
		);

		const mappedMovements = movements.map(toMovementDto);
		let totalEntered = 0;
		let totalCost = 0;
		for (const movement of mappedMovements) {
			if (isIncreaseType(movement.type)) {
				totalEntered += movement.quantity;
			}
			totalCost += movement.totalCost ?? 0;
		}

		return {
			item: {
				id: item.id,
				name: item.name,
				unit: item.unit,
				status: item.status,
				plannedQuantity,
				currentQuantity,
				remainingQuantity,
				completionPercentage,
				unitPrice: item.unitPrice === null ? null : toNumber(item.unitPrice),
			},
			movements: mappedMovements,
			totals: {
				movementsCount: mappedMovements.length,
				totalEntered,
				totalCost: roundMoney(totalCost),
			},
		};
	},
};
