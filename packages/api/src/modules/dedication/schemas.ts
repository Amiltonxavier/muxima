import { z } from "zod";
import { sanitizeRichTextContent } from "./rich-text";

export const DEDICATION_TYPES = [
	"WEDDING_VOW",
	"ENGAGEMENT_VOW",
	"DEDICATION",
] as const;

export const DEDICATION_STATUSES = [
	"NOT_STARTED",
	"DRAFT",
	"IN_PROGRESS",
	"READY",
] as const;

export const DEDICATION_VISIBILITIES = ["PRIVATE", "SHARED"] as const;

export const MAX_DEDICATION_TITLE_LENGTH = 120;

/**
 * Accepts any JSON on the way in, then hands it to the allowlist sanitizer.
 * The stored document is therefore always something the renderer can trust —
 * validation of *shape* alone would still let a crafted payload through.
 */
const richTextContent = z.unknown().transform((value, ctx) => {
	try {
		return sanitizeRichTextContent(value);
	} catch (error) {
		ctx.addIssue({
			code: "custom",
			message:
				error instanceof Error
					? error.message
					: "O conteúdo do editor tem um formato inválido",
		});
		return z.NEVER;
	}
});

const title = z
	.string()
	.trim()
	.min(1, "O título é obrigatório")
	.max(
		MAX_DEDICATION_TITLE_LENGTH,
		`O título não pode exceder ${MAX_DEDICATION_TITLE_LENGTH} caracteres`,
	);

export const createDedicationSchema = z.object({
	title,
	type: z.enum(DEDICATION_TYPES, { message: "Seleccione um tipo" }),
	status: z.enum(DEDICATION_STATUSES).default("NOT_STARTED"),
	content: richTextContent.optional(),
	visibility: z.enum(DEDICATION_VISIBILITIES).default("PRIVATE"),
	/** Only meaningful when `visibility` is SHARED. */
	viewerEventMemberIds: z.array(z.string().min(1)).default([]),
});

export type CreateDedicationInput = z.infer<typeof createDedicationSchema>;

export const updateDedicationSchema = z
	.object({
		title: title.optional(),
		type: z.enum(DEDICATION_TYPES).optional(),
		status: z.enum(DEDICATION_STATUSES).optional(),
		content: richTextContent.optional(),
	})
	.refine(
		(value) =>
			value.title !== undefined ||
			value.type !== undefined ||
			value.status !== undefined ||
			value.content !== undefined,
		{ message: "Nada para actualizar" },
	);

export type UpdateDedicationInput = z.infer<typeof updateDedicationSchema>;

/**
 * Locking and unlocking is a single atomic operation: unlocking without a
 * valid viewer set is rejected so `isLocked = false` can never widen into
 * "everyone in the event".
 */
export const setDedicationVisibilitySchema = z.object({
	isLocked: z.boolean(),
	viewerEventMemberIds: z.array(z.string().min(1)).default([]),
});

export type SetDedicationVisibilityInput = z.infer<
	typeof setDedicationVisibilitySchema
>;

export const addDedicationViewerSchema = z.object({
	eventMemberId: z.string().min(1, "Seleccione um membro do evento"),
});

export type AddDedicationViewerInput = z.infer<
	typeof addDedicationViewerSchema
>;
