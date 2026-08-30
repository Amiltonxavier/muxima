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
import { Progress } from "@muxima/ui/components/progress";
import { ProgressDonut } from "@/shared/components/charts";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@muxima/ui/components/select";
import { Textarea } from "@muxima/ui/components/textarea";
import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	AlertTriangle,
	ArrowLeft,
	Calendar,
	Clock,
	CreditCard,
	FileText,
	Gift,
	MapPin,
	Package,
	Pencil,
	Trash2,
	Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BackButton } from "@/shared/components/back-to";
import { formatCurrency } from "@/utils/format-currency";
import { formatDate } from "@/utils/format-date";
import { orpc } from "@/utils/orpc";
import {
	EVENT_STATUS_LABELS,
	getStatusColor,
	getStatusLabel,
	TASK_STATUS_LABELS,
	VENDOR_CATEGORY_LABELS,
} from "@/utils/status-helpers";
import {
	useDeleteEvent,
	useEvent,
	useUpdateEvent,
} from "../-queries/event-queries";

export const Route = createFileRoute("/_private/events/$eventId/")({
	component: EventDetailPage,
});

function EventDetailPage() {
	const { eventId } = Route.useParams();
	const eventQuery = useEvent(eventId);
	const deleteEvent = useDeleteEvent();
	const updateEvent = useUpdateEvent();
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [showEditDialog, setShowEditDialog] = useState(false);

	if (eventQuery.isLoading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center gap-2">
					<div className="h-8 w-8 animate-pulse rounded bg-muted" />
					<div className="h-6 w-48 animate-pulse rounded bg-muted" />
				</div>
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{Array.from({ length: 6 }).map((_, i) => (
						<Card key={i}>
							<CardContent className="p-6">
								<div className="space-y-3">
									<div className="h-4 w-32 animate-pulse rounded bg-muted" />
									<div className="h-3 w-full animate-pulse rounded bg-muted" />
									<div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		);
	}

	if (eventQuery.isError || !eventQuery.data) {
		return (
			<div className="flex flex-col items-center justify-center py-20">
				<AlertTriangle className="mb-4 h-12 w-12 text-destructive" />
				<h2 className="mb-2 font-semibold text-lg">Evento não encontrado</h2>
				<p className="mb-4 text-muted-foreground text-sm">
					O evento que procura não existe ou foi eliminado.
				</p>
				<Button render={<Link to="/events" />}>
					<ArrowLeft className="mr-2 h-4 w-4" />
					Voltar aos eventos
				</Button>
			</div>
		);
	}

	const event = eventQuery.data as Record<string, unknown>;
	const members = (event.members as Record<string, unknown>[]) ?? [];

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-start justify-between">
				<div className="space-y-1">
					<BackButton to="/events" label="Eventos" />
					<div className="flex items-center gap-3">
						<h1 className="font-semibold text-2xl">{String(event.name)}</h1>{" "}
						<Select
							items={Object.entries(EVENT_STATUS_LABELS).map(
								([value, label]) => ({ value, label }),
							)}
							value={String(event.status || "DRAFT")}
							onValueChange={(newStatus) => {
								if (!newStatus) return;
								updateEvent.mutate(
									{ id: eventId, status: newStatus as any },
									{
										onSuccess: () => {
											toast.success("Estado atualizado com sucesso");
										},
										onError: (err: Error) => {
											toast.error(err.message || "Erro ao atualizar estado");
										},
									},
								);
							}}
						>
							<SelectTrigger
								className={`h-auto w-auto cursor-pointer border-0 bg-transparent p-0 px-2.5 py-1.5 shadow-none ring-0 hover:bg-black/5 ${getStatusColor(String(event.status || "DRAFT"))}`}
							>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{Object.entries(EVENT_STATUS_LABELS).map(([key, label]) => (
									<SelectItem key={key} value={key}>
										{label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					{event.description ? (
						<p className="max-w-2xl text-muted-foreground text-sm">
							{String(event.description)}
						</p>
					) : null}
				</div>
				<div className="flex gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => setShowEditDialog(true)}
					>
						<Pencil className="mr-2 h-3.5 w-3.5" />
						Editar
					</Button>
					<Button
						variant="destructive"
						size="sm"
						onClick={() => setShowDeleteDialog(true)}
					>
						<Trash2 className="mr-2 h-3.5 w-3.5" />
						Eliminar
					</Button>
				</div>
			</div>

			{/* Info Grid */}
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardContent className="flex items-center gap-3 p-4">
						<div className="flex h-10 w-10 items-center justify-center bg-slate-50">
							<Calendar className="h-5 w-5 text-slate-600" />
						</div>
						<div>
							<p className="text-muted-foreground text-xs">Data</p>
							<p className="font-medium text-sm">
								{event.eventDate
									? formatDate(String(event.eventDate))
									: "Não definida"}
							</p>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="flex items-center gap-3 p-4">
						<div className="flex h-10 w-10 items-center justify-center bg-slate-50">
							<Clock className="h-5 w-5 text-slate-600" />
						</div>
						<div>
							<p className="text-muted-foreground text-xs">Horário</p>
							<p className="font-medium text-sm">
								{event.startTime && event.endTime
									? `${String(event.startTime)} — ${String(event.endTime)}`
									: event.startTime
										? String(event.startTime)
										: "Não definido"}
							</p>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="flex items-center gap-3 p-4">
						<div className="flex h-10 w-10 items-center justify-center bg-slate-50">
							<MapPin className="h-5 w-5 text-slate-600" />
						</div>
						<div>
							<p className="text-muted-foreground text-xs">Local</p>
							<p className="font-medium text-sm">
								{event.venueName ? String(event.venueName) : "Não definido"}
							</p>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="flex items-center gap-3 p-4">
						<div className="flex h-10 w-10 items-center justify-center bg-slate-50">
							<Users className="h-5 w-5 text-slate-600" />
						</div>
						<div>
							<p className="text-muted-foreground text-xs">Capacidade</p>
							<p className="font-medium text-sm">
								{event.capacity
									? `${String(event.capacity)} convidados`
									: "Não definida"}
							</p>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Location Details */}
			{!!(event.address || event.province || event.neighborhood) && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-sm">
							<MapPin className="h-4 w-4" />
							Morada
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm">
							{[
								event.address,
								event.neighborhood,
								event.municipality,
								event.province,
							]
								.filter(Boolean)
								.map(String)
								.join(", ")}
						</p>
						{!!event.reference && (
							<p className="mt-1 text-muted-foreground text-xs">
								Referência: {String(event.reference)}
							</p>
						)}
					</CardContent>
				</Card>
			)}

			{/* Quick Stats */}
			<EventStats eventId={eventId} />

			{/* Charts */}
			<EventCharts eventId={eventId} />

			{/* Event Type */}
			<Card>
				<CardContent className="flex items-center gap-3 p-4">
					<div className="flex h-10 w-10 items-center justify-center bg-pink-50">
						<Gift className="h-5 w-5 text-pink-600" />
					</div>
					<div>
						<p className="text-muted-foreground text-xs">Tipo de evento</p>
						<p className="font-medium text-sm">
							{String(event.type) === "WEDDING" ? "Casamento" : "Noivado"}
						</p>
					</div>
				</CardContent>
			</Card>

			{/* Members */}
			{members.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-sm">
							<Users className="h-4 w-4" />
							Equipa ({members.length})
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
							{members.map((member) => {
								const user = member.user as Record<string, unknown> | undefined;
								const userName = user?.name ? String(user.name) : "?";
								const initials = userName
									.split(" ")
									.map((n: string) => n[0])
									.join("")
									.slice(0, 2);
								return (
									<div
										key={String(member.id)}
										className="flex items-center gap-3 rounded-md border p-3"
									>
										<div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted font-medium text-xs">
											{initials}
										</div>
										<div className="min-w-0 flex-1">
											<p className="truncate font-medium text-sm">
												{user?.name ? String(user.name) : "Utilizador"}
											</p>
											<p className="text-muted-foreground text-xs">
												{getStatusLabel(String(member.role), "role")}
											</p>
										</div>
										<Badge
											className={
												member.status === "ACTIVE"
													? "bg-green-50 text-green-700"
													: "bg-amber-50 text-amber-700"
											}
										>
											{member.status === "ACTIVE" ? "Ativo" : "Pendente"}
										</Badge>
									</div>
								);
							})}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Edit Dialog */}
			<EditEventDialog
				open={showEditDialog}
				onOpenChange={setShowEditDialog}
				event={event}
				onSubmit={(values) => {
					const payload: Record<string, unknown> = { id: eventId, ...values };
					updateEvent.mutate(payload as any, {
						onSuccess: () => {
							toast.success("Evento atualizado com sucesso");
							setShowEditDialog(false);
						},
						onError: (err: Error) => {
							toast.error(err.message || "Erro ao atualizar evento");
						},
					});
				}}
				isLoading={updateEvent.isPending}
			/>

			{/* Delete Dialog */}
			<Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Eliminar evento</DialogTitle>
						<DialogDescription>
							Tem a certeza que deseja eliminar o evento "{String(event.name)}"?
							Toda a informação associada será permanentemente removida. Esta
							ação não pode ser desfeita.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setShowDeleteDialog(false)}
						>
							Cancelar
						</Button>
						<Button
							variant="destructive"
							onClick={() => {
								deleteEvent.mutate(
									{ id: eventId },
									{
										onSuccess: () => {
											toast.success("Evento eliminado com sucesso");
											setShowDeleteDialog(false);
										},
										onError: (err: Error) => {
											toast.error(err.message || "Erro ao eliminar evento");
										},
									},
								);
							}}
							disabled={deleteEvent.isPending}
						>
							{deleteEvent.isPending ? "A eliminar..." : "Eliminar"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

// ── Edit Event Dialog ────────────────────────────────────────────────
function EditEventDialog({
	open,
	onOpenChange,
	event,
	onSubmit,
	isLoading,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	event: Record<string, unknown>;
	onSubmit: (values: {
		name?: string;
		status?: string;
		eventDate?: string;
		startTime?: string;
		endTime?: string;
		venueName?: string;
		address?: string;
		province?: string;
		municipality?: string;
		neighborhood?: string;
		reference?: string;
		capacity?: number;
		description?: string;
	}) => void;
	isLoading: boolean;
}) {
	const form = useForm({
		defaultValues: {
			name: String(event.name || ""),
			status: String(event.status || "DRAFT"),
			eventDate: event.eventDate
				? new Date(String(event.eventDate)).toISOString().split("T")[0]
				: "",
			startTime: String(event.startTime || ""),
			endTime: String(event.endTime || ""),
			venueName: String(event.venueName || ""),
			address: String(event.address || ""),
			province: String(event.province || ""),
			municipality: String(event.municipality || ""),
			neighborhood: String(event.neighborhood || ""),
			reference: String(event.reference || ""),
			capacity: (event.capacity as number) || 0,
			description: String(event.description || ""),
		},
		onSubmit: async ({ value }) => {
			onSubmit(value);
		},
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Editar evento</DialogTitle>
					<DialogDescription>
						Altere os dados do evento "{String(event.name)}"
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
									disabled={isLoading}
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
										value={field.state.value ?? ""}
										onValueChange={(v) => field.handleChange(v ?? "")}
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
										disabled={isLoading}
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
										disabled={isLoading}
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
										disabled={isLoading}
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
									disabled={isLoading}
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
									disabled={isLoading}
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
										disabled={isLoading}
									/>
								</div>
							)}
						</form.Field>
						<form.Field name="province">
							{(field) => (
								<div className="space-y-2">
									<Label>Província</Label>
									<Input
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										disabled={isLoading}
									/>
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
										disabled={isLoading}
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
										disabled={isLoading}
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
									disabled={isLoading}
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
							{isLoading ? "A guardar..." : "Guardar alterações"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

// ── Quick Stats Section ──────────────────────────────────────────────
function EventStats({ eventId }: { eventId: string }) {
	const guestsQuery = useQuery(
		orpc.guests.list.queryOptions({ input: { eventId } }),
	);
	const tasksQuery = useQuery(
		orpc.tasks.list.queryOptions({ input: { eventId } }),
	);
	const budgetQuery = useQuery(
		orpc.budget.getByEventId.queryOptions({ input: { eventId } }),
	);
	const vendorsQuery = useQuery(
		orpc.vendors.list.queryOptions({ input: { eventId } }),
	);
	const schedulesQuery = useQuery(
		orpc.tasks.getSchedules.queryOptions({ input: { eventId } }),
	);

	const guests = (guestsQuery.data ?? []) as Record<string, unknown>[];
	const tasks = (tasksQuery.data ?? []) as Record<string, unknown>[];
	const budgetData = budgetQuery.data as Record<string, unknown> | null;
	const vendors = (vendorsQuery.data ?? []) as Record<string, unknown>[];
	const schedules = (schedulesQuery.data ?? []) as Record<string, unknown>[];

	const confirmedGuests = guests.filter((g) => g.status === "CONFIRMED").length;
	const pendingTasks = tasks.filter((t) => t.status === "TODO").length;
	const inProgressTasks = tasks.filter(
		(t) => t.status === "IN_PROGRESS",
	).length;
	const completedTasks = tasks.filter((t) => t.status === "COMPLETED").length;

	const plannedAmount = Number(budgetData?.plannedAmount) || 0;

	return (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{/* Guests */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center justify-between text-sm">
						<span className="flex items-center gap-2">
							<Users className="h-4 w-4" />
							Convidados
						</span>
						<span className="font-normal text-muted-foreground text-xs">
							{guests.length} total
						</span>
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="flex items-center justify-between text-sm">
						<span className="text-muted-foreground">Confirmados</span>
						<span className="font-medium">{confirmedGuests}</span>
					</div>
					<div className="flex items-center justify-between text-sm">
						<span className="text-muted-foreground">Pendentes</span>
						<span className="font-medium">
							{guests.length - confirmedGuests}
						</span>
					</div>
					{guests.length > 0 && (
						<div className="pt-1">
							<div className="mb-1 flex justify-between text-xs">
								<span className="text-muted-foreground">Confirmação</span>
								<span>
									{Math.round((confirmedGuests / guests.length) * 100)}%
								</span>
							</div>
							<Progress
								value={Math.round((confirmedGuests / guests.length) * 100)}
							/>
						</div>
					)}
					<Button
						variant="ghost"
						size="sm"
						className="mt-1 h-auto p-0"
						render={<Link to="/events/$eventId/guests" params={{ eventId }} />}
					>
						Ver convidados →
					</Button>
				</CardContent>
			</Card>

			{/* Budget */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center justify-between text-sm">
						<span className="flex items-center gap-2">
							<CreditCard className="h-4 w-4" />
							Orçamento
						</span>
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="flex items-center justify-between text-sm">
						<span className="text-muted-foreground">Planeado</span>
						<span className="font-medium">{formatCurrency(plannedAmount)}</span>
					</div>
					<div className="flex items-center justify-between text-sm">
						<span className="text-muted-foreground">Categorias</span>
						<span className="font-medium">
							{((budgetData?.categories as unknown[]) ?? []).length}
						</span>
					</div>
					<Button
						variant="ghost"
						size="sm"
						className="mt-1 h-auto p-0"
						render={<Link to="/events/$eventId/budget" params={{ eventId }} />}
					>
						Ver orçamento →
					</Button>
				</CardContent>
			</Card>

			{/* Tasks */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center justify-between text-sm">
						<span className="flex items-center gap-2">
							<FileText className="h-4 w-4" />
							Tarefas
						</span>
						<span className="font-normal text-muted-foreground text-xs">
							{tasks.length} total
						</span>
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="flex items-center justify-between text-sm">
						<span className="text-muted-foreground">Por fazer</span>
						<span className="font-medium">{pendingTasks}</span>
					</div>
					<div className="flex items-center justify-between text-sm">
						<span className="text-muted-foreground">Em andamento</span>
						<span className="font-medium">{inProgressTasks}</span>
					</div>
					<div className="flex items-center justify-between text-sm">
						<span className="text-muted-foreground">Concluídas</span>
						<span className="font-medium">{completedTasks}</span>
					</div>
					{tasks.length > 0 && (
						<div className="pt-1">
							<div className="mb-1 flex justify-between text-xs">
								<span className="text-muted-foreground">Progresso</span>
								<span>
									{Math.round((completedTasks / tasks.length) * 100)}%
								</span>
							</div>
							<Progress
								value={Math.round((completedTasks / tasks.length) * 100)}
							/>
						</div>
					)}
					<Button
						variant="ghost"
						size="sm"
						className="mt-1 h-auto p-0"
						render={<Link to="/events/$eventId/tasks" params={{ eventId }} />}
					>
						Ver tarefas →
					</Button>
				</CardContent>
			</Card>

			{/* Vendors */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center justify-between text-sm">
						<span className="flex items-center gap-2">
							<Package className="h-4 w-4" />
							Fornecedores
						</span>
						<span className="font-normal text-muted-foreground text-xs">
							{vendors.length} total
						</span>
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					{vendors.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							Nenhum fornecedor registado
						</p>
					) : (
						<>
							{vendors.slice(0, 4).map((vendor) => (
								<div
									key={String(vendor.id)}
									className="flex items-center justify-between text-sm"
								>
									<span className="truncate">{String(vendor.name)}</span>
									<Badge
										className={getStatusColor(
											String(vendor.status || "PROSPECT"),
										)}
									>
										{String(
											VENDOR_CATEGORY_LABELS[String(vendor.category)] ??
												vendor.category,
										)}
									</Badge>
								</div>
							))}
							{vendors.length > 4 && (
								<p className="text-muted-foreground text-xs">
									+{vendors.length - 4} mais
								</p>
							)}
						</>
					)}
					<Button
						variant="ghost"
						size="sm"
						className="mt-1 h-auto p-0"
						render={
							<Link to="/events/$eventId/suppliers" params={{ eventId }} />
						}
					>
						Ver fornecedores →
					</Button>
				</CardContent>
			</Card>

			{/* Upcoming Tasks Alert */}
			{pendingTasks > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-sm">
							<AlertTriangle className="h-4 w-4 text-amber-500" />
							Tarefas pendentes
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						<p className="text-muted-foreground text-sm">
							{pendingTasks} tarefa{pendingTasks !== 1 ? "s" : ""} por fazer
						</p>
						<Button
							variant="ghost"
							size="sm"
							className="h-auto p-0"
							render={<Link to="/events/$eventId/tasks" params={{ eventId }} />}
						>
							Gerir tarefas →
						</Button>
					</CardContent>
				</Card>
			)}

			{/* Schedule Preview */}
			{schedules.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-sm">
							<Clock className="h-4 w-4" />
							Cronograma ({schedules.length} itens)
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							{schedules.slice(0, 5).map((schedule) => (
								<div
									key={String(schedule.id)}
									className="flex items-center justify-between rounded-md border p-2"
								>
									<div>
										<p className="font-medium text-sm">
											{String(schedule.title)}
										</p>
										<p className="text-muted-foreground text-xs">
											{schedule.location ? String(schedule.location) : ""}
											{schedule.responsible
												? ` · ${String(schedule.responsible)}`
												: ""}
										</p>
									</div>
									<Badge
										className={getStatusColor(
											String(schedule.status || "PENDING"),
										)}
									>
										{String(
											TASK_STATUS_LABELS[String(schedule.status)] ??
												schedule.status,
										)}
									</Badge>
								</div>
							))}
							{schedules.length > 5 && (
								<p className="text-muted-foreground text-xs">
									+{schedules.length - 5} mais itens
								</p>
							)}
						</div>
						<Button
							variant="ghost"
							size="sm"
							className="mt-2 h-auto p-0"
							render={
								<Link to="/events/$eventId/schedule" params={{ eventId }} />
							}
						>
							Ver cronograma completo →
						</Button>
					</CardContent>
				</Card>
			)}
		</div>
	);
}

// ── Event Charts ──────────────────────────────────────────────
function EventCharts({ eventId }: { eventId: string }) {
	const guestChartQuery = useQuery(
		orpc.dashboard.getGuestChart.queryOptions({ input: { eventId } }),
	);
	const budgetChartQuery = useQuery(
		orpc.dashboard.getBudgetChart.queryOptions({ input: { eventId } }),
	);

	const guestData = guestChartQuery.data as
		| { capacity: number; invited: number; confirmed: number; remaining: number; percentage: number }
		| undefined;
	const budgetData = budgetChartQuery.data as
		| { totalBudget: number; reserve: number; planned: number; spent: number; available: number }
		| undefined;

	if (!guestData && !budgetData) return null;

	return (
		<div className="grid gap-4 sm:grid-cols-2">
			{/* Guest Capacity Chart */}
			{guestData && guestData.capacity > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-sm">
							<Users className="h-4 w-4" />
							Capacidade de Convidados
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex items-center justify-center">
							<ProgressDonut
								value={guestData.invited}
								max={guestData.capacity}
								color="#3b82f6"
								size={140}
								centerLabel="convidados"
							/>
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div className="rounded-md border p-3 text-center">
								<p className="text-muted-foreground text-xs">Capacidade</p>
								<p className="font-semibold text-lg">{guestData.capacity}</p>
							</div>
							<div className="rounded-md border p-3 text-center">
								<p className="text-muted-foreground text-xs">Convidados</p>
								<p className="font-semibold text-lg">{guestData.invited}</p>
							</div>
							<div className="rounded-md border p-3 text-center">
								<p className="text-muted-foreground text-xs">Confirmados</p>
								<p className="font-semibold text-lg text-green-600">{guestData.confirmed}</p>
							</div>
							<div className="rounded-md border p-3 text-center">
								<p className="text-muted-foreground text-xs">Disponíveis</p>
								<p className="font-semibold text-lg text-blue-600">{guestData.remaining}</p>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Budget Chart */}
			{budgetData && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-sm">
							<CreditCard className="h-4 w-4" />
							Resumo Financeiro
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						{budgetData.totalBudget > 0 ? (
							<>
								<div className="flex items-center justify-center">
									<ProgressDonut
										value={budgetData.spent}
										max={budgetData.totalBudget}
										color="#f59e0b"
										size={140}
										centerLabel="gasto"
								/>
								</div>
								<div className="grid grid-cols-2 gap-3">
									<div className="rounded-md border p-3 text-center">
										<p className="text-muted-foreground text-xs">Total</p>
										<p className="font-semibold text-lg">{formatCurrency(budgetData.totalBudget)}</p>
									</div>
									<div className="rounded-md border p-3 text-center">
										<p className="text-muted-foreground text-xs">Gasto</p>
										<p className="font-semibold text-lg text-amber-600">{formatCurrency(budgetData.spent)}</p>
									</div>
									{budgetData.planned > 0 && (
										<div className="rounded-md border p-3 text-center">
											<p className="text-muted-foreground text-xs">Planeado</p>
											<p className="font-semibold text-lg text-blue-600">{formatCurrency(budgetData.planned)}</p>
										</div>
									)}
									<div className="rounded-md border p-3 text-center">
										<p className="text-muted-foreground text-xs">Disponível</p>
										<p className={`font-semibold text-lg ${budgetData.available < 0 ? "text-red-600" : "text-green-600"}`}>{formatCurrency(budgetData.available > 0 ? budgetData.available : 0)}</p>
									</div>
								</div>
							</>
						) : (
							<p className="text-center text-muted-foreground text-sm">
								Nenhum orçamento definido
							</p>
						)}
					</CardContent>
				</Card>
			)}
		</div>
	);
}
