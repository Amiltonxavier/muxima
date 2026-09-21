import { NotFoundError } from "../../shared/errors/app-error";
import { type InventoryFilterParams, InventoryRepository } from "./repository";

export const InventoryService = {
	async findByEventId(
		eventId: string,
		pagination: { page: number; limit: number },
		filters?: InventoryFilterParams,
	) {
		const [data, total] = await Promise.all([
			InventoryRepository.findByEventId(eventId, pagination, filters),
			InventoryRepository.countByEventId(eventId, filters),
		]);
		return { data, total };
	},

	async findById(id: string) {
		const item = await InventoryRepository.findById(id);
		if (!item) throw new NotFoundError("Item não encontrado");
		return item;
	},

	async create(
		eventId: string,
		data: {
			name: string;
			category: "DRINK" | "FOOD" | "CAKE" | "DECORATION" | "OTHER";
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
		},
	) {
		return InventoryRepository.create({ eventId, ...data });
	},

	async update(
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
		const item = await InventoryRepository.findById(id);
		if (!item) throw new NotFoundError("Item não encontrado");
		return InventoryRepository.update(id, data);
	},

	async delete(id: string) {
		const item = await InventoryRepository.findById(id);
		if (!item) throw new NotFoundError("Item não encontrado");
		return InventoryRepository.delete(id);
	},

	async addMovement(
		inventoryItemId: string,
		userId: string,
		data: {
			type:
				| "PURCHASE"
				| "ADD"
				| "CONSUMPTION"
				| "ADJUSTMENT"
				| "LOSS"
				| "RETURN";
			quantity: number;
			reason?: string;
		},
	) {
		const item = await InventoryRepository.findById(inventoryItemId);
		if (!item) throw new NotFoundError("Item não encontrado");

		const movement = await InventoryRepository.addMovement({
			inventoryItemId,
			type: data.type,
			quantity: data.quantity,
			reason: data.reason,
			createdBy: userId,
		});

		let newQty = item.currentQuantity.toNumber();
		if (
			data.type === "ADD" ||
			data.type === "PURCHASE" ||
			data.type === "RETURN"
		) {
			newQty += data.quantity;
		} else if (data.type === "CONSUMPTION" || data.type === "LOSS") {
			newQty -= data.quantity;
		} else if (data.type === "ADJUSTMENT") {
			newQty = data.quantity;
		}
		newQty = Math.max(0, newQty);
		await InventoryRepository.update(inventoryItemId, {
			currentQuantity: newQty,
		});

		return movement;
	},
};
