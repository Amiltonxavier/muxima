import { describe, expect, it } from "vitest";

import { AppError } from "../errors/app-error";
import { AUTH_CODES, ERROR_CODES, USER_CODES } from "../errors/codes";
import { mapBetterAuthError } from "./better-auth-error";

describe("mapBetterAuthError", () => {
	it("translates invalid credentials into a PT-PT 401", () => {
		const mapped = mapBetterAuthError(
			{
				error: {
					code: "INVALID_EMAIL_OR_PASSWORD",
					message: "Invalid email or password",
					status: "UNAUTHORIZED",
				},
			},
			401,
		);

		expect(mapped).toBeInstanceOf(AppError);
		expect(mapped.statusCode).toBe(401);
		expect(mapped.code).toBe(AUTH_CODES.INVALID_CREDENTIALS);
		expect(mapped.message).toBe("Email ou palavra-passe incorretos.");
		expect(mapped.message).not.toMatch(/[Ii]nvalid/);
	});

	it("never forwards Better Auth's English message", () => {
		const mapped = mapBetterAuthError(
			{
				error: {
					code: "USER_ALREADY_EXISTS",
					message: "User already exists. Use another email.",
				},
			},
			422,
		);

		expect(mapped.statusCode).toBe(409);
		expect(mapped.code).toBe(USER_CODES.EMAIL_ALREADY_IN_USE);
		expect(mapped.message).toBe("Já existe uma conta com este email.");
		expect(mapped.message).not.toContain("Use another email");
	});

	it("keeps the PT-PT message of a BLOCKED account thrown by our own hook", () => {
		const mapped = mapBetterAuthError(
			{
				error: {
					code: "ACCOUNT_BLOCKED",
					message: "A tua conta está bloqueada. Contacta o suporte.",
				},
			},
			403,
		);

		expect(mapped.statusCode).toBe(403);
		expect(mapped.code).toBe(ERROR_CODES.ACCOUNT_BLOCKED);
		expect(mapped.message).toBe(
			"A tua conta está bloqueada. Contacta o suporte.",
		);
	});

	it("accepts bodies without the `error` wrapper", () => {
		const mapped = mapBetterAuthError({ code: "INVALID_TOKEN" }, 401);

		expect(mapped.statusCode).toBe(401);
		expect(mapped.code).toBe(AUTH_CODES.INVALID_TOKEN);
	});

	it("preserves the status of codes it does not translate", () => {
		const mapped = mapBetterAuthError(
			{ error: { code: "SOME_FUTURE_BETTER_AUTH_CODE", message: "Whatever" } },
			503,
		);

		expect(mapped.statusCode).toBe(503);
		expect(mapped.code).toBe(ERROR_CODES.INTERNAL_SERVER_ERROR);
		expect(mapped.message).not.toContain("Whatever");
	});

	it("falls back to a generic message per status", () => {
		const cases: Array<[number, number, string]> = [
			[400, 400, ERROR_CODES.BAD_REQUEST],
			[401, 401, ERROR_CODES.UNAUTHORIZED],
			[403, 403, ERROR_CODES.FORBIDDEN],
			[404, 404, ERROR_CODES.NOT_FOUND],
			[409, 409, ERROR_CODES.CONFLICT],
			[422, 422, ERROR_CODES.VALIDATION_ERROR],
			[429, 429, ERROR_CODES.RATE_LIMIT_EXCEEDED],
			[500, 500, ERROR_CODES.INTERNAL_SERVER_ERROR],
		];

		for (const [incoming, statusCode, code] of cases) {
			const mapped = mapBetterAuthError(null, incoming);
			expect(mapped.statusCode).toBe(statusCode);
			expect(mapped.code).toBe(code);
			expect(mapped.message.trim().length).toBeGreaterThan(0);
		}
	});

	it("never leaks the Better Auth status string as a message", () => {
		const mapped = mapBetterAuthError(
			{
				error: {
					code: "UNKNOWN_CODE",
					message: "stack trace: at foo (/srv/app/index.js:1:1)",
				},
			},
			401,
		);

		expect(mapped.message).not.toContain("stack trace");
		expect(mapped.message).not.toContain("/srv/app");
	});
});
