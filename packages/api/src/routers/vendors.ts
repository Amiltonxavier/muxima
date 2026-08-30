import db from "@muxima/db";
import { z } from "zod";
import { protectedProcedure } from "../index";
import {
	getEventIdForResource,
	requireEventAccess,
} from "../shared/auth/event-access";

export const vendorsRouter = {
	list: protectedProcedure
		.input(z.object({ eventId: z.string() }))
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);
			const vendors = await db.vendor.findMany({
				where: { eventId: input.eventId },
				include: {
					contracts: true,
					expenses: true,
				},
				orderBy: {
					createdAt: "desc",
				},
			});

			return vendors;
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
