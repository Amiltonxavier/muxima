import {
	AppError,
	BadRequestError,
	ConflictError,
	ForbiddenError,
	NotFoundError,
	RateLimitError,
	UnauthorizedError,
	ValidationError,
} from "../errors/app-error";
import { AUTH_CODES, ERROR_CODES, USER_CODES } from "../errors/codes";

/**
 * Better Auth answers with its own envelope (`{ error: { code, message } }`,
 * sometimes with a `status`) and its own English messages. This module is the
 * single boundary that converts those failures into the project contract:
 *
 * - the HTTP status is preserved (401 stays 401, so the web client can still
 *   tell "no session" from a real failure);
 * - the framework code never leaks: each known Better Auth code is translated
 *   into a stable public code (see `AUTH_CODES` / `ERROR_CODES`);
 * - the English message is never forwarded — every user-facing string is
 *   PT-PT, either from the translation table or from a status-based fallback.
 */
interface BetterAuthErrorPayload {
	error?: {
		code?: unknown;
		message?: unknown;
		status?: unknown;
	};
	code?: unknown;
	message?: unknown;
	status?: unknown;
}

interface AuthErrorTranslation {
	statusCode: number;
	code: string;
	message: string;
}

/**
 * Explicit translations for the Better Auth codes reachable by this
 * application. Anything missing falls back to a generic status-based message,
 * so a new Better Auth code can never surface an English string.
 */
