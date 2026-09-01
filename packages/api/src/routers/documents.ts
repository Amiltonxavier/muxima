import db from "@muxima/db";
import { z } from "zod";
import { protectedProcedure } from "../index";
import {
	getEventIdForResource,
	requireEventAccess,
} from "../shared/auth/event-access";
import { parsePagination, paginatedResponse } from "../shared/utils/helpers";

export const documentsRouter = {
	list: protectedProcedure
		.input(
			z.object({
				eventId: z.string(),
				page: z.number().optional(),
				limit: z.number().optional(),
				search: z.string().optional(),
				type: z.enum(["CONTRACT", "RECEIPT", "QUOTE", "OTHER"]).optional(),
				status: z.enum(["ACTIVE", "ARCHIVED", "DELETED"]).optional(),
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
					{ reference: { contains: input.search, mode: "insensitive" } },
				];
			}

			if (input.type) where.type = input.type;
			if (input.status) where.status = input.status;

			const [documents, total] = await Promise.all([
				db.document.findMany({
					where,
					include: {
						vendor: true,
					},
					orderBy: { createdAt: "desc" },
					skip,
					take: limit,
				}),
				db.document.count({ where }),
			]);

			return paginatedResponse(documents, total, page, limit);
		}),

	getById: protectedProcedure
		.input(z.object({ id: z.string() }))
		.handler(async ({ context, input }) => {
			const document = await db.document.findUnique({
				where: { id: input.id },
				include: {
					vendor: true,
				},
			});

			if (!document) {
				throw new Error("Documento não encontrado");
			}

			await requireEventAccess(context.session.user.id, document.eventId);

			return document;
		}),

	create: protectedProcedure
		.input(
			z.object({
				eventId: z.string(),
				name: z.string().min(1),
				type: z.enum(["CONTRACT", "RECEIPT", "QUOTE", "OTHER"]),
				reference: z.string().optional(),
				vendorId: z.string().optional(),
				expenseId: z.string().optional(),
				paymentId: z.string().optional(),
			}),
		)
		.handler(async ({ context, input }) => {
			const document = await db.document.create({
				data: {
					eventId: input.eventId,
					name: input.name,
					type: input.type,
					reference: input.reference,
					vendorId: input.vendorId,
					expenseId: input.expenseId,
					paymentId: input.paymentId,
					createdBy: context.session.user.id,
				},
			});

			return document;
		}),

	update: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				name: z.string().min(1).optional(),
				type: z.enum(["CONTRACT", "RECEIPT", "QUOTE", "OTHER"]).optional(),
				reference: z.string().optional(),
				vendorId: z.string().optional(),
				expenseId: z.string().optional(),
				paymentId: z.string().optional(),
				status: z.enum(["ACTIVE", "ARCHIVED", "DELETED"]).optional(),
			}),
		)
		.handler(async ({ input }) => {
			const document = await db.document.update({
				where: { id: input.id },
				data: {
					name: input.name,
					type: input.type,
					reference: input.reference,
					vendorId: input.vendorId,
					expenseId: input.expenseId,
					paymentId: input.paymentId,
					status: input.status,
				},
			});

			return document;
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.handler(async ({ context, input }) => {
			const eventId = await getEventIdForResource("document", input.id);
			if (eventId) {
				await requireEventAccess(context.session.user.id, eventId);
			}
			await db.document.delete({
				where: { id: input.id },
			});

			return { success: true };
		}),
};
