/**
 * Realtime emit registry.
 *
 * This module is intentionally free of any `socket.io` import: it only holds a
 * reference to the already-constructed server. That keeps the notification
 * service (and every unit test that imports it) from pulling a network server
 * into a test process — when no server is attached, every `emit` is a no-op.
 *
 * The server is attached once, from `apps/server`, after Fastify has created
 * its underlying HTTP server (`./server.ts` -> `attachRealtime`).
 */
import type { Server } from "socket.io";

/** Socket.IO event names — the wire contract shared with the web client. */
export const REALTIME_EVENTS = {
	NEW: "notification:new",
	READ: "notification:read",
	READ_ALL: "notification:read-all",
	UNREAD_COUNT: "notification:unread-count",
} as const;

let server: Server | null = null;

/** The private room every socket of one user joins. */
export function userRoom(userId: string): string {
	return `user:${userId}`;
}

export function setRealtimeServer(next: Server | null): void {
	server = next;
}

export function getRealtimeServer(): Server | null {
	return server;
}

/** Emit an event to every live socket of one user. No-op when not attached. */
export function emitToUser(
	userId: string,
	event: string,
	payload: unknown,
): void {
	server?.to(userRoom(userId)).emit(event, payload);
}

/** Emit to several distinct users, never sending twice to the same one. */
export function emitToUsers(
	userIds: readonly string[],
	event: string,
	payload: unknown,
): void {
	for (const userId of new Set(userIds)) {
		emitToUser(userId, event, payload);
	}
}

/**
 * Push the recipient's current unread count. Reads it from the database rather
 * than trusting a client-supplied number, so every device converges on the
 * same persisted value.
 */
export async function emitUnreadCount(userId: string): Promise<void> {
	if (!server) return;
	const { default: db } = await import("@muxima/db");
	const count = await db.notification.count({
		where: { userId, readAt: null },
	});
	server.to(userRoom(userId)).emit(REALTIME_EVENTS.UNREAD_COUNT, count);
}
