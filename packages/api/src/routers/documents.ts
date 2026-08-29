import db from "@muxima/db";
import { z } from "zod";
import { protectedProcedure } from "../index";

export const documentsRouter = {
	list: protectedProcedure
		.input(z.object({ eventId: z.string() }))
		.handler(async ({ input }) => {
			const documents = await db.document.findMany({
				where: { eventId: input.eventId },
				include: {
					vendor: true,
				},
				orderBy: {
					createdAt: "desc",
				},
			});

			return documents;
		}),

	getById: protectedProcedure
		.input(z.object({ id: z.string() }))
		.handler(async ({ input }) => {
			const document = await db.document.findUnique({
				where: { id: input.id },
				include: {
					vendor: true,
				},
			});

			if (!document) {
				throw new Error("Documento não encontrado");
			}

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
		.handler(async ({ input }) => {
			await db.document.delete({
				where: { id: input.id },
			});

			return { success: true };
		}),
};
