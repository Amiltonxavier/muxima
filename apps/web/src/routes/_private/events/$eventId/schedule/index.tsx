import { Badge } from "@muxima/ui/components/badge";
import { Button } from "@muxima/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@muxima/ui/components/dialog";
import { Input } from "@muxima/ui/components/input";
import { Label } from "@muxima/ui/components/label";
import { Textarea } from "@muxima/ui/components/textarea";
import {
	GanttFeatureItem,
	GanttFeatureList,
	GanttFeatureListGroup,
	GanttFeatureRow,
	GanttHeader,
	GanttMarker,
	GanttProvider,
	GanttSidebar,
	GanttSidebarGroup,
	GanttSidebarItem,
	GanttToday,
	GanttTimeline,
	type GanttFeature,
	type GanttStatus,
} from "@muxima/ui/components/kibo-ui/gantt";
import { useForm } from "@tanstack/react-form";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { Clock, MapPin, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BackButton } from "@/shared/components/back-to";
import { QueryState } from "@/shared/components/states";
import {
	useCreateSchedule,
	useDeleteSchedule,
	useSchedules,
} from "@/shared/queries/schedule-queries";
import { scheduleSchema } from "@/utils/task-schemas";

export const Route = createFileRoute("/_private/events/$eventId/schedule/")({
	component: SchedulePage,
});

const STATUS_MAP: Record<string, GanttStatus> = {
	PENDING: { id: "PENDING", name: "Pendente", color: "#eab308" },
	IN_PROGRESS: { id: "IN_PROGRESS", name: "Em andamento", color: "#3b82f6" },
	COMPLETED: { id: "COMPLETED", name: "Concluído", color: "#22c55e" },
	CANCELLED: { id: "CANCELLED", name: "Cancelado", color: "#ef4444" },
};

const STATUS_LABELS: Record<string, string> = {
	PENDING: "Pendente",
	IN_PROGRESS: "Em andamento",
	COMPLETED: "Concluído",
	CANCELLED: "Cancelado",
};

