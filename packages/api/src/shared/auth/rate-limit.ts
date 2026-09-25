type RateLimiterOptions = {
	limit: number;
	windowMs: number;
};

type RateLimiter = {
	check: (key: string) => void;
};

/**
 * Lightweight in-memory sliding-window rate limiter.
 * Used to protect public (unauthenticated) endpoints from abuse.
 */
export function createMemoryRateLimiter(
	options: RateLimiterOptions,
): RateLimiter {
	const hits = new Map<string, number[]>();

	const check = (key: string): void => {
		const now = Date.now();
		const recent = (hits.get(key) ?? []).filter(
			(timestamp) => now - timestamp < options.windowMs,
		);

		if (recent.length >= options.limit) {
			throw new Error("Demasiadas tentativas. Tente novamente mais tarde.");
		}

		recent.push(now);
		hits.set(key, recent);

		if (hits.size > 10_000) {
			for (const [staleKey, timestamps] of hits) {
				if (
					timestamps.every((timestamp) => now - timestamp >= options.windowMs)
				) {
					hits.delete(staleKey);
				}
			}
		}
	};

	return { check };
}

export const publicInvitationCodeLimiter = createMemoryRateLimiter({
	limit: 30,
	windowMs: 10 * 60 * 1000,
});

export const publicInvitationRespondLimiter = createMemoryRateLimiter({
	limit: 10,
	windowMs: 10 * 60 * 1000,
});
