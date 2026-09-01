const ERROR_MAP: Array<{ match: string | RegExp; message: string }> = [
	{ match: "Invalid option", message: "O tipo de bolo selecionado é inválido." },
	{ match: "Item não encontrado", message: "Item não encontrado no inventário." },
	{
		match: "Não tem permissão para aceder a este evento",
		message: "Não tem permissão para aceder a este evento.",
	},
	{
		match: "Não tem permissão suficiente para esta operação",
		message: "Permissão insuficiente para esta operação.",
	},
	{ match: "Required", message: "Preencha todos os campos obrigatórios." },
	{ match: "Invalid input", message: "Dados inválidos. Verifique os campos preenchidos." },
	{ match: "Too small", message: "O valor informado é muito pequeno." },
	{ match: "Too big", message: "O valor informado é muito grande." },
	{ match: "Invalid string", message: "Texto inválido em um dos campos." },
	{ match: "Invalid email", message: "Email inválido." },
	{ match: "Not found", message: "Recurso não encontrado." },
	{ match: "Unauthorized", message: "Sessão expirada. Faça login novamente." },
	{ match: "Forbidden", message: "Acesso negado." },
	{ match: "Internal", message: "Erro interno do servidor. Tente novamente." },
	{ match: "Timeout", message: "A requisição expirou. Tente novamente." },
	{ match: "Network", message: "Erro de conexão. Verifique sua internet." },
	{ match: "conflict", message: "Conflito de dados. O item já foi modificado por outro utilizador." },
	{ match: "unique", message: "Já existe um item com estes dados." },
	{ match: "foreign key", message: "Referência inválida. Verifique os dados selecionados." },
];

export function parseErrorMessage(error: Error) {
	const message = error.message || "";

	for (const { match, message: mappedMessage } of ERROR_MAP) {
		if (typeof match === "string") {
			if (message.includes(match)) return mappedMessage;
		} else {
			if (match.test(message)) return mappedMessage;
		}
	}

	return message || "Ocorreu um erro desconhecido. Tente novamente.";
}