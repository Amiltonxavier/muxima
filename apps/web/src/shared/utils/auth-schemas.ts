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
		password: z
			.string()
			.min(1, "Palavra-passe é obrigatória")
			.min(8, "Palavra-passe deve ter pelo menos 8 caracteres")
			.regex(
				/[A-Z]/,
				"Palavra-passe deve conter pelo menos uma letra maiúscula",
			)
			.regex(
				/[a-z]/,
				"Palavra-passe deve conter pelo menos uma letra minúscula",
			)
			.regex(/[0-9]/, "Palavra-passe deve conter pelo menos um número"),
		confirmPassword: z
			.string()
			.min(1, "Confirmação de palavra-passe é obrigatória"),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "As palavras-passe não coincidem",
		path: ["confirmPassword"],
	});

export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
	email: z.string().min(1, "Email é obrigatório").email("Email inválido"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
	.object({
		password: z
			.string()
			.min(1, "Palavra-passe é obrigatória")
			.min(8, "Palavra-passe deve ter pelo menos 8 caracteres")
			.regex(
				/[A-Z]/,
				"Palavra-passe deve conter pelo menos uma letra maiúscula",
			)
			.regex(
				/[a-z]/,
				"Palavra-passe deve conter pelo menos uma letra minúscula",
			)
			.regex(/[0-9]/, "Palavra-passe deve conter pelo menos um número"),
		confirmPassword: z
			.string()
			.min(1, "Confirmação de palavra-passe é obrigatória"),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "As palavras-passe não coincidem",
		path: ["confirmPassword"],
	});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z
	.object({
		currentPassword: z.string().min(1, "Palavra-passe atual é obrigatória"),
		newPassword: z
			.string()
			.min(1, "Nova palavra-passe é obrigatória")
			.min(8, "Palavra-passe deve ter pelo menos 8 caracteres")
			.regex(
				/[A-Z]/,
				"Palavra-passe deve conter pelo menos uma letra maiúscula",
			)
			.regex(
				/[a-z]/,
				"Palavra-passe deve conter pelo menos uma letra minúscula",
			)
			.regex(/[0-9]/, "Palavra-passe deve conter pelo menos um número"),
		confirmNewPassword: z
			.string()
			.min(1, "Confirmação de palavra-passe é obrigatória"),
	})
	.refine((data) => data.newPassword === data.confirmNewPassword, {
		message: "As palavras-passe não coincidem",
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
