import {
	PASSWORD_MISMATCH_MESSAGE,
	passwordConfirmationSchema,
	passwordSchema,
} from "@muxima/api/shared/validation/password";
import { z } from "zod";

export const loginSchema = z.object({
	email: z.string().min(1, "Email é obrigatório").email("Email inválido"),
	password: z.string().min(1, "Palavra-passe é obrigatória"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
	.object({
		name: z
			.string()
			.min(1, "Nome é obrigatório")
			.min(2, "Nome deve ter pelo menos 2 caracteres"),
		email: z.string().min(1, "Email é obrigatório").email("Email inválido"),
		password: passwordSchema,
		confirmPassword: passwordConfirmationSchema,
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: PASSWORD_MISMATCH_MESSAGE,
		path: ["confirmPassword"],
	});

export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
	email: z.string().min(1, "Email é obrigatório").email("Email inválido"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
	.object({
		password: passwordSchema,
		confirmPassword: passwordConfirmationSchema,
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: PASSWORD_MISMATCH_MESSAGE,
		path: ["confirmPassword"],
	});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/**
 * The complexity rules come from the shared policy in `@muxima/api` — the same
 * schema the change-password endpoint validates with — so the form can never
 * accept a password the API would reject.
 */
export const changePasswordSchema = z
	.object({
		currentPassword: z.string().min(1, "Palavra-passe atual é obrigatória"),
		newPassword: passwordSchema,
		confirmNewPassword: passwordConfirmationSchema,
	})
	.refine((data) => data.newPassword === data.confirmNewPassword, {
		message: PASSWORD_MISMATCH_MESSAGE,
		path: ["confirmNewPassword"],
	});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const profileSchema = z.object({
	name: z
		.string()
		.min(1, "Nome é obrigatório")
		.min(2, "Nome deve ter pelo menos 2 caracteres"),
	email: z.string().min(1, "Email é obrigatório").email("Email inválido"),
	phone: z
		.string()
		.optional()
		.refine(
			(val) => !val || /^\+?[0-9\s-]{9,}$/.test(val),
			"Telefone inválido",
		),
});

export type ProfileInput = z.infer<typeof profileSchema>;
