import { z } from "zod";

/** Public invitation token. Case-insensitive, uppercased before any lookup. */
export const invitationCodeSchema = z
	.string()
	.trim()
	.min(1)
	.max(40)
	.transform((code) => code.toUpperCase());

export const invitationResponseSchema = z.enum(["CONFIRM", "DECLINE", "MAYBE"]);

export const invitationResponseFilterSchema = z
	.enum([
		"ALL",
		"CONFIRM",
		"DECLINE",
		"MAYBE",
		"PENDING",
		"EXPIRED",
		"CANCELLED",
	])
	.optional()
	.default("ALL");

/** Safety net for bulk operations — avoids unbounded `IN (...)` queries. */
export const MAX_BULK_INVITATION_IDS = 200;
