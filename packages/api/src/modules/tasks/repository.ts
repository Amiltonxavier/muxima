import db from "@muxima/db";
import type {
	Prisma,
	TaskCategory,
	TaskPriority,
	TaskStatus,
} from "@muxima/db/prisma";

export type TaskFilterParams = {
	search?: string;
	status?: TaskStatus;
	category?: TaskCategory;
	priority?: TaskPriority;
};

function buildTaskWhere(
	eventId: string,
	filters?: TaskFilterParams,
): Prisma.TaskWhereInput {
	const conditions: Prisma.TaskWhereInput[] = [{ eventId }];

	if (filters?.search) {
		conditions.push({
			OR: [
				{ title: { contains: filters.search, mode: "insensitive" } },
				{ description: { contains: filters.search, mode: "insensitive" } },
			],
		});
	}
	if (filters?.status) {
		conditions.push({ status: filters.status });
	}
	if (filters?.category) {
		conditions.push({ category: filters.category });
	}
	if (filters?.priority) {
		conditions.push({ priority: filters.priority });
	}

	return { AND: conditions };
}

export const TaskRepository = {
	findByEventId(
		eventId: string,
		pagination: { page: number; limit: number },
		filters?: TaskFilterParams,
	) {
		const skip = (pagination.page - 1) * pagination.limit;
		const where = buildTaskWhere(eventId, filters);
		return db.task.findMany({
			where,
			orderBy: { createdAt: "desc" },
			skip,
			take: pagination.limit,
		});
	},

	countByEventId(eventId: string, filters?: TaskFilterParams) {
		return db.task.count({ where: buildTaskWhere(eventId, filters) });
	},

	findById(id: string) {
		return db.task.findUnique({ where: { id } });
	},

	create(data: {
		eventId: string;
		title: string;
		description?: string;
		category: TaskCategory;
		priority?: TaskPriority;
		assignedTo?: string;
		dueDate?: Date;
		createdBy: string;
	}) {
		return db.task.create({ data });
	},

	update(
		id: string,
		data: Partial<{
			title: string;
			description: string;
			category:
				| "FINANCE"
				| "VENUE"
				| "GUESTS"
				| "FOOD"
				| "DRINKS"
				| "DECORATION"
				| "CEREMONY"
				| "DOCUMENTS"
				| "CLOTHING"
				| "TRANSPORT"
				| "OTHER";
			priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
			status: "TODO" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
			assignedTo: string;
			dueDate: Date;
			completedAt: Date;
			completedBy: string;
		}>,
	) {
		return db.task.update({ where: { id }, data });
	},

	delete(id: string) {
		return db.task.delete({ where: { id } });
	},

	findSchedulesByEventId(
		eventId: string,
		pagination: { page: number; limit: number },
		filters?: {
			search?: string;
			status?: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
		},
	) {
		const skip = (pagination.page - 1) * pagination.limit;
		const conditions: Prisma.ScheduleWhereInput[] = [{ eventId }];
		if (filters?.search) {
			conditions.push({
				OR: [
					{ title: { contains: filters.search, mode: "insensitive" } },
					{ description: { contains: filters.search, mode: "insensitive" } },
					{ location: { contains: filters.search, mode: "insensitive" } },
					{ responsible: { contains: filters.search, mode: "insensitive" } },
				],
			});
		}
		if (filters?.status) {
			conditions.push({
				status: filters.status as Prisma.EnumScheduleStatusFilter["equals"],
			});
		}
		const where: Prisma.ScheduleWhereInput = { AND: conditions };
		return db.schedule.findMany({
			where,
			orderBy: { startAt: "asc" },
			skip,
			take: pagination.limit,
		});
	},

	countSchedulesByEventId(
		eventId: string,
		filters?: {
			search?: string;
			status?: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
		},
	) {
		const conditions: Prisma.ScheduleWhereInput[] = [{ eventId }];
		if (filters?.search) {
			conditions.push({
				OR: [
					{ title: { contains: filters.search, mode: "insensitive" } },
					{ description: { contains: filters.search, mode: "insensitive" } },
					{ location: { contains: filters.search, mode: "insensitive" } },
					{ responsible: { contains: filters.search, mode: "insensitive" } },
				],
			});
		}
		if (filters?.status) {
			conditions.push({
				status: filters.status as Prisma.EnumScheduleStatusFilter["equals"],
			});
		}
		const where: Prisma.ScheduleWhereInput = { AND: conditions };
		return db.schedule.count({ where });
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

	updateSchedule(
		id: string,
		data: Partial<{
			title: string;
			description: string;
			startAt: Date;
			endAt: Date;
			location: string;
			responsible: string;
			status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
		}>,
	) {
		return db.schedule.update({ where: { id }, data });
	},

	deleteSchedule(id: string) {
		return db.schedule.delete({ where: { id } });
	},
};
