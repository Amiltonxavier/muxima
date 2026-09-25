import type { GanttStatus } from "@muxima/ui/components/kibo-ui/gantt";
import type {
	ScheduleStatusFilter,
	ScheduleStatusMap,
} from "../-types/schedule.types";

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;

export const SCHEDULE_TABS = {
	GANTT: "gantt",
	LIST: "lista",
} as const;

export const SCHEDULE_STATUS_FILTER_OPTIONS: ScheduleStatusFilter[] = [
	"ALL",
	"PENDING",
	"IN_PROGRESS",
	"COMPLETED",
	"CANCELLED",
];

export const SCHEDULE_STATUS_MAP: ScheduleStatusMap = {
	PENDING: { id: "PENDING", name: "Pendente", color: "#eab308" },
	IN_PROGRESS: { id: "IN_PROGRESS", name: "Em andamento", color: "#3b82f6" },
	COMPLETED: { id: "COMPLETED", name: "Concluído", color: "#22c55e" },
	CANCELLED: { id: "CANCELLED", name: "Cancelado", color: "#ef4444" },
};

export const DEFAULT_SCHEDULE_STATUS: GanttStatus = SCHEDULE_STATUS_MAP.PENDING;

export const SCHEDULE_STATUS_LABELS: Record<string, string> = {
	PENDING: "Pendente",
	IN_PROGRESS: "Em andamento",
	COMPLETED: "Concluído",
	CANCELLED: "Cancelado",
};
