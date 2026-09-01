const ERROR_MAP: Array<{ match: string | RegExp; message: string }> = [
	{ match: "Required", message: "Preencha todos os campos obrigatorios." },
	{ match: "Invalid input", message: "Dados invalidos. Verifique os campos preenchidos." },
	{ match: "Too small", message: "O valor informado e muito pequeno." },
	{ match: "Too big", message: "O valor informado e muito grande." },
	{ match: "Invalid string", message: "Texto invalido em um dos campos." },
	{ match: "Invalid email", message: "Email invalido." },
	{ match: "Not found", message: "Recurso nao encontrado." },
	{ match: "Unauthorized", message: "Sessao expirada. Faca login novamente." },
	{ match: "Forbidden", message: "Acesso negado." },
	{ match: "Internal", message: "Erro interno do servidor. Tente novamente." },
	{ match: "Timeout", message: "A requisicao expirou. Tente novamente." },
	{ match: "Network", message: "Erro de conexao. Verifique sua internet." },
	{ match: "conflict", message: "Conflito de dados. O registro ja foi modificado por outro utilizador." },
	{ match: "unique", message: "Ja existe um registro com estes dados." },
	{ match: "foreign key", message: "Referencia invalida. Verifique os dados selecionados." },
	{ match: "Invalid option", message: "Opcao selecionada e invalida." },
	{ match: "Nao tem permissao", message: "Nao tem permissao para esta operacao." },
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
