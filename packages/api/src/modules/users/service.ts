import { BadRequestError, NotFoundError } from "../../shared/errors/app-error";
import { UserRepository } from "./repository";

/** Profile fields a user is allowed to change about themselves. */
export const profileSelect = {
	id: true,
	name: true,
	email: true,
	image: true,
	phone: true,
	emailVerified: true,
	status: true,
	createdAt: true,
	updatedAt: true,
	blockedAt: true,
	blockedReason: true,
} as const;

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
		if (data.email) {
			const taken = await UserRepository.findByEmail(data.email);
			if (taken && taken.id !== userId) {
				throw new BadRequestError("Este email já está a ser utilizado");
			}
		}
		return UserRepository.update(userId, data);
	},

	async getMembers(eventId: string) {
		return UserRepository.findByEventMembers(eventId);
	},

	/**
	 * Blocks the caller's own account. Persists the new state and revokes every
	 * active session so the user loses access immediately.
	 */
	async blockAccount(userId: string, reason?: string) {
		const user = await UserRepository.findById(userId);
		if (!user) throw new NotFoundError("Utilizador não encontrado");
		if (user.status === "BLOCKED") {
			throw new BadRequestError("A conta já está bloqueada");
		}
		return UserRepository.block(userId, reason ?? null);
	},

	/** Only usable while another session still exists — otherwise ask support. */
	async unblockAccount(userId: string) {
		const user = await UserRepository.findById(userId);
		if (!user) throw new NotFoundError("Utilizador não encontrado");
		if (user.status !== "BLOCKED") {
			throw new BadRequestError("A conta não está bloqueada");
		}
		return UserRepository.unblock(userId);
	},
};
