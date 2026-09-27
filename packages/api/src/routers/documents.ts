import db from "@muxima/db";
import type { Prisma } from "@muxima/db/prisma";
import { z } from "zod";
import { protectedProcedure, publicProcedure } from "../index";
import {
	getEventIdForResource,
	requireEventAccess,
} from "../shared/auth/event-access";
import { NotFoundError, ValidationError } from "../shared/errors/app-error";
import {
	ACCEPTED_DOCUMENT_FORMATS,
	ACCEPTED_DOCUMENT_MIME_TYPES,
	documentMimeTypeSchema,
	documentUrlSchema,
	resolveDocumentFormat,
} from "../shared/schemas/document-attachment";
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

			if (input.supplierId) {
				filterConditions.push({ supplierId: input.supplierId });
			}

			const where: Prisma.DocumentWhereInput = {
				AND: filterConditions,
			};

			const [documents, total] = await Promise.all([
				db.document.findMany({
					where,
					include: { supplier: true },
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
				include: { supplier: true },
			});

			if (!document) {
				throw new NotFoundError("Documento não encontrado");
			}

			await requireEventAccess(context.session.user.id, document.eventId);

			return document;
		}),

	/** The formats the upload dialog is allowed to offer. */
	getAcceptedFormats: publicProcedure.handler(() => ({
		extensions: ACCEPTED_DOCUMENT_FORMATS,
		mimeTypes: ACCEPTED_DOCUMENT_MIME_TYPES,
	})),

	create: protectedProcedure
		.input(
			z.object({
				eventId: z.string(),
				name: z.string().trim().min(1),
				type: z.enum(["CONTRACT", "RECEIPT", "QUOTE", "OTHER"]),
				reference: z.string().trim().optional(),
				url: documentUrlSchema.optional(),
				mimeType: documentMimeTypeSchema.optional(),
				supplierId: z.string().optional(),
				supplierPaymentId: z.string().optional(),
				supplierInstallmentId: z.string().optional(),
			}),
		)
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);

			// The declared mime type has to agree with the file extension.
			const format = resolveDocumentFormat(input.url, input.mimeType);
			if (format && !format.ok) {
				throw new ValidationError(format.message);
			}

			const document = await db.document.create({
				data: {
					eventId: input.eventId,
					name: input.name,
					type: input.type,
					reference: input.reference,
					url: input.url,
					mimeType: format?.ok ? format.mimeType : input.mimeType,
					supplierId: input.supplierId,
					supplierPaymentId: input.supplierPaymentId,
					supplierInstallmentId: input.supplierInstallmentId,
					createdBy: context.session.user.id,
				},
			});

			return document;
		}),

	update: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				name: z.string().trim().min(1).optional(),
				type: z.enum(["CONTRACT", "RECEIPT", "QUOTE", "OTHER"]).optional(),
				reference: z.string().trim().optional(),
				url: documentUrlSchema.optional(),
				mimeType: documentMimeTypeSchema.optional(),
				supplierId: z.string().nullable().optional(),
				supplierPaymentId: z.string().nullable().optional(),
				supplierInstallmentId: z.string().nullable().optional(),
				status: z.enum(["ACTIVE", "ARCHIVED", "DELETED"]).optional(),
			}),
		)
		.handler(async ({ context, input }) => {
			const eventId = await getEventIdForResource("document", input.id);
			if (eventId) await requireEventAccess(context.session.user.id, eventId);

			const format = resolveDocumentFormat(input.url, input.mimeType);
			if (format && !format.ok) {
				throw new ValidationError(format.message);
			}

			const document = await db.document.update({
				where: { id: input.id },
				data: {
					name: input.name,
					type: input.type,
					reference: input.reference,
					url: input.url,
					mimeType: format?.ok ? format.mimeType : input.mimeType,
					supplierId: input.supplierId,
					supplierPaymentId: input.supplierPaymentId,
					supplierInstallmentId: input.supplierInstallmentId,
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
