import { describe, expect, it } from "vitest";
import { z } from "zod";

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

	it("translates Fastify 4xx errors into public codes, never forwarding the library code", () => {
		const rateLimit = Object.assign(new Error("Rate limit exceeded"), {
			statusCode: 429,
			code: "FST_ERR_RATE_LIMIT",
		});

		const mapped = mapError(rateLimit);

		expect(mapped.statusCode).toBe(429);
		expect(mapped.code).toBe("RATE_LIMIT_EXCEEDED");
		expect(mapped.message).toBe(
			"Demasiadas tentativas. Tente novamente dentro de alguns instantes.",
		);
		expect(mapped.code).not.toContain("FST_ERR");
	});

	it("maps every Fastify 4xx status to a stable public code", () => {
		const cases: Array<[number, string]> = [
			[400, "BAD_REQUEST"],
			[401, "UNAUTHORIZED"],
			[403, "FORBIDDEN"],
			[404, "NOT_FOUND"],
			[405, "METHOD_NOT_ALLOWED"],
			[413, "PAYLOAD_TOO_LARGE"],
			[415, "UNSUPPORTED_MEDIA_TYPE"],
			[422, "VALIDATION_ERROR"],
			[429, "RATE_LIMIT_EXCEEDED"],
		];

		for (const [statusCode, code] of cases) {
			const mapped = mapError(
				Object.assign(new Error("FST_ERR_SOMETHING"), {
					statusCode,
					code: "FST_ERR_SOMETHING",
				}),
			);

			expect(mapped.statusCode).toBe(statusCode);
			expect(mapped.code).toBe(code);
		}
	});

	it("never leaks messages from unexpected errors", () => {
		const original = new Error(
			"connect ECONNREFUSED 10.0.0.5:5432 at /srv/app/node_modules/pg",
		);

		const mapped = mapError(original);

		expect(mapped).toBeInstanceOf(AppError);
		expect(mapped.statusCode).toBe(500);
		expect(mapped.code).toBe("INTERNAL_SERVER_ERROR");
		expect(mapped.message).toBe(
			"Ocorreu um erro interno. Tente novamente mais tarde.",
		);
		expect(mapped.message).not.toContain("ECONNREFUSED");
		expect(mapped.message).not.toContain("node_modules");
	});

	it("maps a ZodError to VALIDATION_ERROR with PT-PT issues and paths", () => {
		const schema = z.object({
			email: z.email("Email inválido."),
			age: z.number().min(18, "Idade mínima é 18."),
		});

		const result = schema.safeParse({ email: "nao-e-email", age: 10 });

		const mapped = mapError(result.error);

		expect(mapped.statusCode).toBe(422);
		expect(mapped.code).toBe("VALIDATION_ERROR");
		expect(mapped.message).toBe("Os dados enviados são inválidos.");

		const details = mapped.details as {
			issues: Array<{ path: string; message: string }>;
		};
		expect(details.issues).toEqual([
			{ path: "email", message: "Email inválido." },
			{ path: "age", message: "Idade mínima é 18." },
		]);
	});

	it("replaces Zod's English defaults with PT-PT messages", () => {
		const schema = z.object({
			name: z.string().min(3),
			role: z.enum(["ADMIN", "VIEWER"]),
			website: z.url(),
		});

		const result = schema.safeParse({ name: "ab", role: "GUEST" });

		const mapped = mapError(result.error);
		const details = mapped.details as {
			issues: Array<{ path: string; message: string }>;
		};

		expect(details.issues).toEqual([
			{ path: "name", message: "O valor é demasiado curto." },
			{ path: "role", message: "Valor inválido." },
			{ path: "website", message: "Este campo é obrigatório." },
		]);
		expect(details.issues.map((issue) => issue.message).join(" ")).not.toMatch(
			/Invalid|Expected|must be/,
		);
	});

	it("reports missing fields as required regardless of the schema kind", () => {
		const schema = z.object({
			email: z.email(),
			website: z.url(),
			name: z.string().min(3),
			role: z.enum(["ADMIN", "VIEWER"]),
		});

		const mapped = mapError(schema.safeParse({}).error);
		const details = mapped.details as {
			issues: Array<{ path: string; message: string }>;
		};

		expect(details.issues).toEqual([
			{ path: "email", message: "Este campo é obrigatório." },
			{ path: "website", message: "Este campo é obrigatório." },
			{ path: "name", message: "Este campo é obrigatório." },
			// Zod does not tell a missing enum apart from an unknown value, so
			// both end up under the same message.
			{ path: "role", message: "Valor inválido." },
		]);
	});
});
