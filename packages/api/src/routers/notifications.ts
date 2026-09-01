import db from "@muxima/db";
import { z } from "zod";
import { protectedProcedure } from "../index";
import { parsePagination, paginatedResponse } from "../shared/utils/helpers";

export const notificationsRouter = {
	list: protectedProcedure
		.input(
			z.object({
				page: z.number().optional(),
				limit: z.number().optional(),
				search: z.string().optional(),
				unreadOnly: z.boolean().optional(),
			}),
		)
		.handler(async ({ context, input }) => {
			const { page, limit, skip } = parsePagination(input);

			const where: Record<string, unknown> = {
				userId: context.session.user.id,
			};

			if (input.search) {
				where.OR = [
					{ title: { contains: input.search, mode: "insensitive" } },
					{ message: { contains: input.search, mode: "insensitive" } },
				];
			}

			if (input.unreadOnly) {
				where.readAt = null;
			}

			const [notifications, total] = await Promise.all([
				db.notification.findMany({
					where,
					orderBy: { createdAt: "desc" },
					skip,
					take: limit,
				}),
				db.notification.count({ where }),
			]);

			return paginatedResponse(notifications, total, page, limit);
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
