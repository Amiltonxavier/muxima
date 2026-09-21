import db from "@muxima/db";
import type { Prisma } from "@muxima/db/prisma";
import { z } from "zod";
import { protectedProcedure } from "../index";
import {
	getEventIdForResource,
	requireEventAccess,
} from "../shared/auth/event-access";
import { documentListInput } from "../shared/schemas/filters";
import { getPaginationMeta, parsePagination } from "../shared/utils/helpers";

export const documentsRouter = {
	list: protectedProcedure
		.input(z.object({ eventId: z.string() }).merge(documentListInput))
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);
			const { page, limit, skip } = parsePagination(input);

			const filterConditions: Prisma.DocumentWhereInput[] = [
				{ eventId: input.eventId },
			];

			if (input.search) {
				filterConditions.push({
					OR: [
						{ name: { contains: input.search, mode: "insensitive" } },
						{ reference: { contains: input.search, mode: "insensitive" } },
					],
				});
			}

			if (input.type) {
				filterConditions.push({ type: input.type });
			}

			if (input.status) {
				filterConditions.push({ status: input.status });
			}

			if (input.vendorId) {
				filterConditions.push({ vendorId: input.vendorId });
			}

			const where: Prisma.DocumentWhereInput = {
				AND: filterConditions,
			};

			const [documents, total] = await Promise.all([
				db.document.findMany({
					where,
					include: { vendor: true },
					orderBy: { createdAt: "desc" },
					skip,
					take: limit,
				}),
				db.document.count({ where }),
			]);

			return { data: documents, meta: getPaginationMeta(total, page, limit) };
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
