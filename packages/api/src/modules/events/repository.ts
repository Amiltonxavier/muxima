import db from "@muxima/db";

export const EventRepository = {
	create(data: {
		ownerId: string;
		name: string;
		type: "ENGAGEMENT" | "WEDDING";
		eventDate?: Date;
		description?: string;
	}) {
		return db.event.create({ data });
	},

	findById(id: string) {
		return db.event.findUnique({
			where: { id },
			include: { members: true, budget: true },
		});
	},

	findByUserId(userId: string) {
		return db.event.findMany({
			where: { members: { some: { userId } } },
			include: { members: true, budget: true },
			orderBy: { createdAt: "desc" },
		});
	},

	update(id: string, data: Record<string, unknown>) {
		return db.event.update({ where: { id }, data });
	},

	delete(id: string) {
		return db.event.delete({ where: { id } });
	},
};
