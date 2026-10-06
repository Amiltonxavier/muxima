import { createHash } from "node:crypto";
import { RateLimitError } from "../errors/app-error";

const SECOND = 1_000;
const MINUTE = 60 * SECOND;

type Window = {
	/** Requests allowed inside `windowMs`. */
	limit: number;
	windowMs: number;
};

type RateLimiterOptions = Window & {
	/**
	 * Optional tighter short window checked IN ADDITION to the sustained one.
	 * Both have to be respected, so a client cannot flatten a 10/min budget
	 * into a single second — it is what makes the limiter burst-aware without
	 * a second, parallel implementation.
	 */
	burst?: Window;
};

type RateLimiter = {
	check: (key: string) => void;
	/** Number of tracked keys. Only used by the tests to observe cleanup. */
	size: () => number;
};

/** Stale keys are swept once the map grows past this many entries. */
const MAX_TRACKED_KEYS = 10_000;

/**
 * Lightweight in-memory sliding-window rate limiter.
 *
 * The window is sliding (per-key timestamps) rather than fixed, so a client
 * cannot line up on a window boundary to double its real throughput.
 *
 * When the limit is exceeded a `RateLimitError` is thrown carrying
 * `retryAfterSeconds` — the time until the oldest hit of the violated window
 * leaves it. That value is what the REST error handler and the oRPC error
 * mapper turn into the `Retry-After` response header.
 */
export function createMemoryRateLimiter(
	options: RateLimiterOptions,
): RateLimiter {
	const hits = new Map<string, number[]>();
	// One pass prunes everything: entries are only kept while they can still
	// count towards a window that is actually enforced.
	const maxWindowMs = Math.max(options.windowMs, options.burst?.windowMs ?? 0);

	const within = (timestamps: number[], windowMs: number, now: number) =>
		timestamps.filter((timestamp) => now - timestamp < windowMs);

	const check = (key: string): void => {
		const now = Date.now();
		const recent = hits.get(key) ?? [];
		const alive = within(recent, maxWindowMs, now);

		const sustained = within(alive, options.windowMs, now);
		const sustainedOldest = sustained[0];
		if (sustained.length >= options.limit && sustainedOldest !== undefined) {
			throw new RateLimitError(undefined, {
				retryAfterSeconds: retryAfterSeconds(
					sustainedOldest,
					options.windowMs,
					now,
				),
			});
		}

		if (options.burst) {
			const burst = within(alive, options.burst.windowMs, now);
			const burstOldest = burst[0];
			if (burst.length >= options.burst.limit && burstOldest !== undefined) {
				throw new RateLimitError(undefined, {
					retryAfterSeconds: retryAfterSeconds(
						burstOldest,
						options.burst.windowMs,
						now,
					),
				});
			}
		}

		alive.push(now);
		hits.set(key, alive);

		if (hits.size > MAX_TRACKED_KEYS) {
			for (const [staleKey, timestamps] of hits) {
				const kept = within(timestamps, maxWindowMs, now);
				if (kept.length === 0) hits.delete(staleKey);
				else if (kept.length !== timestamps.length) hits.set(staleKey, kept);
			}
		}
	};

	return { check, size: () => hits.size };
}

/** Seconds until `oldest` leaves its window; never 0 (0 reads as "retry now"). */
function retryAfterSeconds(oldest: number, windowMs: number, now: number) {
	return Math.max(1, Math.ceil((oldest + windowMs - now) / SECOND));
}

/**
 * Builds the bucket key, i.e. the FULL context of the operation:
 *
 *   endpoint + HTTP method + IP + user
 *
 * Public endpoints only differ by IP, authenticated ones by user AND IP (the
 * same account from two networks gets two budgets; two accounts behind the
 * same NAT never share one). The endpoint is part of the key, so a noisy
 * endpoint cannot burn the budget of an unrelated one — which is exactly what
 * a single global counter would do.
 */
export function rateLimitKey(parts: {
	endpoint: string;
	method?: string;
	ip?: string | null;
	userId?: string | null;
}): string {
	return [
		parts.endpoint,
		parts.method ?? "*",
		`ip=${parts.ip ?? "unknown"}`,
		`user=${parts.userId ?? "anon"}`,
	].join("|");
}

