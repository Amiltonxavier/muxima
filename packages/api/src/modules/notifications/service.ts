import { NotificationRepository } from "./repository";

export const NotificationService = {
	async findByUserId(userId: string) {
		return NotificationRepository.findByUserId(userId);
	},

	async getUnreadCount(userId: string) {
		return NotificationRepository.countUnread(userId);
	},

	async markAsRead(id: string) {
		return NotificationRepository.markAsRead(id);
	},

	async markAllAsRead(userId: string) {
		return NotificationRepository.markAllAsRead(userId);
	},

	async delete(id: string) {
		return NotificationRepository.delete(id);
	},

	async deleteAll(userId: string) {
		return NotificationRepository.deleteAll(userId);
	},
};
