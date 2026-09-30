import { z } from "zod";

/**
 * The application's password policy, in one place.
 *
 * Better Auth only enforces length (`minPasswordLength`, 8 by default), so the
 * complexity rules below are ours to enforce. They live here — in the API
 * package — because that is where they must hold: the web app imports this
 * same schema for its forms, so the client and the server can never drift into
 * accepting on one side what the other rejects.
 *
 * The messages are the ones the auth screens already display; sharing the
 * schema means the sign-up, reset and change-password forms all say exactly
 * the same thing.
 */
export const PASSWORD_MIN_LENGTH = 8;

/** A new/chosen password. Reused by sign-up, reset and change-password. */
export const passwordSchema = z
	.string()
	.min(1, "Palavra-passe é obrigatória")
	.min(
		PASSWORD_MIN_LENGTH,
		`Palavra-passe deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres`,
	)
	.regex(/[A-Z]/, "Palavra-passe deve conter pelo menos uma letra maiúscula")
	.regex(/[a-z]/, "Palavra-passe deve conter pelo menos uma letra minúscula")
	.regex(/[0-9]/, "Palavra-passe deve conter pelo menos um número");

/** The confirmation field shared by all three password forms. */
export const passwordConfirmationSchema = z
	.string()
	.min(1, "Confirmação de palavra-passe é obrigatória");

/** Reported by every form when the two entries disagree. */
export const PASSWORD_MISMATCH_MESSAGE = "As palavras-passe não coincidem";
