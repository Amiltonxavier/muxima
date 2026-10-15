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
import { useForm } from "@tanstack/react-form";
import { format } from "date-fns";
import { toast } from "sonner";
import { scheduleSchema } from "@/utils/task-schemas";
import { useUpdateSchedule } from "../-queries/schedule-queries";
import type {
	ScheduleFormValues,
	ScheduleItem,
} from "../-types/schedule.types";

function toDateTimeLocal(value: Date | string | null): string {
	return value ? format(new Date(value), "yyyy-MM-dd'T'HH:mm") : "";
}

function toFormValues(schedule: ScheduleItem): ScheduleFormValues {
	return {
		title: schedule.title,
		description: schedule.description ?? "",
		startAt: toDateTimeLocal(schedule.startAt),
		endAt: toDateTimeLocal(schedule.endAt),
		location: schedule.location ?? "",
		responsible: schedule.responsible ?? "",
	};
}

export function ScheduleEditDialog({
	schedule,
	open,
	onOpenChange,
}: {
	schedule: ScheduleItem | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const updateSchedule = useUpdateSchedule();

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>Editar atividade</DialogTitle>
				</DialogHeader>

				{schedule && (
					<ScheduleEditForm
						// Re-mounts with the current row each time the dialog opens.
						key={schedule.id}
						schedule={schedule}
						isPending={updateSchedule.isPending}
						onCancel={() => onOpenChange(false)}
						onSubmit={(values) => {
							updateSchedule.mutate(
								{ id: schedule.id, ...values },
								{
									onSuccess: () => {
										toast.success("Atividade actualizada");
										onOpenChange(false);
									},
								},
							);
						}}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}

function ScheduleEditForm({
	schedule,
	isPending,
	onCancel,
	onSubmit,
}: {
	schedule: ScheduleItem;
	isPending: boolean;
	onCancel: () => void;
	onSubmit: (values: ScheduleFormValues) => void;
}) {
	const form = useForm({
		defaultValues: toFormValues(schedule),
		onSubmit: async ({ value }) => {
			const result = scheduleSchema.safeParse(value);
			if (!result.success) {
				toast.error(result.error.issues[0].message);
				return;
			}
			onSubmit(result.data);
		},
	});

	return (
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
							disabled={isPending}
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
								disabled={isPending}
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
								disabled={isPending}
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
								disabled={isPending}
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
								disabled={isPending}
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
							disabled={isPending}
						/>
					</div>
				)}
			</form.Field>
			<DialogFooter>
				<Button
					type="button"
					variant="outline"
					onClick={onCancel}
					disabled={isPending}
				>
					Cancelar
				</Button>
				<Button type="submit" disabled={isPending}>
					{isPending ? "A guardar..." : "Guardar"}
				</Button>
			</DialogFooter>
		</form>
	);
}
