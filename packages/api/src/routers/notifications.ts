import db from "@muxima/db";
import type { Prisma } from "@muxima/db/prisma";
import { z } from "zod";
import { protectedProcedure } from "../index";
import { notificationListInput } from "../shared/schemas/filters";
import { getPaginationMeta, parsePagination } from "../shared/utils/helpers";

export const notificationsRouter = {
	list: protectedProcedure
		.input(notificationListInput)
		.handler(async ({ context, input }) => {
			const { page, limit, skip } = parsePagination(input);

			const filterConditions: Prisma.NotificationWhereInput[] = [
				{ userId: context.session.user.id },
			];

			if (input.search) {
				filterConditions.push({
					OR: [
						{ title: { contains: input.search, mode: "insensitive" } },
						{ message: { contains: input.search, mode: "insensitive" } },
					],
				});
			}

			if (input.type) {
				filterConditions.push({ type: input.type });
			}

			if (input.read !== undefined) {
				if (input.read) {
					filterConditions.push({ readAt: { not: null } });
				} else {
					filterConditions.push({ readAt: null });
				}
			}

			const where: Prisma.NotificationWhereInput = {
				AND: filterConditions,
			};

			const [notifications, total] = await Promise.all([
				db.notification.findMany({
					where,
					orderBy: { createdAt: "desc" },
					skip,
					take: limit,
				}),
				db.notification.count({ where }),
			]);

			return {
				data: notifications,
				meta: getPaginationMeta(total, page, limit),
			};
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
