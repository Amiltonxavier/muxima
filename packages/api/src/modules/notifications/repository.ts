import db from "@muxima/db";

export const NotificationRepository = {
	findByUserId(userId: string) {
		return db.notification.findMany({
			where: { userId },
			orderBy: { createdAt: "desc" },
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
