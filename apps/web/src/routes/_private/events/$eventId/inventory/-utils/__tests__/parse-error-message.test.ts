import { describe, expect, it } from "vitest";
import { parseErrorMessage } from "../parse-error-message";

function makeError(message: string): Error {
	return new Error(message);
}

describe("parseErrorMessage", () => {
	it("returns default message when error has empty message", () => {
		const result = parseErrorMessage(makeError(""));
		expect(result).toBe("Ocorreu um erro desconhecido. Tente novamente.");
	});

	it("maps 'Invalid option' to cake type error", () => {
		const result = parseErrorMessage(makeError("Invalid option: cakeType"));
		expect(result).toBe("O tipo de bolo selecionado é inválido.");
	});

	it("maps 'Item não encontrado' error", () => {
		const result = parseErrorMessage(makeError("Item não encontrado"));
		expect(result).toBe("Item não encontrado no inventário.");
	});

	it("maps permission error for event access", () => {
		const result = parseErrorMessage(
			makeError("Não tem permissão para aceder a este evento"),
		);
		expect(result).toBe("Não tem permissão para aceder a este evento.");
	});

	it("maps insufficient permission error", () => {
		const result = parseErrorMessage(
			makeError("Não tem permissão suficiente para esta operação"),
		);
		expect(result).toBe("Permissão insuficiente para esta operação.");
	});

	it("maps 'Required' error", () => {
		const result = parseErrorMessage(makeError("Required field: name"));
		expect(result).toBe("Preencha todos os campos obrigatórios.");
	});

	it("maps 'Invalid input' error", () => {
		const result = parseErrorMessage(makeError("Invalid input provided"));
		expect(result).toBe("Dados inválidos. Verifique os campos preenchidos.");
	});

	it("maps 'Too small' error", () => {
		const result = parseErrorMessage(makeError("Too small value"));
		expect(result).toBe("O valor informado é muito pequeno.");
	});

	it("maps 'Too big' error", () => {
		const result = parseErrorMessage(makeError("Too big value"));
		expect(result).toBe("O valor informado é muito grande.");
	});

	it("maps 'Not found' error", () => {
		const result = parseErrorMessage(makeError("Not found"));
		expect(result).toBe("Recurso não encontrado.");
	});

	it("maps 'Unauthorized' error", () => {
		const result = parseErrorMessage(makeError("Unauthorized access"));
		expect(result).toBe("Sessão expirada. Faça login novamente.");
	});

	it("maps 'Forbidden' error", () => {
		const result = parseErrorMessage(makeError("Forbidden"));
		expect(result).toBe("Acesso negado.");
	});

	it("maps 'Internal' error", () => {
		const result = parseErrorMessage(makeError("Internal server error"));
		expect(result).toBe("Erro interno do servidor. Tente novamente.");
	});

	it("maps 'Timeout' error", () => {
		const result = parseErrorMessage(makeError("Timeout exceeded"));
		expect(result).toBe("A requisição expirou. Tente novamente.");
	});

	it("maps 'Network' error", () => {
		const result = parseErrorMessage(makeError("Network error occurred"));
		expect(result).toBe("Erro de conexão. Verifique sua internet.");
	});

	it("maps 'conflict' error", () => {
		const result = parseErrorMessage(makeError("conflict detected"));
		expect(result).toBe(
			"Conflito de dados. O item já foi modificado por outro utilizador.",
		);
	});

	it("maps 'unique' constraint error", () => {
		const result = parseErrorMessage(makeError("unique constraint violated"));
		expect(result).toBe("Já existe um item com estes dados.");
	});

	it("maps 'foreign key' error", () => {
		const result = parseErrorMessage(makeError("foreign key constraint"));
		expect(result).toBe(
			"Referência inválida. Verifique os dados selecionados.",
		);
	});

	it("returns original message when no mapping matches", () => {
		const result = parseErrorMessage(makeError("Custom error message"));
		expect(result).toBe("Custom error message");
	});

	it("returns fallback for undefined message", () => {
		const error = new Error();
		error.message = undefined as unknown as string;
		const result = parseErrorMessage(error);
		expect(result).toBe("Ocorreu um erro desconhecido. Tente novamente.");
	});
});
