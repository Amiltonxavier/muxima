export const EVENT_STATUS_OPTIONS = [
	{ value: "DRAFT", label: "Rascunho" },
	{ value: "PLANNING", label: "Planeamento" },
	{ value: "CONFIRMED", label: "Confirmado" },
	{ value: "COMPLETED", label: "Concluido" },
	{ value: "CANCELLED", label: "Cancelado" },
] as const;

export const EVENT_TYPE_OPTIONS = [
	{ value: "WEDDING", label: "Casamento" },
	{ value: "ENGAGEMENT", label: "Noivado" },
] as const;
