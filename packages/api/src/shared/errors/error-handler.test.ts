import type { FastifyReply, FastifyRequest } from "fastify";
import { describe, expect, it, vi } from "vitest";

import { NotFoundError } from "./app-error";
import { errorHandler } from "./error-handler";

function makeRequest() {
	return {
		log: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
	} as unknown as FastifyRequest;
}

function makeReply() {
	const reply = {
		status: vi.fn(() => reply),
		send: vi.fn(() => reply),
	};
	return reply as unknown as FastifyReply & {
		status: ReturnType<typeof vi.fn>;
		send: ReturnType<typeof vi.fn>;
	};
}

function prismaError(code: string, message: string): Error {
	const error = new Error(message);
	error.name = "PrismaClientKnownRequestError";
	(error as Error & { code: string }).code = code;
	return error;
}

describe("errorHandler", () => {
	it("returns a consistent shape for P2022 without internal details", () => {
		const request = makeRequest();
		const reply = makeReply();

		errorHandler(
			prismaError(
				"P2022",
				"The column `inventory_item.status` does not exist in the current database",
			) as never,
			request,
			reply,
		);

		expect(reply.status).toHaveBeenCalledWith(500);
		const payload = reply.send.mock.calls[0]?.[0] as {
			error: { code: string; message: string };
		};
		expect(payload.error.code).toBe("INTERNAL_SERVER_ERROR");
		expect(payload.error.message).toContain("configuração");
		expect(payload.error.message).not.toContain("inventory_item");
		expect(payload.error.message).not.toContain("status");
		// original error kept in server logs only
		expect(request.log.error).toHaveBeenCalled();
	});

	it("returns 404 for AppError with its own message", () => {
		const request = makeRequest();
		const reply = makeReply();

		errorHandler(
			new NotFoundError("Item de inventário não encontrado") as never,
			request,
			reply,
		);

		expect(reply.status).toHaveBeenCalledWith(404);
		expect(reply.send).toHaveBeenCalledWith({
			error: {
				code: "NOT_FOUND",
				message: "Item de inventário não encontrado",
			},
		});
	});

	it("masks unexpected errors and logs the original", () => {
		const request = makeRequest();
		const reply = makeReply();
		const original = new Error("SELECT * FROM inventory_item -- boom");

		errorHandler(original as never, request, reply);

		expect(reply.status).toHaveBeenCalledWith(500);
		const payload = reply.send.mock.calls[0]?.[0] as {
			error: { message: string };
		};
		expect(payload.error.message).not.toContain("SELECT");
		expect(request.log.error).toHaveBeenCalledWith(
			{ err: original },
			"Unhandled API error",
		);
	});
});
