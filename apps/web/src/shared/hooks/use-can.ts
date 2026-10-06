import { PERMISSIONS, type Permission } from "@muxima/permissions";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

/**
 * Client-side permission checks.
 *
 * Read this before using it: these hooks decide what to DRAW, never what is
 * ALLOWED. The server re-checks every one of these capabilities in
 * `shared/auth/authorization.ts`, so a stale browser cache can show a button
 * that then fails with 403 — never the reverse. Hiding a button the user may
 * use is a bug; showing one they may not is an inconvenience.
 *
 * Two sources, and picking the wrong one is the mistake this file exists to
 * prevent:
 *
 * - `useCan` reads the SESSION payload: the union of every ACTIVE membership.
 *   Correct for account-level surfaces (own profile, own notifications, the
 *   sidebar's profile link) and wrong for anything inside an event.
 * - `useEventAccess` reads `events.getMyAccess`: the caller's role and grants
 *   in ONE event. Correct for every action taken while an event is open, and
 *   required, because a user who owns one event and only views another would
 *   otherwise be offered `events.delete` on the event they can merely view.
 *
 * The permission keys are typed, so a typo is a compile error rather than a
 * control that silently never appears.
 */

/** How long the caller may wait before the UI gives up and renders nothing. */
const STALE_MS = 30_000;

export const accessKeys = {
	/** Every event-access entry — invalidate after any team/role change. */
	all: ["event-access"] as const,
	byEvent: (eventId: string) => ["event-access", eventId] as const,
};

/**
 * The caller's role and permissions in a single event.
 *
 * Returns an empty set while loading rather than an empty final answer, and the
 * hooks below treat "unknown" as "not yet" — so a control never flashes into
 * view for a user who cannot use it.
 */
export function useEventAccess(eventId: string | undefined) {
	const query = useQuery({
		...orpc.events.getMyAccess.queryOptions({
			input: { id: eventId ?? "" },
		}),
		queryKey: accessKeys.byEvent(eventId ?? ""),
		enabled: Boolean(eventId),
		staleTime: STALE_MS,
	});

	const permissions = query.data?.permissions;

	return {
		role: query.data?.role ?? null,
		permissions: (permissions ?? []) as Permission[],
		/** True while the answer is still unknown. */
		isLoading: query.isLoading,
	};
}

/**
 * Whether the caller holds every one of `permissions` in this event.
 *
 * `!isLoading` is part of the answer on purpose: an unknown answer renders as
 * "no" so a control cannot flash into view and then fail with 403.
 */
export function useEventCan(
	eventId: string | undefined,
	...permissions: Permission[]
): boolean {
	const { permissions: granted, isLoading } = useEventAccess(eventId);

	return !isLoading && permissions.every((p) => granted.includes(p));
}

/**
 * The session's permission set — the union across every event.
 *
 * Only for account-level surfaces. Inside an event use `useEventCan`, or a
 * member who owns a different event will be shown actions they do not have.
 */
export function useCan(...permissions: Permission[]): boolean {
	const granted = useAccountPermissions();

	return permissions.every((p) => granted.includes(p));
}

/**
 * The caller's permissions for ACCOUNT-level surfaces, read from the session.
 *
 * No request is made: `customSession` in `packages/auth` already puts
 * `permissions` and `roles` on the session payload, and the sidebar already
 * subscribes to it — so a second fetch of `users.getProfile` here would buy
 * nothing but a round trip.
 *
 * The cast is checked at runtime rather than asserted, because `authClient` is
 * built without the server's type inference (importing `createAuth()` into the
 * web bundle would pull Prisma in). A payload that is not an array of strings
 * degrades to "no permissions", which hides a control; trusting it blindly
 * could show one.
 */
export function useAccountPermissions(): Permission[] {
	const { data: session } = authClient.useSession();
	const raw = (session?.user as { permissions?: unknown } | undefined)
		?.permissions;

	if (!Array.isArray(raw)) return [];

	return raw.filter((value): value is Permission => typeof value === "string");
}

/** Whether the caller holds at least one of `permissions` in this event. */
export function useEventCanAny(
	eventId: string | undefined,
	...permissions: Permission[]
): boolean {
	const { permissions: granted, isLoading } = useEventAccess(eventId);

	return !isLoading && permissions.some((p) => granted.includes(p));
}

/** Convenience for the permissions most event screens need to gate on. */
export { PERMISSIONS };