const SESSION_COOKIE = "better-auth.session_token";

/**
 * Stable per-request identity WITHOUT a database round-trip: the Better Auth
 * session cookie (web) or bearer token (native), hashed so a secret never
 * ends up in a key. `null` means anonymous.
 *
 * Used by the transport-level backstop in `app.ts`, which runs before the
 * session is resolved — the handlers that can read `context.session.user.id`
 * should use `rateLimitKey` with the real user id instead.
 */
export function sessionIdentity(headers: {
	cookie?: string;
	authorization?: string;
}): string | null {
	const authorization = headers.authorization;
	if (authorization?.startsWith("Bearer ")) return hash(authorization.slice(7));

	const cookie = headers.cookie;
	if (!cookie) return null;
	const entry = cookie
		.split(";")
		.map((part) => part.trim())
		.find((part) => part.startsWith(`${SESSION_COOKIE}=`));
	if (!entry) return null;
	return hash(entry.slice(SESSION_COOKIE.length + 1));
}

function hash(value: string): string {
	return createHash("sha1").update(value).digest("hex").slice(0, 16);
}

/**
 * Central rate-limit policy — the ONLY place a threshold is written down.
 *
 * Base table (docs/rate-limit-role.md):
 *
 *   GET/listagens 120/min · GET pesado 30/min · POST/PATCH 30/min · DELETE 20/min
 *   Login 5/min · Login falhado 10/15min · Password reset 3/15min · Email/OTP 5/15min
 *   Bulk/Publish 10/min · Export PDF/XLSX 5/min · Upload 10/min
 *
 * Call sites reference a policy name and pass `rateLimitKey`; they never
 * repeat a number, so tuning a limit is a one-line change here.
 */
export const RATE_LIMITS = {
	/**
	 * Public reads, classified by cost instead of all sharing one budget:
	 * the code lookup is a cheap projection (highest volume), the schedule
	 * aggregates tasks + schedules (lower volume).
	 */
	publicInvitationGetByCode: { limit: 100, windowMs: 10 * MINUTE },
	publicInvitationSchedule: { limit: 60, windowMs: 10 * MINUTE },

	/** Public writes: state changes on somebody else's invitation. */
	publicInvitationRespond: {
		limit: 10,
		windowMs: 10 * MINUTE,
		burst: { limit: 5, windowMs: 10 * SECOND },
	},

	/**
	 * Public PDF render: the CPU cost is the risk, so it is far below the
	 * lookup it mirrors and guarded against bursts.
	 */
	publicInvitationExport: {
		limit: 10,
		windowMs: 10 * MINUTE,
		burst: { limit: 3, windowMs: 10 * SECOND },
	},

	/** Private exports (PDF/XLSX): 5/min, plus a short burst guard. */
	export: {
		limit: 5,
		windowMs: MINUTE,
		burst: { limit: 3, windowMs: 10 * SECOND },
	},

	/** Bulk/Publish: one call can fan out to hundreds of rows. */
	publish: { limit: 10, windowMs: MINUTE },
} as const satisfies Record<string, RateLimiterOptions>;

/** Public invitation: read-only lookup by code. */
export const publicInvitationCodeLimiter = createMemoryRateLimiter(
	RATE_LIMITS.publicInvitationGetByCode,
);

/** Public invitation: read-only programme of the event (heavier read). */
export const publicInvitationScheduleLimiter = createMemoryRateLimiter(
	RATE_LIMITS.publicInvitationSchedule,
);

/** Public invitation: writing a response on behalf of a guest. */
export const publicInvitationRespondLimiter = createMemoryRateLimiter(
	RATE_LIMITS.publicInvitationRespond,
);

/**
 * PDF export of an invitation (F-18): public, unauthenticated and expensive.
 * One shared instance serves both export routes — the endpoint is part of the
 * key, so their budgets never mix.
 */
export const publicInvitationExportLimiter = createMemoryRateLimiter(
	RATE_LIMITS.publicInvitationExport,
);

/** Private PDF/XLSX exports, keyed by user + IP. */
export const exportLimiter = createMemoryRateLimiter(RATE_LIMITS.export);

/** Bulk/publish fan-outs, keyed by user + IP. */
export const publishLimiter = createMemoryRateLimiter(RATE_LIMITS.publish);
