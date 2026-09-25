import {
	GanttFeatureList,
	GanttFeatureListGroup,
	GanttFeatureRow,
	GanttHeader,
	GanttMarker,
	GanttProvider,
	GanttSidebar,
	GanttSidebarGroup,
	GanttSidebarItem,
	GanttTimeline,
	GanttToday,
} from "@muxima/ui/components/kibo-ui/gantt";
import { format } from "date-fns";
import { MapPin } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";
import { QueryState } from "@/shared/components/states";
import {
	DEFAULT_SCHEDULE_STATUS,
	SCHEDULE_STATUS_MAP,
} from "../-constants/schedule.constants";
import type {
	ScheduleGanttFeature,
	ScheduleGanttGroup,
	ScheduleItem,
	ScheduleMarker,
} from "../-types/schedule.types";

const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000;

export function ScheduleGantt({
	schedules,
	isLoading,
	isError,
}: {
	schedules: ScheduleItem[];
	isLoading: boolean;
	isError: boolean;
}) {
	const ganttFeatures: ScheduleGanttFeature[] = useMemo(() => {
		return schedules
			.filter((schedule) => {
				const start = new Date(schedule.startAt);
				return !Number.isNaN(start.getTime());
			})
			.map((schedule) => {
				const startAt = new Date(schedule.startAt);
				const endAt = schedule.endAt
					? new Date(schedule.endAt)
					: new Date(startAt.getTime() + DEFAULT_DURATION_MS);

				return {
					id: schedule.id,
					name: schedule.title || "Sem título",
					startAt,
					endAt,
					status:
						SCHEDULE_STATUS_MAP[schedule.status] || DEFAULT_SCHEDULE_STATUS,
					lane: schedule.responsible || undefined,
				};
			});
	}, [schedules]);

	const groupedFeatures: ScheduleGanttGroup = useMemo(() => {
		const groups: ScheduleGanttGroup = {};
		for (const feature of ganttFeatures) {
			const lane = feature.lane || "Geral";
			if (!groups[lane]) groups[lane] = [];
			groups[lane].push(feature);
		}
		return groups;
	}, [ganttFeatures]);

	const markers: ScheduleMarker[] = useMemo(() => {
		return ganttFeatures
			.filter((feature) => {
				const schedule = schedules.find((item) => item.id === feature.id);
				return schedule?.location;
			})
			.map((feature) => {
				const schedule = schedules.find((item) => item.id === feature.id);
				return {
					id: `marker-${feature.id}`,
					date: feature.startAt,
					label: `${feature.name} — ${schedule?.location || ""}`,
				};
			});
	}, [ganttFeatures, schedules]);

	return (
		<QueryState
			state={{
				isLoading,
				isError,
				isEmpty: schedules.length === 0,
				hasData: schedules.length > 0,
			}}
		>
			<div className="rounded-lg border">
				<GanttProvider range="monthly" zoom={100}>
					<GanttSidebar>
						{Object.entries(groupedFeatures).map(([lane, features]) => (
							<GanttSidebarGroup key={lane} name={lane}>
								{features.map((feature) => (
									<GanttSidebarItem key={feature.id} feature={feature} />
								))}
							</GanttSidebarGroup>
						))}
					</GanttSidebar>
					<GanttTimeline>
						<GanttHeader />
						<GanttFeatureList>
							{Object.entries(groupedFeatures).map(([lane, features]) => (
								<GanttFeatureListGroup key={lane}>
									<GanttFeatureRow
										features={features}
										onMove={(id, startAt, endAt) => {
											toast.info(
												`Arrastar ${id}: ${format(startAt, "dd/MM/yyyy")} — ${endAt ? format(endAt, "dd/MM/yyyy") : "—"}`,
											);
										}}
									>
										{(feature: ScheduleGanttFeature) => {
											const schedule = schedules.find(
												(item) => item.id === feature.id,
											);
											return (
												<div className="flex items-center gap-2 px-2 text-xs">
													<p className="flex-1 truncate">{feature.name}</p>
													{schedule?.location && (
														<MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
													)}
												</div>
											);
										}}
									</GanttFeatureRow>
								</GanttFeatureListGroup>
							))}
						</GanttFeatureList>
						{markers.map((marker) => (
							<GanttMarker
								key={marker.id}
								id={marker.id}
								date={marker.date}
								label={marker.label}
							/>
						))}
						<GanttToday />
					</GanttTimeline>
				</GanttProvider>
			</div>
		</QueryState>
	);
}
