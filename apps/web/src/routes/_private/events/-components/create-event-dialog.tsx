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
import { CurrencyInput } from "@/shared/components/currency-input";
import { useForm } from "@tanstack/react-form";
import { useCreateEvent } from "../-queries/event-queries";
import { createEventSchema } from "../-schema/event-schemas";
import { toast } from "sonner";

export function CreateEventDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const { mutateAsync, isPending } = useCreateEvent();

	const form = useForm({
		defaultValues: {
			name: "",
			type: "WEDDING" as "ENGAGEMENT" | "WEDDING",
			eventDate: "",
			venueName: "",
			description: "",
			capacity: 0,
			budgetAmount: 0,
		},
		onSubmit: async ({ value }) => {
			const result = createEventSchema.safeParse(value);
			if (!result.success) {
				toast.error(result.error.issues[0].message);
				return;
			}
			await mutateAsync(result.data);
			toast.success("Evento criado com sucesso");
			onOpenChange(false);
		},
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>Criar evento</DialogTitle>
					<DialogDescription>
						Adicione os detalhes do seu novo evento
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
								<Label htmlFor={field.name}>Nome do evento</Label>
								<Input
									id={field.name}
									placeholder="Ex: Casamento Maria e João"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									disabled={isPending}
								/>
							</div>
						)}
					</form.Field>

					<form.Field name="type">
						{(field) => (
							<div className="space-y-2">
								<Label>Tipo de evento</Label>
								<Select
									items={[
										{ value: "WEDDING", label: "Casamento" },
										{ value: "ENGAGEMENT", label: "Noivado" },
									]}
									value={field.state.value}
									onValueChange={(v) =>
										field.handleChange(v as "ENGAGEMENT" | "WEDDING")
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="WEDDING">Casamento</SelectItem>
										<SelectItem value="ENGAGEMENT">Noivado</SelectItem>
									</SelectContent>
								</Select>
							</div>
						)}
					</form.Field>

					<form.Field name="eventDate">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor={field.name}>Data do evento</Label>
								<Input
									id={field.name}
									type="date"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									disabled={isPending}
								/>
							</div>
						)}
					</form.Field>

					<form.Field name="venueName">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor={field.name}>Local</Label>
								<Input
									id={field.name}
									placeholder="Ex: Hotel Talatona"
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
								<Label htmlFor={field.name}>Capacidade</Label>
								<Input
									id={field.name}
									type="number"
									placeholder="Número de convidados"
									value={field.state.value || ""}
									onChange={(e) =>
										field.handleChange(Number(e.target.value) || 0)
									}
									disabled={isPending}
								/>
							</div>
						)}
					</form.Field>

					<form.Field name="budgetAmount">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor={field.name}>Orçamento (Kz)</Label>
								<CurrencyInput
									id={field.name}
									value={field.state.value || 0}
									onChange={(v) => field.handleChange(v)}
									disabled={isPending}
								/>
							</div>
						)}
					</form.Field>

					<form.Field name="description">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor={field.name}>Descrição</Label>
								<Textarea
									id={field.name}
									placeholder="Detalhes adicionais sobre o evento..."
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
							onClick={() => onOpenChange(false)}
						>
							Cancelar
						</Button>
						<Button type="submit" disabled={isPending}>
							{isPending ? "A criar..." : "Criar evento"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
