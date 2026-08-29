import db from "@muxima/db";

export const DocumentRepository = {
	findByEventId(eventId: string) {
		return db.document.findMany({
			where: { eventId },
			include: { vendor: true, expense: true, payment: true },
			orderBy: { createdAt: "desc" },
		});
	},

	findById(id: string) {
		return db.document.findUnique({
			where: { id },
			include: { vendor: true, expense: true, payment: true },
		});
	},

	create(data: {
		eventId: string;
		name: string;
		type: string;
		reference?: string;
		vendorId?: string;
		expenseId?: string;
		paymentId?: string;
		createdBy: string;
	}) {
		// biome-ignore lint/suspicious/noExplicitAny: Prisma enum types differ from string params
		return db.document.create({ data: data as any });
	},

	update(id: string, data: Record<string, unknown>) {
		return db.document.update({ where: { id }, data });
	},

	delete(id: string) {
		return db.document.delete({ where: { id } });
	},
};