const AUTH_ERROR_TRANSLATIONS: Readonly<Record<string, AuthErrorTranslation>> =
	{
		INVALID_EMAIL_OR_PASSWORD: {
			statusCode: 401,
			code: AUTH_CODES.INVALID_CREDENTIALS,
			message: "Email ou palavra-passe incorretos.",
		},
		CREDENTIAL_ACCOUNT_NOT_FOUND: {
			statusCode: 401,
			code: AUTH_CODES.INVALID_CREDENTIALS,
			message: "Email ou palavra-passe incorretos.",
		},
		EMAIL_NOT_VERIFIED: {
			statusCode: 403,
			code: AUTH_CODES.EMAIL_NOT_VERIFIED,
			message: "Confirme o seu email antes de iniciar sessão.",
		},
		USER_BANNED: {
			statusCode: 403,
			code: ERROR_CODES.ACCOUNT_BLOCKED,
			message:
				"A tua conta está bloqueada. Contacta o suporte para a desbloquear.",
		},
		INVALID_TOKEN: {
			statusCode: 401,
			code: AUTH_CODES.INVALID_TOKEN,
			message: "O token enviado não é válido.",
		},
		TOKEN_EXPIRED: {
			statusCode: 401,
			code: AUTH_CODES.INVALID_TOKEN,
			message: "O token enviado expirou.",
		},
		SESSION_EXPIRED: {
			statusCode: 401,
			code: AUTH_CODES.SESSION_EXPIRED,
			message: "A sessão expirou. Inicia sessão novamente para continuar.",
		},
		ACCESS_TOKEN_NOT_FOUND: {
			statusCode: 401,
			code: AUTH_CODES.INVALID_TOKEN,
			message: "Não foi encontrada uma sessão válida para esta operação.",
		},
		REFRESH_TOKEN_NOT_FOUND: {
			statusCode: 401,
			code: AUTH_CODES.INVALID_TOKEN,
			message: "Não foi encontrada uma sessão válida para esta operação.",
		},
		INVALID_PASSWORD: {
			statusCode: 400,
			code: AUTH_CODES.INVALID_PASSWORD,
			message: "A palavra-passe não é válida.",
		},
		PASSWORD_TOO_SHORT: {
			statusCode: 422,
			code: AUTH_CODES.PASSWORD_TOO_SHORT,
			message: "A palavra-passe é demasiado curta.",
		},
		PASSWORD_TOO_LONG: {
			statusCode: 422,
			code: AUTH_CODES.PASSWORD_TOO_LONG,
			message: "A palavra-passe é demasiado longa.",
		},
		INVALID_EMAIL: {
			statusCode: 422,
			code: AUTH_CODES.INVALID_EMAIL,
			message: "O formato do email é inválido.",
		},
		USER_ALREADY_EXISTS: {
			statusCode: 409,
			code: USER_CODES.EMAIL_ALREADY_IN_USE,
			message: "Já existe uma conta com este email.",
		},
		USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: {
			statusCode: 409,
			code: USER_CODES.EMAIL_ALREADY_IN_USE,
			message: "Já existe uma conta com este email. Utiliza outro email.",
		},
		EMAIL_ALREADY_VERIFIED: {
			statusCode: 409,
			code: AUTH_CODES.EMAIL_NOT_VERIFIED,
			message: "Este email já foi confirmado.",
		},
		USER_NOT_FOUND: {
			statusCode: 404,
			code: USER_CODES.NOT_FOUND,
			message: "Utilizador não encontrado.",
		},
		USER_EMAIL_NOT_FOUND: {
			statusCode: 404,
			code: USER_CODES.NOT_FOUND,
			message: "Utilizador não encontrado.",
		},
		INVALID_USER: {
			statusCode: 400,
			code: AUTH_CODES.INVALID_CREDENTIALS,
			message: "Os dados da conta são inválidos.",
		},
		ACCOUNT_NOT_FOUND: {
			statusCode: 404,
			code: AUTH_CODES.ACCOUNT_NOT_FOUND,
			message: "Conta não encontrada.",
		},
		INVALID_ORIGIN: {
			statusCode: 403,
			code: AUTH_CODES.ORIGIN_NOT_ALLOWED,
			message: "A origem do pedido não é permitida.",
		},
		MISSING_OR_NULL_ORIGIN: {
			statusCode: 403,
			code: AUTH_CODES.ORIGIN_NOT_ALLOWED,
			message: "A origem do pedido não é permitida.",
		},
		CROSS_SITE_NAVIGATION_LOGIN_BLOCKED: {
			statusCode: 403,
			code: AUTH_CODES.ORIGIN_NOT_ALLOWED,
			message: "O pedido de início de sessão foi bloqueado por segurança.",
		},
		INVALID_CALLBACK_URL: {
			statusCode: 400,
			code: AUTH_CODES.CALLBACK_URL_INVALID,
			message: "O endereço de redirecionamento não é válido.",
		},
		INVALID_REDIRECT_URL: {
			statusCode: 400,
			code: AUTH_CODES.CALLBACK_URL_INVALID,
			message: "O endereço de redirecionamento não é válido.",
		},
		INVALID_ERROR_CALLBACK_URL: {
			statusCode: 400,
			code: AUTH_CODES.CALLBACK_URL_INVALID,
			message: "O endereço de redirecionamento não é válido.",
		},
		INVALID_NEW_USER_CALLBACK_URL: {
			statusCode: 400,
			code: AUTH_CODES.CALLBACK_URL_INVALID,
			message: "O endereço de redirecionamento não é válido.",
		},
		CALLBACK_URL_REQUIRED: {
			statusCode: 400,
			code: AUTH_CODES.CALLBACK_URL_INVALID,
			message: "É necessário indicar um endereço de redirecionamento.",
		},
		INVALID_CALLBACK_REQUEST: {
			statusCode: 400,
			code: AUTH_CODES.CALLBACK_URL_INVALID,
			message: "O pedido de autenticação não é válido.",
		},
		SOCIAL_ACCOUNT_ALREADY_LINKED: {
			statusCode: 409,
			code: AUTH_CODES.ACCOUNT_ALREADY_LINKED,
			message: "Esta conta social já está associada.",
		},
		LINKED_ACCOUNT_ALREADY_EXISTS: {
			statusCode: 409,
			code: AUTH_CODES.ACCOUNT_ALREADY_LINKED,
			message: "Esta conta já está associada a outro utilizador.",
		},
		FAILED_TO_UNLINK_LAST_ACCOUNT: {
			statusCode: 400,
			code: AUTH_CODES.CANNOT_UNLINK_LAST_ACCOUNT,
			message: "Não é possível remover a única conta associada.",
		},
		USER_ALREADY_HAS_PASSWORD: {
			statusCode: 409,
			code: AUTH_CODES.ACCOUNT_ALREADY_LINKED,
			message: "Esta conta já tem uma palavra-passe associada.",
		},
		PASSWORD_ALREADY_SET: {
			statusCode: 409,
			code: AUTH_CODES.ACCOUNT_ALREADY_LINKED,
			message: "Esta conta já tem uma palavra-passe associada.",
		},
		EMAIL_CAN_NOT_BE_UPDATED: {
			statusCode: 400,
			code: USER_CODES.EMAIL_ALREADY_IN_USE,
			message: "O email da conta não pode ser alterado.",
		},
		CHANGE_EMAIL_DISABLED: {
			statusCode: 403,
			code: ERROR_CODES.FORBIDDEN,
			message: "A alteração de email não está disponível.",
		},
		RESET_PASSWORD_DISABLED: {
			statusCode: 403,
			code: ERROR_CODES.FORBIDDEN,
			message: "A recuperação de palavra-passe não está disponível.",
		},
		EMAIL_PASSWORD_DISABLED: {
			statusCode: 403,
			code: ERROR_CODES.FORBIDDEN,
			message:
				"O início de sessão com email e palavra-passe não está disponível.",
		},
		EMAIL_PASSWORD_SIGN_UP_DISABLED: {
			statusCode: 403,
			code: ERROR_CODES.FORBIDDEN,
			message: "O registo com email e palavra-passe não está disponível.",
		},
		VERIFICATION_EMAIL_NOT_ENABLED: {
			statusCode: 403,
			code: ERROR_CODES.FORBIDDEN,
			message: "A confirmação de email não está disponível.",
		},
		FIELD_NOT_ALLOWED: {
			statusCode: 403,
			code: ERROR_CODES.FORBIDDEN,
			message: "Este campo não pode ser alterado.",
		},
		BODY_MUST_BE_AN_OBJECT: {
			statusCode: 422,
			code: ERROR_CODES.VALIDATION_ERROR,
			message: "Os dados enviados são inválidos.",
		},
		MISSING_FIELD: {
			statusCode: 422,
			code: ERROR_CODES.VALIDATION_ERROR,
			message: "Faltam campos obrigatórios no pedido.",
		},
		VALIDATION_ERROR: {
			statusCode: 422,
			code: ERROR_CODES.VALIDATION_ERROR,
			message: "Os dados enviados são inválidos.",
		},
		PROVIDER_NOT_CONFIGURED: {
			statusCode: 400,
			code: ERROR_CODES.BAD_REQUEST,
			message: "O método de autenticação pedido não está configurado.",
		},
		PROVIDER_NOT_SUPPORTED: {
			statusCode: 400,
			code: ERROR_CODES.BAD_REQUEST,
			message: "O método de autenticação pedido não é suportado.",
		},
		TOO_MANY_REQUESTS: {
			statusCode: 429,
			code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
			message:
				"Demasiadas tentativas. Tente novamente dentro de alguns instantes.",
		},
		TOO_MANY_REQUESTS_ERROR_CODE: {
			statusCode: 429,
			code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
			message:
				"Demasiadas tentativas. Tente novamente dentro de alguns instantes.",
		},
		PROVIDER_ERROR: {
			statusCode: 400,
			code: ERROR_CODES.BAD_REQUEST,
			message: "Não foi possível concluir o pedido com o serviço externo.",
		},
		OAUTH_LINK_ERROR: {
			statusCode: 400,
			code: ERROR_CODES.BAD_REQUEST,
			message: "Não foi possível associar a conta externa.",
		},
		LINKING_NOT_ALLOWED: {
			statusCode: 403,
			code: ERROR_CODES.FORBIDDEN,
			message: "Não é possível associar contas nesta conta.",
		},
		LINKING_DIFFERENT_EMAILS_NOT_ALLOWED: {
			statusCode: 400,
			code: ERROR_CODES.BAD_REQUEST,
			message: "A conta externa tem um email diferente do desta conta.",
		},
		LINKING_FAILED: {
			statusCode: 400,
			code: ERROR_CODES.BAD_REQUEST,
			message: "Não foi possível associar a conta externa.",
		},
		EMAIL_MISMATCH: {
			statusCode: 400,
			code: ERROR_CODES.BAD_REQUEST,
			message: "O email indicado não corresponde ao da conta.",
		},
		SESSION_NOT_FRESH: {
			statusCode: 401,
			code: AUTH_CODES.SESSION_EXPIRED,
			message: "A sessão expirou. Inicia sessão novamente para continuar.",
		},
		USER_DELETED: {
			statusCode: 401,
			code: AUTH_CODES.SESSION_EXPIRED,
			message: "A sessão expirou. Inicia sessão novamente para continuar.",
		},
	};

