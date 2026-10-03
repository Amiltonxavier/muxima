import { beforeEach, describe, expect, it, vi } from "vitest";

import {
	applyApiValidationErrors,
	type FormApiLike,
	handleApiError,
} from "../handle-api-error";

const toastError = vi.fn();
vi.mock("sonner", () => ({
	toast: {
		error: (...args: unknown[]) => toastError(...args),
	},
}));

beforeEach(() => {
	toastError.mockClear();
});

function makeForm(): FormApiLike & {
	setFieldMeta: ReturnType<typeof vi.fn>;
} {
	const setFieldMeta = vi.fn();
	return { setFieldMeta } as unknown as FormApiLike & {
		setFieldMeta: ReturnType<typeof vi.fn>;
	};
}

describe("handleApiError", () => {
	it("shows the PT-PT message returned by the API", () => {
		handleApiError({
			code: "GUEST_NOT_FOUND",
			status: 404,
			message: "Convidado não encontrado",
		});

		expect(toastError).toHaveBeenCalledWith(
			"Convidado não encontrado",
			undefined,
		);
	});

	it("forwards extra toast options", () => {
		handleApiError({ status: 500 }, { toastOptions: { id: "export" } });

		expect(toastError).toHaveBeenCalledWith(expect.any(String), {
			id: "export",
		});
	});

	it("only uses the fallback when nothing usable came from the server", () => {
		handleApiError(new Error(""), {
			fallbackMessage: "Não foi possível gerar o ficheiro.",
		});
		expect(toastError).toHaveBeenLastCalledWith(
			"Não foi possível gerar o ficheiro.",
			undefined,
		);

		toastError.mockClear();
		handleApiError(
			{ code: "NOT_FOUND", status: 404, message: "Relatório indisponível" },
			{ fallbackMessage: "Não foi possível gerar o ficheiro." },
		);
		expect(toastError).toHaveBeenLastCalledWith(
			"Relatório indisponível",
			undefined,
		);
	});
});

describe("applyApiValidationErrors", () => {
	it("attaches each issue to its field", () => {
		const form = makeForm();

		applyApiValidationErrors(form, [
			{ path: "email", message: "Este campo é obrigatório." },
			{ path: "company.address", message: "Morada inválida." },
		]);

		expect(form.setFieldMeta).toHaveBeenCalledTimes(2);
		expect(form.setFieldMeta).toHaveBeenNthCalledWith(
			1,
			"email",
			expect.any(Function),
		);

		const updater = form.setFieldMeta.mock.calls[0][1] as (
			previous: unknown,
		) => unknown;
		expect(updater({ errorMap: { onBlur: "old" } })).toEqual({
			errorMap: { onBlur: "old", onSubmit: "Este campo é obrigatório." },
		});
	});

	it("ignores form-level issues and empty messages", () => {
		const form = makeForm();

		applyApiValidationErrors(form, [
			{ path: "*", message: "Formulário inválido" },
			{ path: "email", message: "  " },
		]);

		expect(form.setFieldMeta).not.toHaveBeenCalled();
	});

	it("keeps existing field metadata", () => {
		const form = makeForm();
		applyApiValidationErrors(form, [{ path: "email", message: "Inválido." }]);

		const updater = form.setFieldMeta.mock.calls[0][1] as (
			previous: unknown,
		) => unknown;
		expect(updater({ isTouched: true })).toEqual({
			isTouched: true,
			errorMap: { onSubmit: "Inválido." },
		});
	});
});

describe("handleApiError with a form", () => {
	it("maps validation issues to fields instead of a toast", () => {
		const form = makeForm();

		handleApiError(
			{
				code: "VALIDATION_ERROR",
				status: 422,
				message: "Os dados enviados são inválidos.",
				details: {
					issues: [{ path: "email", message: "Este campo é obrigatório." }],
				},
			},
			{ form },
		);

		expect(form.setFieldMeta).toHaveBeenCalledWith(
			"email",
			expect.any(Function),
		);
		expect(toastError).not.toHaveBeenCalled();
	});

	it("still toasts when the error carries no field issues", () => {
		const form = makeForm();

		handleApiError(
			{ code: "CONFLICT", status: 409, message: "Já existe um registo." },
			{ form },
		);

		expect(form.setFieldMeta).not.toHaveBeenCalled();
		expect(toastError).toHaveBeenCalledWith("Já existe um registo.", undefined);
	});
});
