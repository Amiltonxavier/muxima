/**
 * The single rule that decides whether an account is allowed to hold a session.
 *
 * It is applied in two places that must never diverge:
 *
 *   - `createAuth`'s `session.create.before` hook — a session can never be
 *     *created* for a blocked or not-yet-verified account, whatever endpoint
 *     (email/password, OTP, OAuth) tried to start it;
 *   - `@muxima/api`'s `requireActiveUser` middleware — an already-issued
 *     session that later becomes invalid stops working immediately.
 *
 * Keeping the messages and the decision here means the auth instance and the
 * API surface share one origin instead of two copies of the policy.
 */

export const BLOCKED_USER_MESSAGE =
	"A tua conta está bloqueada. Contacta o suporte para a desbloquear.";

export const UNVERIFIED_USER_MESSAGE =
	"Confirma o teu e-mail antes de iniciar sessão. Enviámos-te um link de confirmação válido durante 1 hora.";

export type SessionGateUser = {
	status?: string | null;
	emailVerified?: boolean | null;
} | null;

export type SessionGateDecision =
	| { allowed: true }
	| {
			allowed: false;
			/** Better Auth error code translated to PT-PT at the API boundary. */
			code: "ACCOUNT_BLOCKED" | "EMAIL_NOT_VERIFIED";
			message: string;
	  };

/**
 * A user is allowed to sign in only when the account is neither blocked nor
 * awaiting e-mail confirmation. `emailVerified === false` is the inactive
 * marker Better Auth sets on every new account; `undefined`/`null` (rows that
 * predate the flag, or partial selects) are treated as verified so the rule
 * never locks out accounts it has no information about.
 */
export function evaluateSessionGate(
	user: SessionGateUser,
): SessionGateDecision {
	if (user?.status === "BLOCKED") {
		return {
			allowed: false,
			code: "ACCOUNT_BLOCKED",
			message: BLOCKED_USER_MESSAGE,
		};
	}

	if (user && user.emailVerified === false) {
		return {
			allowed: false,
			code: "EMAIL_NOT_VERIFIED",
			message: UNVERIFIED_USER_MESSAGE,
		};
	}

	return { allowed: true };
}
