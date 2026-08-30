import { Badge } from "@muxima/ui/components/badge";
import { Button } from "@muxima/ui/components/button";
import { Card, CardContent } from "@muxima/ui/components/card";
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
import { useForm } from "@tanstack/react-form";
import { createFileRoute } from "@tanstack/react-router";
import { Clock, MapPin, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BackButton } from "@/shared/components/back-to";
import { QueryState } from "@/shared/components/states";
import {
	useCreateSchedule,
	useDeleteSchedule,
	useSchedules,
	useUpdateSchedule,
} from "@/shared/queries/schedule-queries";
import { formatDateTime } from "@/utils/format-date";
import { scheduleSchema } from "@/utils/task-schemas";

export const Route = createFileRoute("/_private/events/$eventId/schedule/")({
	component: SchedulePage,
});

function SchedulePage() {
	const { eventId } = Route.useParams();

	const schedulesQuery = useSchedules(eventId);
	const createSchedule = useCreateSchedule();
	const deleteSchedule = useDeleteSchedule();
	const _updateSchedule = useUpdateSchedule();

	const [showCreate, setShowCreate] = useState(false);
	const [deleteId, setDeleteId] = useState<string | null>(null);

	const schedules = schedulesQuery.data ?? [];

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
				<div className="space-y-3">
					{schedules.map((schedule: Record<string, unknown>) => (
						<Card key={schedule.id as string}>
							<CardContent className="p-4">
								<div className="flex items-center justify-between">
									<div className="space-y-1">
										<div className="flex items-center gap-2">
											<p className="font-medium text-sm">
												{String(schedule.title || "")}
											</p>
											<Badge variant="secondary">
												{(schedule.status as string) || "PENDING"}
											</Badge>
										</div>
										<div className="flex items-center gap-4 text-muted-foreground text-xs">
											<span className="flex items-center gap-1">
												<Clock className="h-3 w-3" />
												{schedule.startAt
													? formatDateTime(schedule.startAt as string)
													: "—"}
											</span>
											{Boolean(schedule.location) && (
												<span className="flex items-center gap-1">
													<MapPin className="h-3 w-3" />
													{String(schedule.location || "")}
												</span>
											)}
										</div>
										{Boolean(schedule.description) && (
											<p className="text-muted-foreground text-xs">
												{String(schedule.description || "")}
											</p>
										)}
									</div>
									<Button
										variant="ghost"
										size="icon-sm"
										className="text-destructive"
										onClick={() => setDeleteId(schedule.id as string)}
									>
										<Trash2 className="h-3.5 w-3.5" />
									</Button>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			</QueryState>

			<ScheduleDialog
				open={showCreate}
				onOpenChange={setShowCreate}
				onSubmit={(values) => {
					createSchedule.mutate(
						{ ...values, eventId },
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

function ScheduleDialog({
	open,
	onOpenChange,
	onSubmit,
	isLoading,
}: {
	open: boolean;
	onOpenChange: (o: boolean) => void;
	onSubmit: (v: any) => void;
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
