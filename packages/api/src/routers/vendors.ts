import db from "@muxima/db";
import { z } from "zod";
import { protectedProcedure } from "../index";
import {
	getEventIdForResource,
	requireEventAccess,
} from "../shared/auth/event-access";
import { parsePagination, paginatedResponse } from "../shared/utils/helpers";

export const vendorsRouter = {
	list: protectedProcedure
		.input(
			z.object({
				eventId: z.string(),
				page: z.number().optional(),
				limit: z.number().optional(),
				search: z.string().optional(),
				category: z
					.enum([
						"VENUE",
						"DECORATION",
						"MUSIC",
						"PHOTOGRAPHY",
						"VIDEO",
						"CATERING",
						"CAKE",
						"DRINKS",
						"TRANSPORT",
						"BEAUTY",
						"SECURITY",
						"ENTERTAINMENT",
						"OTHER",
					])
					.optional(),
				status: z
					.enum([
						"PROSPECT",
						"CONTACTED",
						"NEGOTIATING",
						"CONTRACTED",
						"COMPLETED",
						"CANCELLED",
					])
					.optional(),
			}),
		)
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);

			const { page, limit, skip } = parsePagination(input);

			const where: Record<string, unknown> = {
				eventId: input.eventId,
			};

			if (input.search) {
				where.OR = [
					{ name: { contains: input.search, mode: "insensitive" } },
					{ email: { contains: input.search, mode: "insensitive" } },
					{ phone: { contains: input.search, mode: "insensitive" } },
					{ description: { contains: input.search, mode: "insensitive" } },
				];
			}

			if (input.category) where.category = input.category;
			if (input.status) where.status = input.status;

			const [vendors, total] = await Promise.all([
				db.vendor.findMany({
					where,
					include: {
						contracts: true,
						expenses: true,
					},
					orderBy: { createdAt: "desc" },
					skip,
					take: limit,
				}),
				db.vendor.count({ where }),
			]);

			return paginatedResponse(vendors, total, page, limit);
		}),

	getById: protectedProcedure
		.input(z.object({ id: z.string() }))
		.handler(async ({ context, input }) => {
			const vendor = await db.vendor.findUnique({
				where: { id: input.id },
				include: {
					contracts: true,
					expenses: {
						include: {
							payments: true,
						},
					},
				},
			});

			if (!vendor) {
				throw new Error("Fornecedor não encontrado");
			}

			await requireEventAccess(context.session.user.id, vendor.eventId);

			return vendor;
		}),

	create: protectedProcedure
		.input(
			z.object({
				eventId: z.string(),
				name: z.string().min(1),
				category: z.enum([
					"VENUE",
					"DECORATION",
					"MUSIC",
					"PHOTOGRAPHY",
					"VIDEO",
					"CATERING",
					"CAKE",
					"DRINKS",
					"TRANSPORT",
					"BEAUTY",
					"SECURITY",
					"ENTERTAINMENT",
					"OTHER",
				]),
				phone: z.string().optional(),
				email: z.string().email().optional().or(z.literal("")),
				address: z.string().optional(),
				description: z.string().optional(),
				notes: z.string().optional(),
				status: z
					.enum([
						"PROSPECT",
						"CONTACTED",
						"NEGOTIATING",
						"CONTRACTED",
						"COMPLETED",
						"CANCELLED",
					])
					.optional(),
			}),
		)
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);

			const vendor = await db.vendor.create({
				data: {
					eventId: input.eventId,
					name: input.name,
					category: input.category,
					phone: input.phone,
					email: input.email || null,
					address: input.address,
					description: input.description,
					notes: input.notes,
					status: input.status || "PROSPECT",
				},
			});

			return vendor;
		}),

	update: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				name: z.string().min(1).optional(),
				category: z
					.enum([
						"VENUE",
						"DECORATION",
						"MUSIC",
						"PHOTOGRAPHY",
						"VIDEO",
						"CATERING",
						"CAKE",
						"DRINKS",
						"TRANSPORT",
						"BEAUTY",
						"SECURITY",
						"ENTERTAINMENT",
						"OTHER",
					])
					.optional(),
				phone: z.string().optional(),
				email: z.string().email().optional().or(z.literal("")),
				address: z.string().optional(),
				description: z.string().optional(),
				notes: z.string().optional(),
				status: z
					.enum([
						"PROSPECT",
						"CONTACTED",
						"NEGOTIATING",
						"CONTRACTED",
						"COMPLETED",
						"CANCELLED",
					])
					.optional(),
			}),
		)
		.handler(async ({ input }) => {
			const vendor = await db.vendor.update({
				where: { id: input.id },
				data: {
					name: input.name,
					category: input.category,
					phone: input.phone,
					email: input.email || null,
					address: input.address,
					description: input.description,
					notes: input.notes,
					status: input.status,
				},
			});

			return vendor;
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.handler(async ({ context, input }) => {
			const eventId = await getEventIdForResource("vendor", input.id);
			if (eventId) {
				await requireEventAccess(context.session.user.id, eventId);
			}

			await db.vendor.delete({
				where: { id: input.id },
			});

			return { success: true };
		}),
};
