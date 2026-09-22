export const INVITATION_RESPONSE_FILTER_OPTIONS = [
	{ value: "ALL", label: "Todas as respostas" },
	{ value: "PENDING", label: "Sem resposta" },
	{ value: "CONFIRM", label: "Confirmados" },
	{ value: "MAYBE", label: "Talvez" },
	{ value: "DECLINE", label: "Recusados" },
	{ value: "EXPIRED", label: "Expirados" },
	{ value: "CANCELLED", label: "Cancelados" },
] as const;

export type InvitationResponseFilter =
	| "ALL"
	| "PENDING"
	| "CONFIRM"
	| "MAYBE"
	| "DECLINE"
	| "EXPIRED"
	| "CANCELLED";