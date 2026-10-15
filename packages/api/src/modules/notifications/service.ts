import { emitToUser, emitUnreadCount, REALTIME_EVENTS } from "../../realtime";
import { ForbiddenError, NotFoundError } from "../../shared/errors/app-error";
import { NOTIFICATION_CODES } from "../../shared/errors/codes";
import {
	type CreateNotificationInput,
	type NotificationFilterParams,
	NotificationRepository,
} from "./repository";

export const NotificationService = {
	async findByUserId(
		userId: string,
		pagination: { page: number; limit: number },
		filters?: NotificationFilterParams,
	) {
		const [data, total] = await Promise.all([
			NotificationRepository.findByUserId(userId, pagination, filters),
			NotificationRepository.countByUserId(userId, filters),
		]);
		return { data, total };
	},

	async getUnreadCount(userId: string) {
		return NotificationRepository.countUnread(userId);
	},

	/**
	 * Persist a notification, THEN fan it out in realtime.
	 *
	 * Order matters: the database is the source of truth, so a recipient that
	 * was offline (or reconnects) recovers the notification from the API. The
	 * emit is best-effort — a socket failure can never roll back the write or
	 * the business operation that produced it.
	 */
	async notify(input: CreateNotificationInput) {
		const notification = await NotificationRepository.create(input);

		emitToUser(input.userId, REALTIME_EVENTS.NEW, notification);
		void emitUnreadCount(input.userId).catch(() => {});

		return notification;
	},

	/**
	 * Notify several recipients, deduplicated — one persisted row and one emit
	 * per distinct user, never two.
	 */
	async notifyMany(
		userIds: readonly string[],
		input: Omit<CreateNotificationInput, "userId">,
	) {
		const unique = [...new Set(userIds)];
		return Promise.all(
			unique.map((userId) => NotificationService.notify({ ...input, userId })),
		);
	},

	async markAsRead(id: string, userId: string) {
		const notification = await NotificationRepository.findById(id);
		if (!notification)
			throw new NotFoundError("Notificação não encontrada", {
				code: NOTIFICATION_CODES.NOT_FOUND,
			});
		if (notification.userId !== userId)
			throw new ForbiddenError(
				"Não tem permissão para aceder a esta notificação",
			);
		const updated = await NotificationRepository.markAsRead(id);

		// Same user id as the notification owner: only that person's devices
		// hear about the change (all of them — the room holds every socket).
		emitToUser(userId, REALTIME_EVENTS.READ, { id });
		void emitUnreadCount(userId).catch(() => {});

		return updated;
	},

	async markAllAsRead(userId: string) {
		const result = await NotificationRepository.markAllAsRead(userId);

		emitToUser(userId, REALTIME_EVENTS.READ_ALL, {});
		void emitUnreadCount(userId).catch(() => {});

		return result;
	},

	async delete(id: string, userId: string) {
		const notification = await NotificationRepository.findById(id);
		if (!notification)
			throw new NotFoundError("Notificação não encontrada", {
				code: NOTIFICATION_CODES.NOT_FOUND,
			});
		if (notification.userId !== userId)
			throw new ForbiddenError(
				"Não tem permissão para aceder a esta notificação",
			);
		return NotificationRepository.delete(id);
	},

	async deleteAll(userId: string) {
		return NotificationRepository.deleteAll(userId);
	},
};
