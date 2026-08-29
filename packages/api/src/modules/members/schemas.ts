import { z } from "zod";

export const addMemberSchema = z.object({
	eventId: z.string().uuid(),
	email: z.string().email(),
	role: z.enum(["PARTNER", "ADMIN", "EDITOR", "VIEWER"]),
});

export const updateMemberRoleSchema = z.object({
	role: z.enum(["PARTNER", "ADMIN", "EDITOR", "VIEWER"]),
});
