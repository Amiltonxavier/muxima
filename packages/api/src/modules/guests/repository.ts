import db from "@muxima/db";

export const GuestRepository = {
	findByEventId(eventId: string) {
		return db.guest.findMany({
			where: { eventId },
			include: { companions: true, invitations: true, tableGuests: true },
			orderBy: { createdAt: "desc" },
		});
	},

	findById(id: string) {
		return db.guest.findUnique({
			where: { id },
			include: { companions: true, invitations: true, tableGuests: true },
		});
	},

	create(data: {
		eventId: string;
		name: string;
		phone?: string;
		email?: string;
		group?: string;
		type: string;
		companionsLimit?: number;
		notes?: string;
	}) {
		// biome-ignore lint/suspicious/noExplicitAny: Prisma enum types differ from string params
		return db.guest.create({ data: data as any });
	},

	update(id: string, data: Record<string, unknown>) {
		return db.guest.update({ where: { id }, data });
	},

	delete(id: string) {
		return db.guest.delete({ where: { id } });
	},

	addCompanion(data: { guestId: string; name: string }) {
		return db.guestCompanion.create({ data });
	},

	removeCompanion(id: string) {
		return db.guestCompanion.delete({ where: { id } });
	},

	getTablesByEvent(eventId: string) {
		return db.table.findMany({
			where: { eventId },
			include: { tableGuests: { include: { guest: true } } },
		});
	},

	createTable(data: {
		eventId: string;
		name: string;
		capacity: number;
		number?: number;
		location?: string;
		notes?: string;
	}) {
		return db.table.create({ data });
	},

	assignToTable(tableId: string, guestId: string) {
		return db.tableGuest.create({ data: { tableId, guestId } });
	},

	removeFromTable(tableId: string, guestId: string) {
		return db.tableGuest.delete({
			where: { tableId_guestId: { tableId, guestId } },
		});
	},
};
