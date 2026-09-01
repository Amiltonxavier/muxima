import type { GanttStatus } from "@muxima/ui/components/kibo-ui/gantt";

export const STATUS_MAP: Record<string, GanttStatus> = {
	PENDING: { id: "PENDING", name: "Pendente", color: "#eab308" },
	IN_PROGRESS: { id: "IN_PROGRESS", name: "Em andamento", color: "#3b82f6" },
	COMPLETED: { id: "COMPLETED", name: "Concluido", color: "#22c55e" },
	CANCELLED: { id: "CANCELLED", name: "Cancelado", color: "#ef4444" },
};

export const STATUS_LABELS: Record<string, string> = {
	PENDING: "Pendente",
	IN_PROGRESS: "Em andamento",
	COMPLETED: "Concluido",
	CANCELLED: "Cancelado",
};

export const ACTION_TYPES_SCHEDULE = {
	DELETE: "delete",
} as const;
