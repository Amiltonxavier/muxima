import { describe, expect, it } from "vitest";

import { ValidationError } from "../errors/app-error";
import { VALID_EVENT_STATUSES, validateEnum } from "./validate-enum";

describe("validateEnum", () => {
	it("returns undefined for an absent filter", () => {
		expect(
			validateEnum(undefined, VALID_EVENT_STATUSES, "status"),
		).toBeUndefined();
	});

	it("returns the value when it is allowed", () => {
		expect(validateEnum("DRAFT", VALID_EVENT_STATUSES, "status")).toBe("DRAFT");
	});

	it("rejects a value that is present but not allowed", () => {
		expect(() => validateEnum("NOPE", VALID_EVENT_STATUSES, "status")).toThrow(
			ValidationError,
		);

		try {
			validateEnum("NOPE", VALID_EVENT_STATUSES, "status");
		} catch (error) {
			const appError = error as ValidationError;
			expect(appError.statusCode).toBe(422);
			expect(appError.code).toBe("VALIDATION_ERROR");
			expect(appError.details).toEqual({
				issues: [{ path: "status", message: "Valor inválido." }],
			});
		}
	});
});
