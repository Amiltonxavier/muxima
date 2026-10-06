import type { FastifyReply, FastifyRequest } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppError, RateLimitError } from "../errors/app-error";
import { errorHandler } from "../errors/error-handler";
import {
	createMemoryRateLimiter,
	rateLimitKey,
	sessionIdentity,
} from "./rate-limit";

afterEach(() => {
	vi.useRealTimers();
});

function at(nowMs: number) {
	vi.useFakeTimers();
	vi.setSystemTime(nowMs);
}

describe("createMemoryRateLimiter", () => {
	it("allows requests below the limit", () => {
		const limiter = createMemoryRateLimiter({ limit: 3, windowMs: 60_000 });
		for (let i = 0; i < 3; i++) {
			expect(() => limiter.check("ip=A|user=anon")).not.toThrow();
		}
	});

	it("allows exactly at the limit (the limit-th request passes)", () => {
		const limiter = createMemoryRateLimiter({ limit: 3, windowMs: 60_000 });
		for (let i = 0; i < 2; i++) limiter.check("ip=A|user=anon");
		// 2 already seen, this is the 3rd → exactly at the limit, still allowed.
		expect(() => limiter.check("ip=A|user=anon")).not.toThrow();
	});

	it("rejects the first request over the limit with 429 + retry-after", () => {
		at(0);
		const limiter = createMemoryRateLimiter({ limit: 3, windowMs: 60_000 });
		for (let i = 0; i < 3; i++) limiter.check("ip=A|user=anon");

		let caught: unknown = null;
		try {
			limiter.check("ip=A|user=anon");
		} catch (error) {
			caught = error;
		}

		expect(caught).toBeInstanceOf(RateLimitError);
		expect((caught as RateLimitError).statusCode).toBe(429);
		// Oldest hit = request #0, leaves the window in 60s.
		expect((caught as RateLimitError).retryAfterSeconds).toBe(60);
	});

	it("lets a key back in once its window expires", () => {
		at(0);
		const limiter = createMemoryRateLimiter({ limit: 3, windowMs: 60_000 });
		for (let i = 0; i < 3; i++) limiter.check("ip=A|user=anon");

		expect(() => limiter.check("ip=A|user=anon")).toThrow(RateLimitError);

		at(60_000); // window is empty again (sliding: oldest falls off the edge)
		expect(() => limiter.check("ip=A|user=anon")).not.toThrow();
	});

	it("isolates buckets between IPs", () => {
		const limiter = createMemoryRateLimiter({ limit: 1, windowMs: 60_000 });
		limiter.check("ip=A|user=anon");
		expect(() => limiter.check("ip=A|user=anon")).toThrow(RateLimitError);
		expect(() => limiter.check("ip=B|user=anon")).not.toThrow();
	});

	it("isolates buckets between authenticated users", () => {
		const limiter = createMemoryRateLimiter({ limit: 1, windowMs: 60_000 });
		limiter.check("ip=X|user=u1");
		expect(() => limiter.check("ip=X|user=u1")).toThrow(RateLimitError);
		expect(() => limiter.check("ip=X|user=u2")).not.toThrow();
	});

	it("does not share one budget across different endpoints", () => {
		const limiter = createMemoryRateLimiter({ limit: 10, windowMs: 60_000 });
		for (let i = 0; i < 10; i++) limiter.check("public.a|ip=I|user=anon");
		expect(() => limiter.check("public.a|ip=I|user=anon")).toThrow(
			RateLimitError,
		);
		expect(() => limiter.check("public.b|ip=I|user=anon")).not.toThrow();
	});

	it("enforces the burst window independently of the sustained one", () => {
		at(0);
		const limiter = createMemoryRateLimiter({
			limit: 100,
			windowMs: 60_000,
			burst: { limit: 5, windowMs: 10_000 },
		});
		for (let i = 0; i < 5; i++) limiter.check("ip=A|user=anon");

		let caught: unknown = null;
		try {
			limiter.check("ip=A|user=anon"); // 6th within 10s → burst exceeded
		} catch (error) {
			caught = error;
		}
		expect(caught).toBeInstanceOf(RateLimitError);
		expect((caught as RateLimitError).retryAfterSeconds).toBe(10);

		at(10_000); // burst window empty, sustained still at 6/100
		expect(() => limiter.check("ip=A|user=anon")).not.toThrow();
	});

	it("sweeps stale entries instead of leaking forever", () => {
		at(0);
		const limiter = createMemoryRateLimiter({ limit: 5, windowMs: 60_000 });

		for (let i = 0; i < 10_001; i++) {
			limiter.check(`ip=spammer-${i}|user=anon`);
		}
		expect(limiter.size()).toBe(10_001);

		at(60_001); // every previous key is now stale
		limiter.check("probe");
		expect(limiter.size()).toBe(1); // only "probe" survives
	});

	it("burst check rejects exactly at the burst limit", () => {
		at(0);
		const limiter = createMemoryRateLimiter({
			limit: 10,
			windowMs: 60_000,
			burst: { limit: 3, windowMs: 10_000 },
		});
		for (let i = 0; i < 2; i++) limiter.check("ip=A|user=anon");
		expect(() => limiter.check("ip=A|user=anon")).not.toThrow();
		expect(() => limiter.check("ip=A|user=anon")).toThrow(RateLimitError);
	});
});

