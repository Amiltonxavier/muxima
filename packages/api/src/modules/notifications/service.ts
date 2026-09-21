import { ForbiddenError, NotFoundError } from "../../shared/errors/app-error";
import {
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

	async markAsRead(id: string, userId: string) {
		const notification = await NotificationRepository.findById(id);
		if (!notification) throw new NotFoundError("Notificação não encontrada");
		if (notification.userId !== userId)
			throw new ForbiddenError(
				"Não tem permissão para aceder a esta notificação",
			);
		return NotificationRepository.markAsRead(id);
	},

	async markAllAsRead(userId: string) {
		return NotificationRepository.markAllAsRead(userId);
	},

	async delete(id: string, userId: string) {
		const notification = await NotificationRepository.findById(id);
		if (!notification) throw new NotFoundError("Notificação não encontrada");
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
