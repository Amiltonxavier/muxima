import { ANGOLA_PROVINCES } from "@muxima/api/shared/validation/angola";
import { Button } from "@muxima/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@muxima/ui/components/dialog";
import { Input } from "@muxima/ui/components/input";
import { Label } from "@muxima/ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@muxima/ui/components/select";
import { Textarea } from "@muxima/ui/components/textarea";
import { useForm } from "@tanstack/react-form";
import { EVENT_STATUS_LABELS } from "@/utils/status-helpers";
import { useUpdateEvent } from "../../-queries/event-queries";

interface EditEventDialogProps {
	open: boolean;
	onOpenChange: VoidFunction;

	event: {
		name?: string | null;
		status?: string | null;
		eventDate?: string | Date | null;
		startTime?: string | null;
		endTime?: string | null;
		venueName?: string | null;
		address?: string | null;
		province?: string | null;
		municipality?: string | null;
		neighborhood?: string | null;
		reference?: string | null;
		capacity?: number | null;
		description?: string | null;
	};
	eventId: string;
}

export function EditEventDialog({
	open,
	onOpenChange,
	event,
	eventId,
}: EditEventDialogProps) {
	const { mutateAsync, isPending } = useUpdateEvent();

	function formatDateForInput(value: unknown): string {
		if (!value) return "";

		const date = new Date(String(value));

		if (Number.isNaN(date.getTime())) {
			return "";
		}

		return date.toISOString().split("T")[0];
	}

	type EventStatusValue =
		| "DRAFT"
		| "PLANNING"
		| "CONFIRMED"
		| "ONGOING"
		| "COMPLETED"
		| "CANCELLED";

	const form = useForm({
		defaultValues: {
			name: event.name || "",
			status: (event.status || "DRAFT") as EventStatusValue,
			eventDate: formatDateForInput(event.eventDate),
			startTime: event.startTime || "",
			endTime: event.endTime || "",
			venueName: event.venueName || "",
			address: event.address || "",
			province: event.province || "",
			municipality: event.municipality || "",
			neighborhood: event.neighborhood || "",
			reference: event.reference || "",
			capacity: event.capacity || 0,
			description: event.description || "",
		},
		onSubmit: async ({ value }) => {
			await mutateAsync({ id: eventId, ...value }).then(() => {
				onClose();
			});
		},
	});

	const onClose = () => {
		if (isPending) return;
		onOpenChange();
		form.reset();
	};

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Editar evento</DialogTitle>
					<DialogDescription>
						Altere os dados do evento "{event.name}"
					</DialogDescription>
				</DialogHeader>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-4"
				>
					<form.Field name="name">
						{(field) => (
							<div className="space-y-2">
								<Label>Nome do evento</Label>
								<Input
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									disabled={isPending}
								/>
							</div>
						)}
					</form.Field>

					<div className="grid grid-cols-2 gap-4">
						<form.Field name="status">
							{(field) => (
								<div className="space-y-2">
									<Label>Estado</Label>
									<Select
										items={Object.entries(EVENT_STATUS_LABELS).map(
											([value, label]) => ({ value, label }),
										)}
										value={field.state.value}
										onValueChange={(v) =>
											field.handleChange((v ?? "DRAFT") as EventStatusValue)
										}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{Object.entries(EVENT_STATUS_LABELS).map(
												([key, label]) => (
													<SelectItem key={key} value={key}>
														{label}
													</SelectItem>
												),
											)}
										</SelectContent>
									</Select>
								</div>
							)}
						</form.Field>
						<form.Field name="eventDate">
							{(field) => (
								<div className="space-y-2">
									<Label>Data do evento</Label>
									<Input
										type="date"
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										disabled={isPending}
									/>
								</div>
							)}
						</form.Field>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<form.Field name="startTime">
							{(field) => (
								<div className="space-y-2">
									<Label>Hora início</Label>
									<Input
										type="time"
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										disabled={isPending}
									/>
								</div>
							)}
						</form.Field>
						<form.Field name="endTime">
							{(field) => (
								<div className="space-y-2">
									<Label>Hora fim</Label>
									<Input
										type="time"
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										disabled={isPending}
									/>
								</div>
							)}
						</form.Field>
					</div>

					<form.Field name="venueName">
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

					<form.Field name="capacity">
						{(field) => (
							<div className="space-y-2">
								<Label>Capacidade</Label>
								<Input
									type="number"
									value={field.state.value || ""}
									onChange={(e) =>
										field.handleChange(Number(e.target.value) || 0)
									}
									disabled={isPending}
								/>
							</div>
						)}
					</form.Field>

					<div className="grid grid-cols-2 gap-4">
						<form.Field name="address">
							{(field) => (
								<div className="space-y-2">
									<Label>Morada</Label>
									<Input
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										disabled={isPending}
									/>
								</div>
							)}
						</form.Field>
						<form.Field name="province">
							{(field) => (
								<div className="space-y-2">
									<Label>Província</Label>
									<Select
										value={field.state.value}
										onValueChange={(v) => {
											if (v) field.handleChange(v);
										}}
										disabled={isPending}
									>
										<SelectTrigger>
											<SelectValue placeholder="Selecionar província" />
										</SelectTrigger>
										<SelectContent>
											{ANGOLA_PROVINCES.map((province) => (
												<SelectItem key={province} value={province}>
													{province}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							)}
						</form.Field>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<form.Field name="municipality">
							{(field) => (
								<div className="space-y-2">
									<Label>Município</Label>
									<Input
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										disabled={isPending}
									/>
								</div>
							)}
						</form.Field>
						<form.Field name="neighborhood">
							{(field) => (
								<div className="space-y-2">
									<Label>Bairro</Label>
									<Input
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										disabled={isPending}
									/>
								</div>
							)}
						</form.Field>
					</div>

					<form.Field name="reference">
						{(field) => (
							<div className="space-y-2">
								<Label>Referência</Label>
								<Input
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									disabled={isPending}
								/>
							</div>
						)}
					</form.Field>

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
						<Button type="button" variant="outline" onClick={onClose}>
							Cancelar
						</Button>
						<Button type="submit" disabled={isPending}>
							{isPending ? "A guardar..." : "Guardar alterações"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
