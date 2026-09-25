import { describe, expect, it } from "vitest";

import { AppError, NotFoundError } from "./app-error";
import { mapError } from "./map-error";

/**
 * Builds an error shaped like Prisma's PrismaClientKnownRequestError
 * without depending on the runtime class (duck-typed like the real error).
 */
function prismaError(code: string, message: string): Error {
	const error = new Error(message);
	error.name = "PrismaClientKnownRequestError";
	(error as Error & { code: string }).code = code;
	return error;
}

describe("mapError", () => {
	it("maps P2022 to a safe 500 without leaking internal details", () => {
		const original = prismaError(
			"P2022",
			"The column `inventory_item.venueQuantity` does not exist in the current database.\n" +
				"    at file:///home/user/projects/muxima/packages/db/prisma/generated/client.ts:123",
		);

		const mapped = mapError(original);

		expect(mapped).toBeInstanceOf(AppError);
		expect(mapped.statusCode).toBe(500);
		expect(mapped.code).toBe("INTERNAL_SERVER_ERROR");
		expect(mapped.message).toBe(
			"Não foi possível carregar os dados devido a um problema de configuração. Tente novamente ou contacte o administrador.",
		);
		expect(mapped.message).not.toContain("venueQuantity");
		expect(mapped.message).not.toContain("inventory_item");
		expect(mapped.message).not.toContain("/home/");
		expect(mapped.message).not.toContain("SELECT");
	});

	it("maps P2025 to NOT_FOUND", () => {
		const mapped = mapError(prismaError("P2025", "Record not found"));

		expect(mapped).toBeInstanceOf(NotFoundError);
		expect(mapped.statusCode).toBe(404);
		expect(mapped.code).toBe("NOT_FOUND");
	});

	it("maps P2002 to CONFLICT", () => {
		const mapped = mapError(
			prismaError("P2002", "Unique constraint failed on the fields: (`email`)"),
		);

		expect(mapped.statusCode).toBe(409);
		expect(mapped.code).toBe("CONFLICT");
		expect(mapped.message).not.toContain("email");
	});

	it("maps P2003 to BAD_REQUEST", () => {
		const mapped = mapError(
			prismaError(
				"P2003",
				"Foreign key constraint failed on the field: vendorId",
			),
		);

		expect(mapped.statusCode).toBe(400);
		expect(mapped.code).toBe("BAD_REQUEST");
	});

	it("passes AppError through unchanged", () => {
		const original = new NotFoundError("Item de inventário não encontrado");

		expect(mapError(original)).toBe(original);
	});

	it("keeps safe Fastify 4xx errors (rate limit, parsing)", () => {
		const rateLimit = Object.assign(new Error("Rate limit exceeded"), {
			statusCode: 429,
			code: "FST_ERR_RATE_LIMIT",
		});

		const mapped = mapError(rateLimit);

		expect(mapped.statusCode).toBe(429);
		expect(mapped.code).toBe("FST_ERR_RATE_LIMIT");
	});

	it("never leaks messages from unexpected errors", () => {
		const original = new Error(
			"connect ECONNREFUSED 10.0.0.5:5432 at /srv/app/node_modules/pg",
		);

		const mapped = mapError(original);

		expect(mapped).toBeInstanceOf(AppError);
		expect(mapped.statusCode).toBe(500);
		expect(mapped.code).toBe("INTERNAL_SERVER_ERROR");
		expect(mapped.message).toBe("Internal server error");
		expect(mapped.message).not.toContain("ECONNREFUSED");
		expect(mapped.message).not.toContain("node_modules");
	});
});
