import type {
	CreateScheduleInput,
	Schedule,
} from "@muxima/api/shared/types/entities";
import type {
	GanttFeature,
	GanttStatus,
} from "@muxima/ui/components/kibo-ui/gantt";

export type ScheduleItem = Schedule;

export type ScheduleTabId = "gantt" | "lista";

export type ScheduleStatusFilter = "ALL" | Schedule["status"];

export type ScheduleFormValues = Omit<CreateScheduleInput, "eventId">;

export type ScheduleStatusMap = Record<string, GanttStatus>;

export type ScheduleGanttFeature = GanttFeature;

export type ScheduleGanttGroup = Record<string, ScheduleGanttFeature[]>;

export type ScheduleMarker = {
	id: string;
	date: Date;
	label: string;
};
