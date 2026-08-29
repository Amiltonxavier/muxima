import db from "@muxima/db";

export const InventoryRepository = {
	findByEventId(eventId: string) {
		return db.inventoryItem.findMany({
			where: { eventId },
			include: { vendor: true, movements: true },
			orderBy: { createdAt: "desc" },
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
		category: string;
		plannedQuantity: number;
		currentQuantity?: number;
		unit: string;
		unitPrice?: number;
		vendorId?: string;
		notes?: string;
	}) {
		// biome-ignore lint/suspicious/noExplicitAny: Prisma enum types differ from string params
		return db.inventoryItem.create({ data: data as any });
	},

	update(id: string, data: Record<string, unknown>) {
		return db.inventoryItem.update({ where: { id }, data });
	},

	delete(id: string) {
		return db.inventoryItem.delete({ where: { id } });
	},

	addMovement(data: {
		inventoryItemId: string;
		type: string;
		quantity: number;
		reason?: string;
		createdBy: string;
	}) {
		// biome-ignore lint/suspicious/noExplicitAny: Prisma enum types differ from string params
		return db.inventoryMovement.create({ data: data as any });
	},
};
