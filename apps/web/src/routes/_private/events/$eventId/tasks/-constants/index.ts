export const STATUS_MAP: Record<
	string,
	{ status: string; title: string; color: string }
> = {
	PENDING: { status: "PENDING", title: "Pendente", color: "#eab308" },
	IN_PROGRESS: {
		status: "IN_PROGRESS",
		title: "Em andamento",
		color: "#3b82f6",
	},
	COMPLETED: { status: "COMPLETED", title: "Concluido", color: "#22c55e" },
	CANCELLED: { status: "CANCELLED", title: "Cancelado", color: "#ef4444" },
};

export const CATEGORY_MAP: Record<string, string> = {
	DECORATION: "Decoracao",
	CATERING: "Gastronomia",
	MUSIC: "Musica",
	FLOWERS: "Flores",
	PHOTOGRAPHY: "Fotografia",
	OTHER: "Outros",
};

export const COLUMNS = [
	{ status: "PENDING", title: "Pendente", color: "#eab308" },
	{ status: "IN_PROGRESS", title: "Em andamento", color: "#3b82f6" },
	{ status: "COMPLETED", title: "Concluido", color: "#22c55e" },
];

export const ACTION_TYPES_TASK = {
	UPDATE: "update",
	DELETE: "delete",
} as const;
