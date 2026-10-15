/**
 * Socket.IO server, attached to the SAME HTTP server Fastify already listens
 * on — one port, one origin, no second service to keep in sync.
 *
 * Authentication reuses the Better Auth session exactly like the oRPC context
 * (`createContext`): the handshake cookies are replayed into
 * `auth.api.getSession`. A `userId` sent by the client is NEVER trusted — the
 * identity comes from the session only, and each user joins their own private
 * room (`user:{id}`), so a client can only ever receive what the backend emits
 * to that room.
 */

import type { Server as HttpServer } from "node:http";
import { auth } from "@muxima/auth";
import db from "@muxima/db";
import { env } from "@muxima/env/server";
import { fromNodeHeaders } from "better-auth/node";
import { Server } from "socket.io";
import { REALTIME_EVENTS, setRealtimeServer, userRoom } from "./index";

export function attachRealtime(httpServer: HttpServer): Server {
	const io = new Server(httpServer, {
		// Same allow-list as the REST CORS; credentials are required so the
		// session cookie travels with the WebSocket handshake.
		cors: {
			origin: env.CORS_ORIGIN,
			credentials: true,
		},
	});

	io.use(async (socket, next) => {
		try {
			const headers = fromNodeHeaders(socket.request.headers);
			const session = await auth.api.getSession({ headers });
			if (!session?.user?.id) {
				next(new Error("UNAUTHORIZED"));
				return;
			}
			socket.data.userId = session.user.id;
			next();
		} catch {
			next(new Error("UNAUTHORIZED"));
		}
	});

	io.on("connection", async (socket) => {
		const userId = socket.data.userId as string;
		await socket.join(userRoom(userId));

		// Recover the count on (re)connect: a client that missed events while
		// offline gets the persisted truth immediately.
		try {
			const count = await db.notification.count({
				where: { userId, readAt: null },
			});
			socket.emit(REALTIME_EVENTS.UNREAD_COUNT, count);
		} catch {
			// A transient DB error must not drop the connection.
		}
	});

	setRealtimeServer(io);
	return io;
}
