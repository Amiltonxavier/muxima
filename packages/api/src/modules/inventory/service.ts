import { NotFoundError } from "../../shared/errors/app-error";
import { InventoryRepository } from "./repository";

export const InventoryService = {
	async findByEventId(eventId: string) {
		return InventoryRepository.findByEventId(eventId);
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
			category: string;
			plannedQuantity: number;
			currentQuantity?: number;
			unit: string;
			unitPrice?: number;
			vendorId?: string;
			notes?: string;
		},
	) {
		return InventoryRepository.create({ eventId, ...data });
	},

	async update(id: string, data: Record<string, unknown>) {
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
		data: { type: string; quantity: number; reason?: string },
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
		} else if (
			data.type === "CONSUMPTION" ||
			data.type === "LOSS" ||
			data.type === "REMOVE"
		) {
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
