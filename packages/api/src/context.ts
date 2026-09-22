import type { IncomingHttpHeaders } from "node:http";

import { auth } from "@muxima/auth";
import { fromNodeHeaders } from "better-auth/node";

export async function createContext(
	req: IncomingHttpHeaders,
	extra?: { ip?: string },
) {
	const session = await auth.api.getSession({
		headers: fromNodeHeaders(req),
	});
	return {
		auth: null,
		session,
		ip: extra?.ip,
	};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
