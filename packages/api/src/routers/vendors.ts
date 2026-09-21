import db from "@muxima/db";
import type { Prisma } from "@muxima/db/prisma";
import { z } from "zod";
import { protectedProcedure } from "../index";
import {
	getEventIdForResource,
	requireEventAccess,
} from "../shared/auth/event-access";
import { vendorListInput } from "../shared/schemas/filters";
import { getPaginationMeta, parsePagination } from "../shared/utils/helpers";

export const vendorsRouter = {
	list: protectedProcedure
		.input(z.object({ eventId: z.string() }).merge(vendorListInput))
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);
			const { page, limit, skip } = parsePagination(input);

			const filterConditions: Prisma.VendorWhereInput[] = [
				{ eventId: input.eventId },
			];

			if (input.search) {
				filterConditions.push({
					OR: [
						{ name: { contains: input.search, mode: "insensitive" } },
						{ email: { contains: input.search, mode: "insensitive" } },
						{ phone: { contains: input.search, mode: "insensitive" } },
						{ description: { contains: input.search, mode: "insensitive" } },
					],
				});
			}

			if (input.category) {
				filterConditions.push({ category: input.category });
			}

			if (input.status) {
				filterConditions.push({ status: input.status });
			}

			const where: Prisma.VendorWhereInput = {
				AND: filterConditions,
			};

			const [vendors, total] = await Promise.all([
				db.vendor.findMany({
					where,
					include: { contracts: true, expenses: true },
					orderBy: { createdAt: "desc" },
					skip,
					take: limit,
				}),
				db.vendor.count({ where }),
			]);

			return { data: vendors, meta: getPaginationMeta(total, page, limit) };
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
