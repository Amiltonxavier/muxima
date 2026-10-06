/**
 * The authorization service — the single place that may REJECT a request.
 *
 * The chain every protected operation follows, in order:
 *
 *   1. Authentication   — a valid session (`protectedProcedure` /
 *                        `requireSessionUserId`). Not re-checked here.
 *   2. Account state    — `user.status === ACTIVE`. Checked by the
 *                        middleware on both oRPC and REST.
 *   3. Event access     — an `ACTIVE` `EventMember` row for (user, event).
 *                        `PENDING`/`DECLINED` stop here.
 *   4. Permission       — the membership's role grants the capability
 *                        (`RolePermission`), checked here.
 *   5. Business rule    — `EVENT_LOCKED`, capacity, ownership of the row.
 *
 * Each step throws the standard envelope (`401 UNAUTHORIZED`, `403
 * EVENT_ACCESS_DENIED` / `FORBIDDEN`, `409 EVENT_LOCKED`), so a caller can
 * always distinguish "not yours" from "not allowed" from "not now".
 *
 * Both oRPC routers and REST routes call THESE functions. There is no second
 * policy to keep in sync — which is exactly what allowed REST and oRPC to
 * disagree about who may manage the team.
 */
import type { Permission } from "@muxima/permissions";
import { ForbiddenError, NotFoundError } from "../errors/app-error";
import { ERROR_CODES, EVENT_CODES } from "../errors/codes";
import {
	assertEventIsMutableById,
	getEventIdForResource,
	requireEventAccess,
	requireEventMutable,
	requireEventRole,
} from "./event-access";
import { hasEventPermission } from "./permissions";

export {
	getEventPermissions,
	getEventRole,
	getUserPermissions,
	getUserRoles,
	hasEventPermission,
} from "./permissions";
export {
	getEventIdForResource,
	requireEventAccess,
	requireEventMutable,
	requireEventRole,
};

/**
 * Resolves the event that owns a row, or throws 404.
 *
 * Use this instead of `getEventIdForResource` in every guarded handler. The
 * nullable version invites `if (eventId) { await requireEventPermission(...) }`,
 * and that `if` is an authorization bypass waiting to happen: when the row does
 * not exist the check is SKIPPED rather than passed, so the handler continues
 * unauthenticated. It looks harmless while the only thing after it is an
 * `update` that will throw P2025 — then someone adds a `createMany`, an upsert,
 * or a side effect before the write, and a caller with no rights in any event
 * runs it. A missing row is not a reason to skip the check; it is a 404.
 *
 * Throwing here also keeps the not-found answer identical across entities.
 */
export async function requireEventIdForResource(
	entity: Parameters<typeof getEventIdForResource>[0],
	resourceId: string,
): Promise<string> {
	const eventId = await getEventIdForResource(entity, resourceId);

	if (!eventId) {
		throw new NotFoundError("Recurso não encontrado", {
			code: ERROR_CODES.NOT_FOUND,
		});
	}

	return eventId;
}

/**
 * Requires the user to hold `permission` **in this event**.
 *
 * Event access comes first and is not optional: a permission is meaningless
 * without membership, so `members.update-role` never becomes a global grant.
 * The business rule (`EVENT_LOCKED`) is deliberately NOT applied here — use
 * `requireEventPermissionMutable` for mutations.
 */
export async function requireEventPermission(
	userId: string,
	eventId: string,
	permission: Permission,
): Promise<void> {
	await requireEventAccess(userId, eventId);

	if (await hasEventPermission(userId, eventId, permission)) return;

	throw new ForbiddenError("Não tem permissão para esta operação", {
		code: ERROR_CODES.FORBIDDEN,
	});
}

/**
 * `requireEventPermission` plus the operational lock: the permission says the
 * user *may* do this, the lock says the event is *accepting* it now. Two
 * independent answers, checked in that order.
 */
export async function requireEventPermissionMutable(
	userId: string,
	eventId: string,
	permission: Permission,
): Promise<void> {
	await requireEventPermission(userId, eventId, permission);
	await assertEventIsMutableById(eventId);
}

/**
 * Requires a permission that is NOT scoped to an event (own profile, own
 * notifications, own activity trail). The caller supplies the already-resolved
 * permission set so no extra query is issued.
 */
export function requirePermission(
	permissions: readonly Permission[],
	permission: Permission,
): void {
	if (permissions.includes(permission)) return;

	throw new ForbiddenError("Não tem permissão para esta operação", {
		code: ERROR_CODES.FORBIDDEN,
	});
}

/** Re-exported so callers can build a 403 without importing two modules. */
export const AUTHZ_ERROR_CODES = {
	FORBIDDEN: ERROR_CODES.FORBIDDEN,
	EVENT_ACCESS_DENIED: EVENT_CODES.ACCESS_DENIED,
} as const;
