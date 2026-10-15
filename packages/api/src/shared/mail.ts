/**
 * Mail support helpers shared by every router that sends a transactional
 * e-mail.
 *
 * URLs are built here, on the server, from the public base URL (the same one
 * invitation QR codes use) so the e-mail always points at the frontend origin
 * the environment is actually running — never a hardcoded host.
 */
import type { MemberRole } from "@muxima/db/prisma";
import type { AccessRoleId } from "@muxima/permissions";
import {
	getRolePermissions,
	permissionName,
	ROLE_NAMES,
} from "@muxima/permissions";
import { getPublicBaseUrl } from "../modules/invitations/qr-code";

function joinUrl(path: string): string {
	const base = getPublicBaseUrl();
	return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}

/** Public page where an invited user accepts/declines the member invitation. */
export function memberInvitePageUrl(token: string): string {
	return joinUrl(`/invite/member/${encodeURIComponent(token)}`);
}

/** Same page, expressing a refusal — the page still asks for confirmation. */
export function memberInviteDeclineUrl(token: string): string {
	return `${memberInvitePageUrl(token)}?respond=decline`;
}

export function eventPageUrl(eventId: string): string {
	return joinUrl(`/events/${eventId}`);
}

export function eventBudgetPageUrl(eventId: string): string {
	return joinUrl(`/events/${eventId}/budget`);
}

/** Humanized PT-PT label for a `MemberRole` (used in e-mail copy). */
export function roleLabel(role: MemberRole): string {
	return ROLE_NAMES[role as AccessRoleId] ?? role;
}

/** Humanized PT-PT labels for every permission a role grants. */
export function rolePermissionLabels(role: MemberRole): string[] {
	return getRolePermissions(role as AccessRoleId).map(permissionName);
}

/** Humanized PT-PT date for event copy (e.g. "12 de dezembro de 2026"). */
export function formatEventDate(value: Date | null): string | undefined {
	if (!value) return undefined;
	return value.toLocaleDateString("pt-PT", {
		day: "numeric",
		month: "long",
		year: "numeric",
	});
}
