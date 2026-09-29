import db from "@muxima/db";
import type { PrismaClient } from "@muxima/db/prisma";

export const UserRepository = {
	findById(id: string) {
		return db.user.findUnique({ where: { id } });
	},

	findByEmail(email: string) {
		return db.user.findUnique({ where: { email } });
	},

	update(
		id: string,
		data: Partial<{
			name: string;
			email: string;
			phone: string;
		}>,
	) {
		return db.user.update({ where: { id }, data });
	},

	findByEventMembers(eventId: string) {
		return db.eventMember.findMany({
			where: { eventId },
			include: { user: true },
		});
	},

	findStatus(id: string) {
		return db.user.findUnique({
			where: { id },
			select: { id: true, status: true },
		});
	},

	/**
	 * Blocks the account and revokes every active session in a single
	 * transaction, so a blocked user can never keep an authenticated session
	 * around.
	 */
	block(id: string, reason: string | null, prisma: PrismaClient = db) {
		return prisma.$transaction(async (tx) => {
			const user = await tx.user.update({
				where: { id },
				data: {
					status: "BLOCKED",
					blockedAt: new Date(),
					blockedReason: reason,
				},
				select: {
					id: true,
					email: true,
					status: true,
					blockedAt: true,
				},
			});

			const { count } = await tx.session.deleteMany({ where: { userId: id } });

			return { user, revokedSessions: count };
		});
	},

	unblock(id: string, prisma: PrismaClient = db) {
		return prisma.user.update({
			where: { id },
			data: { status: "ACTIVE", blockedAt: null, blockedReason: null },
			select: {
				id: true,
				email: true,
				status: true,
				blockedAt: true,
			},
		});
	},
};