/** Generic PT-PT messages for codes with no explicit translation. */
function fallbackForStatus(statusCode: number): AppError {
	if (statusCode === 401) return new UnauthorizedError();
	if (statusCode === 403) return new ForbiddenError();
	if (statusCode === 404) return new NotFoundError();
	if (statusCode === 409) return new ConflictError();
	if (statusCode === 422)
		return new ValidationError("Os dados enviados são inválidos.");
	if (statusCode === 429) return new RateLimitError();
	if (statusCode >= 500) {
		// Keep the original 5xx status (503 vs 500 matters to clients and to
		// upstream monitoring) but never the original message.
		return new AppError(
			"Ocorreu um erro interno. Tente novamente mais tarde.",
			statusCode >= 500 && statusCode <= 599 ? statusCode : 500,
			ERROR_CODES.INTERNAL_SERVER_ERROR,
		);
	}
	return new BadRequestError(
		"Não foi possível processar o pedido. Verifique os dados enviados.",
	);
}

/**
 * Normalises a Better Auth error body into an `AppError`.
 *
 * @param payload Parsed JSON body returned by `auth.handler` (may be null).
 * @param status HTTP status returned by Better Auth.
 */
export function mapBetterAuthError(
	payload: BetterAuthErrorPayload | null,
	status: number,
): AppError {
	const error = payload?.error ?? payload ?? {};
	const rawCode = error.code;
	const code =
		typeof rawCode === "string" && rawCode.trim() ? rawCode.trim() : undefined;

	const translation = code ? AUTH_ERROR_TRANSLATIONS[code] : undefined;

	// Our own `databaseHooks` throw with a PT-PT message and a project code; keep
	// it verbatim instead of rewriting it to a generic 403.
	if (
		code === ERROR_CODES.ACCOUNT_BLOCKED &&
		typeof error.message === "string" &&
		error.message.trim()
	) {
		return new ForbiddenError(error.message, {
			code: ERROR_CODES.ACCOUNT_BLOCKED,
		});
	}

	if (translation) {
		return new AppError(
			translation.message,
			translation.statusCode,
			translation.code,
		);
	}

	return fallbackForStatus(status);
}
