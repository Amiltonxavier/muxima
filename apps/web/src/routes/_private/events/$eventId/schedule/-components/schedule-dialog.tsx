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
import { toast } from "sonner";
import { scheduleSchema } from "@/utils/task-schemas";
import type { ScheduleFormValues } from "../-types/schedule.types";

export function ScheduleDialog({
	open,
	onOpenChange,
	onSubmit,
	isLoading,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: ScheduleFormValues) => void;
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
			const result = scheduleSchema.safeParse(value);
			if (!result.success) {
				toast.error(result.error.issues[0].message);
				return;
			}
			onSubmit(result.data);
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