function SchedulePage() {
	const { eventId } = Route.useParams();

	const schedulesQuery = useSchedules(eventId);
	const createSchedule = useCreateSchedule();
	const deleteSchedule = useDeleteSchedule();

	const [showCreate, setShowCreate] = useState(false);
	const [deleteId, setDeleteId] = useState<string | null>(null);

	const schedules = schedulesQuery.data ?? [];

	// Convert schedules to Gantt features
	const ganttFeatures: GanttFeature[] = useMemo(() => {
		return schedules
			.filter((s: Record<string, unknown>) => {
				const start = s.startAt ? new Date(s.startAt as string) : null;
				return start && !Number.isNaN(start.getTime());
			})
			.map((s: Record<string, unknown>) => {
				const startAt = new Date(s.startAt as string);
				const endAt = s.endAt
					? new Date(s.endAt as string)
					: new Date(startAt.getTime() + 2 * 60 * 60 * 1000); // default 2h

				return {
					id: s.id as string,
					name: (s.title as string) || "Sem título",
					startAt,
					endAt,
					status: STATUS_MAP[(s.status as string) || "PENDING"] || STATUS_MAP.PENDING,
					lane: (s.responsible as string) || undefined,
				};
			});
	}, [schedules]);

	// Group features by responsible
	const groupedFeatures = useMemo(() => {
		const groups: Record<string, GanttFeature[]> = {};
		for (const feature of ganttFeatures) {
			const lane = feature.lane || "Geral";
			if (!groups[lane]) groups[lane] = [];
			groups[lane].push(feature);
		}
		return groups;
	}, [ganttFeatures]);

	// Markers for schedules with locations
	const markers = useMemo(() => {
		return ganttFeatures
			.filter((f) => {
				const schedule = schedules.find(
					(s: Record<string, unknown>) => s.id === f.id,
				);
				return schedule?.location;
			})
			.map((f) => {
				const schedule = schedules.find(
					(s: Record<string, unknown>) => s.id === f.id,
				);
				return {
					id: `marker-${f.id}`,
					date: f.startAt,
					label: `${f.name} — ${String(schedule?.location || "")}`,
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
										<GanttSidebarItem
											key={feature.id}
											feature={feature}
										/>
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
											{(feature) => {
												const schedule = schedules.find(
													(s: Record<string, unknown>) => s.id === feature.id,
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

			{/* Schedule List (compact view below Gantt) */}
			{schedules.length > 0 && (
				<div className="space-y-2">
					<h2 className="font-medium text-lg">Lista de atividades</h2>
					<div className="space-y-1">
						{schedules.map((schedule: Record<string, unknown>) => (
							<div
								key={schedule.id as string}
								className="flex items-center justify-between rounded-md border px-4 py-2"
							>
								<div className="flex items-center gap-3">
									<div
										className="h-2.5 w-2.5 rounded-full"
										style={{
											backgroundColor:
												STATUS_MAP[(schedule.status as string) || "PENDING"]
													?.color || "#eab308",
										}}
									/>
									<div>
										<p className="font-medium text-sm">
											{String(schedule.title || "")}
										</p>
										<div className="flex items-center gap-3 text-muted-foreground text-xs">
											{schedule.startAt ? (
												<span className="flex items-center gap-1">
													<Clock className="h-3 w-3" />
													{format(new Date(schedule.startAt as string), "dd/MM/yyyy HH:mm")}
													{schedule.endAt
														? ` — ${format(new Date(schedule.endAt as string), "HH:mm")}`
														: ""}
												</span>
											) : null}
											{schedule.location ? (
												<span className="flex items-center gap-1">
													<MapPin className="h-3 w-3" />
													{String(schedule.location)}
												</span>
											) : null}
										</div>
									</div>
								</div>
								<div className="flex items-center gap-2">
									<Badge variant="secondary">
										{STATUS_LABELS[(schedule.status as string) || "PENDING"] || "Pendente"}
									</Badge>
									<Button
										variant="ghost"
										size="icon-sm"
										className="text-destructive"
										onClick={() => setDeleteId(schedule.id as string)}
									>
										<Trash2 className="h-3.5 w-3.5" />
									</Button>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Create Dialog */}
			<ScheduleDialog
				open={showCreate}
				onOpenChange={setShowCreate}
				onSubmit={(values) => {
					createSchedule.mutate(
						{ ...values, eventId } as never,
						{
							onSuccess: () => {
								toast.success("Atividade criada");
								setShowCreate(false);
							},
							onError: (e) => toast.error(e.message),
						},
					);
				}}
				isLoading={createSchedule.isPending}
			/>

			{/* Delete Confirmation */}
			<Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Eliminar atividade</DialogTitle>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDeleteId(null)}>
							Cancelar
						</Button>
						<Button
							variant="destructive"
							onClick={() => {
								if (deleteId)
									deleteSchedule.mutate(
										{ id: deleteId },
										{
											onSuccess: () => {
												toast.success("Eliminada");
												setDeleteId(null);
											},
											onError: (e) => toast.error(e.message),
										},
									);
							}}
							disabled={deleteSchedule.isPending}
						>
							Eliminar
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

// ========================
// Schedule Dialog (Create)
// ========================
function ScheduleDialog({
	open,
	onOpenChange,
	onSubmit,
	isLoading,
}: {
	open: boolean;
	onOpenChange: (o: boolean) => void;
	onSubmit: (v: Record<string, unknown>) => void;
	isLoading: boolean;
}) {
	const form = useForm({
		defaultValues: {
			title: "",
			description: "",
			startAt: "",
			endAt: "",
			location: "",
			responsible: "",
		},
		onSubmit: async ({ value }) => {
			const r = scheduleSchema.safeParse(value);
			if (!r.success) {
				toast.error(r.error.issues[0].message);
				return;
			}
			onSubmit(r.data);
		},
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>Adicionar atividade</DialogTitle>
				</DialogHeader>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-4"
				>
					<form.Field name="title">
						{(field) => (
							<div className="space-y-2">
								<Label>Título</Label>
								<Input
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									disabled={isLoading}
								/>
							</div>
						)}
					</form.Field>
					<div className="grid grid-cols-2 gap-4">
						<form.Field name="startAt">
							{(field) => (
								<div className="space-y-2">
									<Label>Data/Hora início</Label>
									<Input
										type="datetime-local"
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										disabled={isLoading}
									/>
								</div>
							)}
						</form.Field>
						<form.Field name="endAt">
							{(field) => (
								<div className="space-y-2">
									<Label>Data/Hora fim</Label>
									<Input
										type="datetime-local"
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										disabled={isLoading}
									/>
								</div>
							)}
						</form.Field>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<form.Field name="location">
							{(field) => (
								<div className="space-y-2">
									<Label>Local</Label>
									<Input
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										disabled={isLoading}
									/>
								</div>
							)}
						</form.Field>
						<form.Field name="responsible">
							{(field) => (
								<div className="space-y-2">
									<Label>Responsável</Label>
									<Input
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										disabled={isLoading}
									/>
								</div>
							)}
						</form.Field>
					</div>
					<form.Field name="description">
						{(field) => (
							<div className="space-y-2">
								<Label>Descrição</Label>
								<Textarea
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									disabled={isLoading}
								/>
							</div>
						)}
					</form.Field>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancelar
						</Button>
						<Button type="submit" disabled={isLoading}>
							{isLoading ? "A adicionar..." : "Adicionar"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
