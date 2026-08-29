import { NotFoundError } from "../../shared/errors/app-error";
import { UserRepository } from "./repository";

export const UserService = {
	async getProfile(userId: string) {
		const user = await UserRepository.findById(userId);
		if (!user) throw new NotFoundError("Utilizador não encontrado");
		return user;
	},

	async updateProfile(
		userId: string,
		data: { name?: string; email?: string; phone?: string },
	) {
		return UserRepository.update(userId, data);
	},

	async getMembers(eventId: string) {
		return UserRepository.findByEventMembers(eventId);
	},
};
