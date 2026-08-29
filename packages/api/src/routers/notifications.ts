import db from "@muxima/db";
import { z } from "zod";
import { protectedProcedure } from "../index";

export const notificationsRouter = {
	list: protectedProcedure.handler(async ({ context }) => {
		const notifications = await db.notification.findMany({
			where: {
				userId: context.session.user.id,
			},
			orderBy: {
				createdAt: "desc",
			},
			take: 50,
		});

		return notifications;
	}),

	getUnreadCount: protectedProcedure.handler(async ({ context }) => {
		const count = await db.notification.count({
			where: {
				userId: context.session.user.id,
				readAt: null,
			},
		});

		return count;
	}),

	markAsRead: protectedProcedure
		.input(z.object({ id: z.string() }))
		.handler(async ({ input }) => {
			const notification = await db.notification.update({
				where: { id: input.id },
				data: {
					readAt: new Date(),
				},
			});

			return notification;
		}),

	markAllAsRead: protectedProcedure.handler(async ({ context }) => {
		await db.notification.updateMany({
			where: {
				userId: context.session.user.id,
				readAt: null,
			},
			data: {
				readAt: new Date(),
			},
		});

		return { success: true };
	}),

	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.handler(async ({ input }) => {
			await db.notification.delete({
				where: { id: input.id },
			});

			return { success: true };
		}),

	deleteAll: protectedProcedure.handler(async ({ context }) => {
		await db.notification.deleteMany({
			where: {
				userId: context.session.user.id,
			},
		});

		return { success: true };
	}),
};
