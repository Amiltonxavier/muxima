import db from "@muxima/db";

export const VendorRepository = {
	findByEventId(eventId: string) {
		return db.vendor.findMany({
			where: { eventId },
			include: { expenses: true, contracts: true },
			orderBy: { createdAt: "desc" },
		});
	},

	findById(id: string) {
		return db.vendor.findUnique({
			where: { id },
			include: { expenses: { include: { payments: true } }, contracts: true },
		});
	},

	create(data: {
		eventId: string;
		name: string;
		category: string;
		phone?: string;
		email?: string;
		address?: string;
		description?: string;
		notes?: string;
	}) {
		// biome-ignore lint/suspicious/noExplicitAny: Prisma enum types differ from string params
		return db.vendor.create({ data: data as any });
	},

	update(id: string, data: Record<string, unknown>) {
		// biome-ignore lint/suspicious/noExplicitAny: Prisma enum types differ from string params
		return db.vendor.update({ where: { id }, data: data as any });
	},

	delete(id: string) {
		return db.vendor.delete({ where: { id } });
	},
};
