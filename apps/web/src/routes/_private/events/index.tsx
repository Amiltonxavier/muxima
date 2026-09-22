import { Badge } from "@muxima/ui/components/badge";
import { Button } from "@muxima/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
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
import { Pagination } from "@muxima/ui/components/pagination";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@muxima/ui/components/select";
import { Textarea } from "@muxima/ui/components/textarea";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, Gift, MapPin, Plus, Search, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { CurrencyInput } from "@/shared/components/currency-input";
import { QueryState } from "@/shared/components/states";
import { createEventSchema } from "@/utils/event-schemas";
import { formatDate, getDaysRemaining } from "@/utils/format-date";
import {
	EVENT_STATUS_LABELS,
	getStatusColor,
	getStatusLabel,
} from "@/utils/status-helpers";
import {
	useCreateEvent,
	useDeleteEvent,
	useEvents,
} from "./-queries/event-queries";
import { dateHelper } from "@/shared/utils/date-helper";

export const Route = createFileRoute("/_private/events/")({
	component: EventsPage,
});

function EventsPage() {
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(20);
	const [search, setSearch] = useState("");
	const [filterStatus, setFilterStatus] = useState<
		"ALL" | "DRAFT" | "PLANNING" | "CONFIRMED" | "COMPLETED" | "CANCELLED"
	>("ALL");
	const [filterType, setFilterType] = useState<
		"ALL" | "ENGAGEMENT" | "WEDDING"
	>("ALL");

	const resetPage = useCallback(() => setPage(1), []);

	const eventsQuery = useEvents({
		page,
		limit,
		search: search || undefined,
		status: filterStatus !== "ALL" ? filterStatus : undefined,
		type: filterType !== "ALL" ? filterType : undefined,
	});
	const createEvent = useCreateEvent();
	const deleteEvent = useDeleteEvent();
	const [showCreateDialog, setShowCreateDialog] = useState(false);
	const [deleteId, setDeleteId] = useState<string | null>(null);

	const events = eventsQuery.data?.data ?? [];
	const meta = eventsQuery.data?.meta;

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="font-semibold text-2xl">Eventos</h1>
					<p className="text-muted-foreground text-sm">
						Gira os seus eventos de noivado e casamento
					</p>
				</div>
				<Button onClick={() => setShowCreateDialog(true)}>
					<Plus className="mr-2 h-4 w-4" />
					Criar evento
				</Button>
			</div>

			{/* Filters */}
			<div className="flex flex-wrap items-center gap-3">
				<div className="relative min-w-[200px] max-w-sm flex-1">
					<Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder="Pesquisar eventos..."
						value={search}
						onChange={(e) => {
							setSearch(e.target.value);
							resetPage();
						}}
						className="pl-9"
					/>
				</div>
				<Select
					value={filterStatus}
					onValueChange={(v) => {
						if (v) setFilterStatus(v as typeof filterStatus);
						resetPage();
					}}
				>
					<SelectTrigger className="w-[160px]">
						<SelectValue placeholder="Estado" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="ALL">Todos os estados</SelectItem>
						{Object.entries(EVENT_STATUS_LABELS).map(([value, label]) => (
							<SelectItem key={value} value={value}>
								{label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Select
					value={filterType}
					onValueChange={(v) => {
						if (v) setFilterType(v as typeof filterType);
						resetPage();
					}}
				>
					<SelectTrigger className="w-[160px]">
						<SelectValue placeholder="Tipo" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="ALL">Todos os tipos</SelectItem>
						<SelectItem value="WEDDING">Casamento</SelectItem>
						<SelectItem value="ENGAGEMENT">Noivado</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<QueryState
				state={{
					isLoading: eventsQuery.isLoading,
					isError: eventsQuery.isError,
					isEmpty: false,
					hasData: events.length > 0,
				}}
			>
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{events.map((event: Record<string, unknown>) => {
						const daysRemaining = event.eventDate
							? getDaysRemaining(event.eventDate as string)
							: null;
						return (
							<Card key={event.id as string}>
								<CardHeader>
									<div className="flex items-start justify-between">
										<div className="space-y-1">
											<CardTitle>{event.name as string}</CardTitle>
											<div className="flex items-center gap-2 text-muted-foreground text-xs">
												<Calendar className="h-3 w-3" />
												<span>
													{event.eventDate
														? dateHelper.formatShort(event.eventDate as string)
														: "-"}
												</span>
											</div>
										</div>
										<Badge
											className={getStatusColor(
												(event.status as string) || "DRAFT",
											)}
										>
											{getStatusLabel(
												(event.status as string) || "DRAFT",
												"event",
											)}
										</Badge>
									</div>
								</CardHeader>
								<CardContent>
									<div className="space-y-3">
										<div className="flex items-center gap-2 text-muted-foreground text-xs">
											<MapPin className="h-3 w-3" />
											<span>
												{event.venueName
													? (event.venueName as string)
													: "Local não definido"}
											</span>
										</div>
										{daysRemaining !== null && (
											<div className="text-muted-foreground text-xs">
												{daysRemaining > 0
													? `${daysRemaining} dias restantes`
													: daysRemaining === 0
														? "É hoje!"
														: "Evento realizado"}
											</div>
										)}
										<div className="flex items-center justify-between pt-2">
											<Button
												variant="ghost"
												size="sm"
												render={
													<Link
														to="/events/$eventId"
														params={{ eventId: String(event.id) }}
													/>
												}
											>
												Ver detalhes →
											</Button>
											<div className="flex gap-1">
												<Button
													variant="ghost"
													size="icon-sm"
													className="text-destructive"
													onClick={() => setDeleteId(event.id as string)}
												>
													<Trash2 className="h-3.5 w-3.5" />
												</Button>
											</div>
										</div>
									</div>
								</CardContent>
							</Card>
						);
					})}
				</div>
			</QueryState>

			{meta && (
				<Pagination
					meta={meta}
					onPageChange={setPage}
					onLimitChange={(l) => {
						setLimit(l);
						setPage(1);
					}}
					disabled={eventsQuery.isLoading}
				/>
			)}

			{events.length === 0 && !eventsQuery.isLoading && (
				<div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
					<Gift className="mb-4 h-12 w-12 text-muted-foreground" />
					<h3 className="font-medium text-lg">Ainda não possui eventos</h3>
					<p className="mb-4 text-muted-foreground text-sm">
						Crie o seu primeiro evento para começar a planear
					</p>
					<Button onClick={() => setShowCreateDialog(true)}>
						<Plus className="mr-2 h-4 w-4" />
						Criar evento
					</Button>
				</div>
			)}

			<CreateEventDialog
				open={showCreateDialog}
				onOpenChange={setShowCreateDialog}
				onSubmit={(values) => {
					createEvent.mutate(values, {
						onSuccess: () => {
							toast.success("Evento criado com sucesso");
							setShowCreateDialog(false);
						},
						onError: (error) => {
							toast.error(error.message || "Erro ao criar evento");
						},
					});
				}}
				isLoading={createEvent.isPending}
			/>

			<Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Eliminar evento</DialogTitle>
						<DialogDescription>
							Tem a certeza que deseja eliminar este evento? Esta ação não pode
							ser desfeita.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDeleteId(null)}>
							Cancelar
						</Button>
						<Button
							variant="destructive"
							onClick={() => {
								if (deleteId) {
									deleteEvent.mutate(
										{ id: deleteId },
										{
											onSuccess: () => {
												toast.success("Evento eliminado");
												setDeleteId(null);
											},
											onError: (error) => {
												toast.error(error.message);
											},
										},
									);
								}
							}}
							disabled={deleteEvent.isPending}
						>
							Eliminar
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

function CreateEventDialog({
	open,
	onOpenChange,
	onSubmit,
	isLoading,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: {
		name: string;
		type: "ENGAGEMENT" | "WEDDING";
		eventDate?: string;
		venueName?: string;
		description?: string;
		capacity?: number;
		budgetAmount?: number;
	}) => void;
	isLoading: boolean;
}) {
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
			onSubmit(result.data);
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
									disabled={isLoading}
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
									disabled={isLoading}
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
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancelar
						</Button>
						<Button type="submit" disabled={isLoading}>
							{isLoading ? "A criar..." : "Criar evento"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
