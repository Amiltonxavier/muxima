import { Button } from "@muxima/ui/components/button";
import {
	type GanttFeature,
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
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { MapPin, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BackButton } from "@/shared/components/back-to";
import { QueryState } from "@/shared/components/states";
import {
	useCreateSchedule,
	useDeleteSchedule,
	useSchedules,
} from "@/shared/queries/schedule-queries";
import { ScheduleDialog } from "./-components/schedule-dialog";
import { ScheduleList } from "./-components/schedule-list";
import { STATUS_MAP } from "./-constants";
import type { Schedule } from "./-types";

export const Route = createFileRoute("/_private/events/$eventId/schedule/")({
	component: SchedulePage,
});

function SchedulePage() {
	const { eventId } = Route.useParams();

	const schedulesQuery = useSchedules({ eventId });
	const createSchedule = useCreateSchedule();
	const deleteSchedule = useDeleteSchedule();

	const [showCreate, setShowCreate] = useState(false);

	const schedules = (schedulesQuery.data?.data ?? []) as unknown as Schedule[];

	const ganttFeatures = useMemo(() => {
		return schedules
			.filter((s) => {
				const start = s.startAt ? new Date(s.startAt) : null;
				return start && !Number.isNaN(start.getTime());
			})
			.map((s) => {
				const startAt = new Date(s.startAt!);
				const endAt = s.endAt
					? new Date(s.endAt)
					: new Date(startAt.getTime() + 2 * 60 * 60 * 1000);
				return {
					id: s.id,
					name: s.title || "Sem titulo",
					startAt: startAt.toISOString(),
					endAt: endAt.toISOString(),
					status: STATUS_MAP[s.status || "PENDING"] || STATUS_MAP.PENDING,
					lane: s.responsible || undefined,
				} as any;
			});
	}, [schedules]);

	const groupedFeatures = useMemo(() => {
		const groups: Record<string, GanttFeature[]> = {};
		for (const feature of ganttFeatures) {
			const lane = feature.lane || "Geral";
			if (!groups[lane]) groups[lane] = [];
			groups[lane].push(feature);
		}
		return groups;
	}, [ganttFeatures]);

	const markers = useMemo(() => {
		return ganttFeatures
			.filter((f) => {
				const schedule = schedules.find((s) => s.id === f.id);
				return schedule?.location;
			})
			.map((f) => {
				const schedule = schedules.find((s) => s.id === f.id);
				return {
					id: `marker-${f.id}`,
					date: f.startAt,
					label: `${f.name} \u2014 ${schedule?.location || ""}`,
				};
			});
	}, [ganttFeatures, schedules]);

	return (
		<div className="space-y-6">
			<BackButton to={`/events/${eventId}`} label="Voltar ao evento" />
			<div className="flex items-center justify-between">
				<div>
					<h1 className="font-semibold text-2xl">Cronograma</h1>
					<p className="text-muted-foreground text-sm">
						{schedules.length} atividades
					</p>
				</div>
				<Button onClick={() => setShowCreate(true)}>
					<Plus className="mr-2 h-4 w-4" />
					Adicionar atividade
				</Button>
			</div>

			<QueryState
				state={{
					isLoading: schedulesQuery.isLoading,
					isError: schedulesQuery.isError,
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
													`Arrastar ${id}: ${format(startAt, "dd/MM/yyyy")} \u2014 ${endAt ? format(endAt, "dd/MM/yyyy") : "\u2014"}`,
												);
											}}
										>
											{(feature) => {
												const schedule = schedules.find(
													(s) => s.id === feature.id,
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

				{schedules.length > 0 && (
					<div className="space-y-2">
						<h2 className="font-medium text-lg">Lista de atividades</h2>
						<ScheduleList
							schedules={schedules}
							deleteSchedule={deleteSchedule}
						/>
					</div>
				)}
			</QueryState>

			<ScheduleDialog
				open={showCreate}
				onOpenChange={setShowCreate}
				onSubmit={(values) => {
					createSchedule.mutate({ ...values, eventId } as never, {
						onSuccess: () => {
							toast.success("Atividade criada");
							setShowCreate(false);
						},
						onError: (e) => toast.error(e.message),
					});
				}}
				isLoading={createSchedule.isPending}
			/>
		</div>
	);
}
