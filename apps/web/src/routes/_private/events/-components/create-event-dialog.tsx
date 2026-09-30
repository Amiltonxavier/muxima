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
import { toast } from "sonner";
import { CurrencyInput } from "@/shared/components/currency-input";
import { createEventSchema } from "@/utils/event-schemas";
import { EVENT_TYPE_OPTIONS } from "../-constants/events.constants";
import { useCreateEvent } from "../-queries/event-queries";
import type { CreateEventFormValues } from "../-types/events.types";

const EMPTY_FORM: CreateEventFormValues = {
	name: "",
	type: "WEDDING",
	eventDate: "",
	startTime: "",
	endTime: "",
	venueName: "",
	address: "",
	province: "",
	municipality: "",
	neighborhood: "",
	reference: "",
	description: "",
	capacity: 0,
	budgetAmount: 0,
};

/**
 * The only create path in the list. It owns the mutation and the toasts, so the
 * page just toggles it open.
 */
export function CreateEventDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const createEvent = useCreateEvent();

	function handleSubmit(values: CreateEventFormValues) {
		const result = createEventSchema.safeParse(values);
		if (!result.success) {
			toast.error(result.error.issues[0].message);
			return;
		}

		// O fim tem de ser posterior ao início ("HH:mm" compara-se como string).
		if (result.data.endTime <= result.data.startTime) {
			toast.error("O horário de fim deve ser posterior ao horário de início");
			return;
		}

		createEvent.mutate(result.data, {
			onSuccess: () => {
				toast.success("Evento criado com sucesso");
				onOpenChange(false);
			},
			onError: (error) => toast.error(error.message || "Erro ao criar evento"),
		});
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Criar evento</DialogTitle>
					<DialogDescription>
						Adicione os detalhes do seu novo evento
					</DialogDescription>
				</DialogHeader>

				{/*
				 * Mounted only while open so `defaultValues` is read fresh on every
				 * open — otherwise the previous attempt's values survive.
				 */}
				{open && (
					<CreateEventForm
						isLoading={createEvent.isPending}
						onSubmit={handleSubmit}
						onCancel={() => onOpenChange(false)}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}

function CreateEventForm({
	isLoading,
	onSubmit,
	onCancel,
}: {
	isLoading: boolean;
	onSubmit: (values: CreateEventFormValues) => void;
	onCancel: () => void;
}) {
	const form = useForm({
		defaultValues: EMPTY_FORM,
		onSubmit: async ({ value }) => onSubmit(value),
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
			<form.Field name="name">
				{(field) => (
					<div className="space-y-2">
						<Label htmlFor={field.name}>Nome do evento</Label>
						<Input
							id={field.name}
							placeholder="Ex: Casamento Maria e João"
							value={field.state.value}
							onChange={(e) => field.handleChange(e.target.value)}
							disabled={isLoading}
						/>
					</div>
				)}
			</form.Field>

			<form.Field name="type">
				{(field) => (
					<div className="space-y-2">
						<Label>Tipo de evento</Label>
						<Select
							value={field.state.value}
							onValueChange={(v) => {
								if (v) field.handleChange(v as typeof field.state.value);
							}}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{EVENT_TYPE_OPTIONS.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				)}
			</form.Field>

			<div className="grid grid-cols-2 gap-4">
				<form.Field name="eventDate">
					{(field) => (
						<div className="space-y-2">
							<Label htmlFor={field.name}>Data do evento</Label>
							<Input
								id={field.name}
								type="date"
								value={field.state.value}
								onChange={(e) => field.handleChange(e.target.value)}
								disabled={isLoading}
							/>
						</div>
					)}
				</form.Field>

				<div className="grid grid-cols-2 gap-4">
					<form.Field name="startTime">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor={field.name}>Início</Label>
								<Input
									id={field.name}
									type="time"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									disabled={isLoading}
								/>
							</div>
						)}
					</form.Field>

					<form.Field name="endTime">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor={field.name}>Fim</Label>
								<Input
									id={field.name}
									type="time"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									disabled={isLoading}
								/>
							</div>
						)}
					</form.Field>
				</div>
			</div>

			<fieldset className="space-y-4 rounded border p-4">
				<legend className="px-1 font-medium text-sm">Localização</legend>

				<form.Field name="venueName">
					{(field) => (
						<div className="space-y-2">
							<Label htmlFor={field.name}>Local</Label>
							<Input
								id={field.name}
								placeholder="Ex: Hotel Talatona"
								value={field.state.value}
								onChange={(e) => field.handleChange(e.target.value)}
								disabled={isLoading}
							/>
						</div>
					)}
				</form.Field>

				<div className="grid grid-cols-2 gap-4">
					<form.Field name="address">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor={field.name}>Morada</Label>
								<Input
									id={field.name}
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									disabled={isLoading}
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
								<Label htmlFor={field.name}>Município</Label>
								<Input
									id={field.name}
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									disabled={isLoading}
								/>
							</div>
						)}
					</form.Field>

					<form.Field name="neighborhood">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor={field.name}>Bairro</Label>
								<Input
									id={field.name}
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									disabled={isLoading}
								/>
							</div>
						)}
					</form.Field>
				</div>

				<form.Field name="reference">
					{(field) => (
						<div className="space-y-2">
							<Label htmlFor={field.name}>Referência</Label>
							<Input
								id={field.name}
								placeholder="Ex: junto ao Lago Talatona"
								value={field.state.value}
								onChange={(e) => field.handleChange(e.target.value)}
								disabled={isLoading}
							/>
						</div>
					)}
				</form.Field>
			</fieldset>

			<form.Field name="capacity">
				{(field) => (
					<div className="space-y-2">
						<Label htmlFor={field.name}>Capacidade</Label>
						<Input
							id={field.name}
							type="number"
							placeholder="Número de convidados"
							value={field.state.value || ""}
							onChange={(e) => field.handleChange(Number(e.target.value) || 0)}
							disabled={isLoading}
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
							disabled={isLoading}
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
							disabled={isLoading}
						/>
					</div>
				)}
			</form.Field>

			<DialogFooter>
				<Button type="button" variant="outline" onClick={onCancel}>
					Cancelar
				</Button>
				<Button type="submit" disabled={isLoading}>
					{isLoading ? "A criar..." : "Criar evento"}
				</Button>
			</DialogFooter>
		</form>
	);
}