describe("rateLimitKey", () => {
	it("identifies the full operation context", () => {
		expect(
			rateLimitKey({
				endpoint: "events.exports",
				method: "GET",
				ip: "1.2.3.4",
				userId: "user-1",
			}),
		).toBe("events.exports|GET|ip=1.2.3.4|user=user-1");
	});

	it("falls back to anon for public endpoints", () => {
		expect(
			rateLimitKey({ endpoint: "public.invitations.getByCode", ip: "1.2.3.4" }),
		).toBe("public.invitations.getByCode|*|ip=1.2.3.4|user=anon");
	});

	it("never lets two endpoints share a bucket via the same IP", () => {
		const a = rateLimitKey({ endpoint: "public.a", ip: "1.2.3.4" });
		const b = rateLimitKey({ endpoint: "public.b", ip: "1.2.3.4" });
		expect(a).not.toBe(b);
	});
});

describe("sessionIdentity", () => {
	it("resolves the web session cookie without exposing it", () => {
		const id = sessionIdentity({
			cookie: "better-auth.session_token=supersecret; other=1",
		});
		expect(id).toMatch(/^[0-9a-f]{16}$/);
		expect(id).not.toContain("supersecret");
	});

	it("resolves the native bearer token", () => {
		expect(sessionIdentity({ authorization: "Bearer token-abc" })).toMatch(
			/^[0-9a-f]{16}$/,
		);
	});

	it("returns null for anonymous requests", () => {
		expect(sessionIdentity({})).toBeNull();
		expect(sessionIdentity({ cookie: "other=1" })).toBeNull();
	});
});

describe("error handler emits Retry-After for 429", () => {
	function fakeReply() {
		const reply = {
			status: vi.fn(function (this: unknown) {
				return this;
			}),
			header: vi.fn(function (this: unknown) {
				return this;
			}),
			hasHeader: vi.fn(() => false),
			send: vi.fn(),
		};
		return reply as unknown as FastifyReply;
	}

	function fakeRequest() {
		return {
			log: { error: vi.fn(), warn: vi.fn() },
		} as unknown as FastifyRequest;
	}

	it("writes Retry-After from the limiter error", () => {
		const reply = fakeReply();
		errorHandler(
			new RateLimitError(undefined, { retryAfterSeconds: 30 }),
			fakeRequest(),
			reply,
		);
		expect(reply.header).toHaveBeenCalledWith("Retry-After", "30");
		expect(reply.status as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(429);
		expect(reply.send).toHaveBeenCalled();
	});

	it("does not override a Retry-After already set (fastify backstop)", () => {
		const reply = fakeReply();
		reply.hasHeader = vi.fn(() => true);
		errorHandler(
			new RateLimitError(undefined, { retryAfterSeconds: 30 }),
			fakeRequest(),
			reply,
		);
		expect(reply.header).not.toHaveBeenCalled();
	});

	it("leaves non-rate-limit errors untouched", () => {
		const reply = fakeReply();
		errorHandler(new AppError("boom", 500, "INTERNAL"), fakeRequest(), reply);
		expect(reply.header).not.toHaveBeenCalled();
	});
});
