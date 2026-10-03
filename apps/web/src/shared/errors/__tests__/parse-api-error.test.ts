import { describe, expect, it } from "vitest";

import { ERROR_CODES } from "../codes";
import {
	apiValidationIssues,
	isValidationError,
	parseApiError,
} from "../parse-api-error";

describe("parseApiError", () => {
	describe("oRPC errors", () => {
		it("reads the public code, status, message and data as details", () => {
			const info = parseApiError({
				code: "GUEST_NOT_FOUND",
				status: 404,
				message: "Convidado não encontrado",
				data: { issues: [{ path: "guestId", message: "Valor inválido." }] },
			});

			expect(info).toEqual({
				code: "GUEST_NOT_FOUND",
				status: 404,
				message: "Convidado não encontrado",
				details: {
					issues: [{ path: "guestId", message: "Valor inválido." }],
				},
			});
		});

		it("keeps a message with no details untouched", () => {
			const info = parseApiError({
				code: "EVENT_ACCESS_DENIED",
				status: 403,
				message: "Não tem acesso a este evento",
				data: undefined,
			});

			expect(info.details).toBeUndefined();
			expect(info.message).toBe("Não tem acesso a este evento");
		});
	});

	describe("REST envelope", () => {
		it("reads { error: { code, message, details } }", () => {
			const info = parseApiError({
				error: {
					code: ERROR_CODES.VALIDATION_ERROR,
					message: "Os dados enviados são inválidos.",
					details: {
						issues: [{ path: "email", message: "Este campo é obrigatório." }],
					},
				},
			});

			expect(info.code).toBe(ERROR_CODES.VALIDATION_ERROR);
			expect(apiValidationIssues({ error: info })).toEqual([
				{ path: "email", message: "Este campo é obrigatório." },
			]);
		});
	});

	describe("Better Auth APIError", () => {
		it("reads the envelope carried in `body`", () => {
			const info = parseApiError({
				status: 401,
				body: {
					error: {
						code: "AUTH_INVALID_CREDENTIALS",
						message: "Email ou palavra-passe incorretos.",
						status: "UNAUTHORIZED",
					},
				},
			});

			expect(info.code).toBe("AUTH_INVALID_CREDENTIALS");
			expect(info.status).toBe(401);
			expect(info.message).toBe("Email ou palavra-passe incorretos.");
		});
	});

	describe("client-side ZodError", () => {
		it("turns issues into form paths", () => {
			const zodError = {
				name: "ZodError",
				issues: [
					{ path: ["email"], message: "Email é obrigatório" },
					{ path: ["company", "address"], message: "Morada é obrigatória" },
					{ path: [], message: "Formulário inválido" },
				],
			};

			const info = parseApiError(zodError);

			expect(info.code).toBe(ERROR_CODES.VALIDATION_ERROR);
			expect(info.status).toBe(422);
			expect(info.details?.issues).toEqual([
				{ path: "email", message: "Email é obrigatório" },
				{ path: "company.address", message: "Morada é obrigatória" },
				{ path: "*", message: "Formulário inválido" },
			]);
			expect(isValidationError(zodError)).toBe(true);
		});
	});

	describe("unknown failures", () => {
		it("never leaks a raw thrown message from a non-envelope error", () => {
			const info = parseApiError(new Error("select * from users -- boom"));

			expect(info.code).toBe(ERROR_CODES.INTERNAL_SERVER_ERROR);
			expect(info.message).not.toContain("select");
			expect(info.message).not.toContain("users");
		});

		it("falls back to a status-aware PT-PT message", () => {
			expect(parseApiError({ status: 403 }).message).toBe(
				"Não tem permissão para realizar esta operação.",
			);
			expect(parseApiError({ status: 429 }).message).toBe(
				"Demasiadas tentativas. Tente novamente dentro de alguns instantes.",
			);
		});

		it("derives the code from the status when the payload has none", () => {
			expect(parseApiError({ status: 404 }).code).toBe(ERROR_CODES.NOT_FOUND);
			expect(parseApiError({ status: 409 }).code).toBe(ERROR_CODES.CONFLICT);
		});

		it("handles null/undefined without throwing", () => {
			const info = parseApiError(undefined);

			expect(info.code).toBe(ERROR_CODES.INTERNAL_SERVER_ERROR);
			expect(info.message.length).toBeGreaterThan(0);
		});
	});
});
