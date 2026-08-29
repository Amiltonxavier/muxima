import db from "@muxima/db";

export const TaskRepository = {
	findByEventId(eventId: string) {
		return db.task.findMany({
			where: { eventId },
			orderBy: { createdAt: "desc" },
		});
	},

	findById(id: string) {
		return db.task.findUnique({ where: { id } });
	},

	create(data: {
		eventId: string;
		title: string;
		description?: string;
		category: string;
		priority?: string;
		assignedTo?: string;
		dueDate?: Date;
		createdBy: string;
	}) {
		// biome-ignore lint/suspicious/noExplicitAny: Prisma enum types differ from string params
		return db.task.create({ data: data as any });
	},

	update(id: string, data: Record<string, unknown>) {
		return db.task.update({ where: { id }, data });
	},

	delete(id: string) {
		return db.task.delete({ where: { id } });
	},

	findSchedulesByEventId(eventId: string) {
		return db.schedule.findMany({
			where: { eventId },
			orderBy: { startAt: "asc" },
		});
	},

	createSchedule(data: {
		eventId: string;
		title: string;
		description?: string;
		startAt: Date;
		endAt?: Date;
		location?: string;
		responsible?: string;
	}) {
		return db.schedule.create({ data });
	},

	updateSchedule(id: string, data: Record<string, unknown>) {
		return db.schedule.update({ where: { id }, data });
	},

	deleteSchedule(id: string) {
		return db.schedule.delete({ where: { id } });
	},
};
