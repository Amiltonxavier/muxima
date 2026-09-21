import db from "@muxima/db";
import type { NotificationType, Prisma } from "@muxima/db/prisma";

export type NotificationFilterParams = {
	search?: string;
	type?: NotificationType;
	read?: boolean;
};

function buildNotificationWhere(
	userId: string,
	filters?: NotificationFilterParams,
): Prisma.NotificationWhereInput {
	const conditions: Prisma.NotificationWhereInput[] = [{ userId }];

	if (filters?.search) {
		conditions.push({
			OR: [
				{ title: { contains: filters.search, mode: "insensitive" } },
				{ message: { contains: filters.search, mode: "insensitive" } },
			],
		});
	}
	if (filters?.type) {
		conditions.push({ type: filters.type });
	}
	if (filters?.read !== undefined) {
		if (filters.read) {
			conditions.push({ readAt: { not: null } });
		} else {
			conditions.push({ readAt: null });
		}
	}

	return { AND: conditions };
}

export const NotificationRepository = {
	findById(id: string) {
		return db.notification.findUnique({ where: { id } });
	},

	findByUserId(
		userId: string,
		pagination: { page: number; limit: number },
		filters?: NotificationFilterParams,
	) {
		const skip = (pagination.page - 1) * pagination.limit;
		return db.notification.findMany({
			where: buildNotificationWhere(userId, filters),
			orderBy: { createdAt: "desc" },
			skip,
			take: pagination.limit,
		});
	},

	countByUserId(userId: string, filters?: NotificationFilterParams) {
		return db.notification.count({
			where: buildNotificationWhere(userId, filters),
		});
	},

	countUnread(userId: string) {
		return db.notification.count({
			where: { userId, readAt: null },
		});
	},

	markAsRead(id: string) {
		return db.notification.update({
			where: { id },
			data: { readAt: new Date() },
		});
	},

	markAllAsRead(userId: string) {
		return db.notification.updateMany({
			where: { userId, readAt: null },
			data: { readAt: new Date() },
		});
	},

	delete(id: string) {
		return db.notification.delete({ where: { id } });
	},

	deleteAll(userId: string) {
		return db.notification.deleteMany({ where: { userId } });
	},
};
