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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@muxima/ui/components/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@muxima/ui/components/table";
import { Textarea } from "@muxima/ui/components/textarea";
import { useForm } from "@tanstack/react-form";
import { createFileRoute } from "@tanstack/react-router";
import {
	AlertTriangle,
	Calendar,
	Clock,
	Copy,
	Eye,
	Mail,
	MapPin,
	Pencil,
	Phone,
	Plus,
	Search,
	Share2,
	Trash2,
	User,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BackButton } from "@/shared/components/back-to";
import { QueryState } from "@/shared/components/states";
import {
	useCreateGuest,
	useCreateInvitation,
	useDeleteGuest,
	useGuests,
	useInvitation,
	useUpdateGuest,
} from "@/shared/queries/guest-queries";
import { useTables } from "@/shared/queries/table-queries";
import { formatDate } from "@/utils/format-date";
import { guestSchema } from "@/utils/guest-schemas";
import {
	GUEST_STATUS_LABELS,
	GUEST_TYPE_LABELS,
	getStatusColor,
	getStatusLabel,
	toSelectItems,
} from "@/utils/status-helpers";

export const Route = createFileRoute("/_private/events/$eventId/guests/")({
	component: GuestsPage,
});

function GuestsPage() {
	const { eventId } = Route.useParams();

	const guestsQuery = useGuests(eventId);
	const tablesQuery = useTables(eventId);
	const createGuest = useCreateGuest();
	const updateGuest = useUpdateGuest();
	const deleteGuest = useDeleteGuest();

	const [showCreateDialog, setShowCreateDialog] = useState(false);
	const [editingGuest, setEditingGuest] = useState<Record<
		string,
		unknown
	> | null>(null);
	const [deleteId, setDeleteId] = useState<string | null>(null);

	// Filters
	const [searchQuery, setSearchQuery] = useState("");
	const [filterStatus, setFilterStatus] = useState<string>("ALL");
	const [filterType, setFilterType] = useState<string>("ALL");

	// Invitation state
	const [viewingInvitationGuestId, setViewingInvitationGuestId] = useState<
		string | null
	>(null);
	const [sharingGuest, setSharingGuest] = useState<Record<
		string,
		unknown
	> | null>(null);

	const guests = guestsQuery.data ?? [];
	const tables = tablesQuery.data ?? [];

	const filteredGuests = useMemo(() => {
		return guests.filter((guest: Record<string, unknown>) => {
			const matchesSearch =
				searchQuery === "" ||
				((guest.name as string) || "")
					.toLowerCase()
					.includes(searchQuery.toLowerCase()) ||
				((guest.email as string) || "")
					.toLowerCase()
					.includes(searchQuery.toLowerCase()) ||
				((guest.phone as string) || "")
					.toLowerCase()
					.includes(searchQuery.toLowerCase());

			const matchesStatus =
				filterStatus === "ALL" || guest.status === filterStatus;
			const matchesType = filterType === "ALL" || guest.type === filterType;

			return matchesSearch && matchesStatus && matchesType;
		});
	}, [guests, searchQuery, filterStatus, filterType]);

	const confirmedCount = guests.filter(
		(g: Record<string, unknown>) => g.status === "CONFIRMED",
	).length;
	const pendingCount = guests.filter(
		(g: Record<string, unknown>) => g.status === "PENDING",
	).length;
	const declinedCount = guests.filter(
		(g: Record<string, unknown>) => g.status === "DECLINED",
	).length;

	return (
		<div className="space-y-6">
			<BackButton to={`/events/${eventId}`} label="Voltar ao evento" />
			<div className="flex items-center justify-between">
				<div>
					<h1 className="font-semibold text-2xl">Convidados</h1>
					<p className="text-muted-foreground text-sm">
						{guests.length} convidados
					</p>
				</div>
				<Button onClick={() => setShowCreateDialog(true)}>
					<Plus className="mr-2 h-4 w-4" />
					Adicionar convidado
				</Button>
			</div>

			<div className="grid gap-4 sm:grid-cols-3">
				<Card>
					<CardHeader>
						<CardTitle className="text-muted-foreground text-xs">
							Confirmados
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="font-semibold text-2xl text-green-600">
							{confirmedCount}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle className="text-muted-foreground text-xs">
							Pendentes
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="font-semibold text-2xl text-amber-600">
							{pendingCount}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle className="text-muted-foreground text-xs">
							Recusados
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="font-semibold text-2xl text-red-600">
							{declinedCount}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Filters */}
			<div className="flex flex-wrap items-center gap-3">
				<div className="relative min-w-[200px] max-w-sm flex-1">
					<Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder="Pesquisar por nome, email ou telefone..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-9"
					/>
				</div>
				<Select
					value={filterStatus}
					onValueChange={(v) => setFilterStatus(v as string)}
				>
					<SelectTrigger className="w-[160px]">
						<SelectValue placeholder="Estado" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="ALL">Todos os estados</SelectItem>
						{toSelectItems(GUEST_STATUS_LABELS).map((item) => (
							<SelectItem key={item.value} value={item.value}>
								{item.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Select
					value={filterType}
					onValueChange={(v) => setFilterType(v as string)}
				>
					<SelectTrigger className="w-[160px]">
						<SelectValue placeholder="Tipo" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="ALL">Todos os tipos</SelectItem>
						{toSelectItems(GUEST_TYPE_LABELS).map((item) => (
							<SelectItem key={item.value} value={item.value}>
								{item.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<QueryState
				state={{
					isLoading: guestsQuery.isLoading,
					isError: guestsQuery.isError,
					isEmpty: filteredGuests.length === 0 && guests.length > 0,
					hasData: guests.length > 0,
				}}
			>
				<Card>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Nome</TableHead>
								<TableHead>Contacto</TableHead>
								<TableHead>Grupo</TableHead>
								<TableHead>Tipo</TableHead>
								<TableHead>Mesa</TableHead>
								<TableHead>Estado</TableHead>
								<TableHead className="w-28" />
							</TableRow>
						</TableHeader>
						<TableBody>
							{filteredGuests.map((guest: Record<string, unknown>) => {
								const tableGuests = (guest.tableGuests ?? []) as Array<
									Record<string, unknown>
								>;
								const tableName =
									tableGuests.length > 0
										? ((tableGuests[0]?.table as Record<string, unknown>)
												?.name as string)
										: null;

								return (
									<TableRow key={guest.id as string}>
										<TableCell className="font-medium">
											{guest.name as string}
										</TableCell>
										<TableCell>
											<div className="flex flex-col gap-0.5 text-muted-foreground text-xs">
												{" "}
												{guest.phone ? (
													<span className="flex items-center gap-1">
														<Phone className="h-3 w-3" />
														{String(guest.phone)}
													</span>
												) : null}
												{guest.email ? (
													<span className="flex items-center gap-1">
														<Mail className="h-3 w-3" />
														{String(guest.email)}
													</span>
												) : null}
											</div>
										</TableCell>
										<TableCell>{(guest.group as string) || "—"}</TableCell>
										<TableCell>
											{" "}
											{GUEST_TYPE_LABELS[(guest.type as string) || "FAMILY"] ||
												String(guest.type || "FAMILY")}
										</TableCell>
										<TableCell>
											{tableName ? (
												<Badge className="bg-blue-50 text-blue-700">
													{tableName}
												</Badge>
											) : (
												<span className="text-muted-foreground text-xs">—</span>
											)}
										</TableCell>
										<TableCell>
											<Badge
												className={getStatusColor(
													(guest.status as string) || "PENDING",
												)}
											>
												{getStatusLabel(
													(guest.status as string) || "PENDING",
													"guest",
												)}
											</Badge>
										</TableCell>
										<TableCell>
											<div className="flex gap-1">
												<Button
													variant="ghost"
													size="icon-sm"
													title="Ver convite"
													onClick={() =>
														setViewingInvitationGuestId(guest.id as string)
													}
												>
													<Eye className="h-3.5 w-3.5" />
												</Button>
												<Button
													variant="ghost"
													size="icon-sm"
													title="Partilhar convite"
													onClick={() => setSharingGuest(guest)}
												>
													<Share2 className="h-3.5 w-3.5" />
												</Button>
												<Button
													variant="ghost"
													size="icon-sm"
													title="Editar"
													onClick={() => setEditingGuest(guest)}
												>
													<Pencil className="h-3.5 w-3.5" />
												</Button>
												<Button
													variant="ghost"
													size="icon-sm"
													className="text-destructive"
													title="Eliminar"
													onClick={() => setDeleteId(guest.id as string)}
												>
													<Trash2 className="h-3.5 w-3.5" />
												</Button>
											</div>
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</Card>
			</QueryState>

			{/* Create Dialog */}
			<GuestDialog
				open={showCreateDialog}
				onOpenChange={setShowCreateDialog}
				tables={tables}
				onSubmit={(values) => {
					createGuest.mutate(
						{ ...values, eventId },
						{
							onSuccess: () => {
								toast.success("Convidado adicionado");
								setShowCreateDialog(false);
							},
							onError: (e) => toast.error(e.message),
						},
					);
				}}
				isLoading={createGuest.isPending}
			/>

			{/* Edit Dialog */}
			{editingGuest && (
				<GuestDialog
					open={!!editingGuest}
					onOpenChange={() => setEditingGuest(null)}
					tables={tables}
					initialValues={{
						name: (editingGuest.name as string) || "",
						phone: (editingGuest.phone as string) || "",
						email: (editingGuest.email as string) || "",
						group: (editingGuest.group as string) || "",
						type: (editingGuest.type as string) || "FAMILY",
						notes: (editingGuest.notes as string) || "",
						status: (editingGuest.status as string) || "PENDING",
						tableId:
							((
								(
									editingGuest.tableGuests as Array<Record<string, unknown>>
								)?.[0]?.table as Record<string, unknown>
							)?.id as string) || "",
					}}
					onSubmit={(values) => {
						updateGuest.mutate(
							{ id: editingGuest.id as string, ...values },
							{
								onSuccess: () => {
									toast.success("Convidado atualizado");
									setEditingGuest(null);
								},
								onError: (e) => toast.error(e.message),
							},
						);
					}}
					isLoading={updateGuest.isPending}
				/>
			)}

			{/* Delete Confirmation */}
			<Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Eliminar convidado</DialogTitle>
						<DialogDescription>
							Tem a certeza que deseja eliminar este convidado?
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
									deleteGuest.mutate(
										{ id: deleteId },
										{
											onSuccess: () => {
												toast.success("Convidado eliminado");
												setDeleteId(null);
											},
											onError: (e) => toast.error(e.message),
										},
									);
								}
							}}
							disabled={deleteGuest.isPending}
						>
							Eliminar
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* View Invitation Dialog */}
			{viewingInvitationGuestId && (
				<ViewInvitationDialog
					guestId={viewingInvitationGuestId}
					eventId={eventId}
					onClose={() => setViewingInvitationGuestId(null)}
				/>
			)}

			{/* Share Invitation Dialog */}
			{sharingGuest && (
				<ShareInvitationDialog
					guest={sharingGuest}
					eventId={eventId}
					onClose={() => setSharingGuest(null)}
				/>
			)}
		</div>
	);
}

// ========================
// View Invitation Dialog
// ========================
function ViewInvitationDialog({
	guestId,
	eventId,
	onClose,
}: {
	guestId: string;
	eventId: string;
	onClose: () => void;
}) {
	const invitationQuery = useInvitation(guestId);
	const createInvitation = useCreateInvitation();
	const invitation = invitationQuery.data as any;

	const event = invitation?.event;
	const guest = invitation?.guest;
	const tableGuests = (guest?.tableGuests ?? []) as Array<
		Record<string, unknown>
	>;
	const table =
		tableGuests.length > 0
			? (tableGuests[0]?.table as Record<string, unknown>)
			: null;

	const handleCreate = () => {
		createInvitation.mutate(
			{ guestId, eventId },
			{
				onSuccess: () => toast.success("Convite criado com sucesso"),
				onError: (e) => toast.error(e.message),
			},
		);
	};

	const handleCopyCode = () => {
		if (invitation?.code) {
			navigator.clipboard.writeText(String(invitation.code));
			toast.success("Código copiado!");
		}
	};

	return (
		<Dialog open onOpenChange={() => onClose()}>
			<DialogContent className="max-h-[85vh] overflow-y-auto rounded-none sm:max-w-2xl">
				<DialogHeader className="border-b pb-4">
					<DialogTitle className="font-semibold text-lg tracking-tight">
						Convite
					</DialogTitle>
					<DialogDescription className="text-muted-foreground text-sm">
						Detalhes do convite e informações do evento.
					</DialogDescription>
				</DialogHeader>

				{invitationQuery.isLoading ? (
					<div className="py-10 text-center text-muted-foreground text-sm">
						A carregar...
					</div>
				) : invitation && event ? (
					<div className="space-y-6 py-2">
						{/* Event */}
						<section className="border-b pb-5">
							<p className="mb-2 font-medium text-[11px] text-muted-foreground uppercase tracking-[0.16em]">
								Convite para
							</p>

							<h2 className="font-semibold text-2xl tracking-tight">
								{String(event.name)}
							</h2>

							<div className="mt-2 flex items-center gap-2 text-muted-foreground text-xs">
								<span>{getStatusLabel(String(event.status), "event")}</span>
								<span>·</span>
								<span>
									{event.type === "WEDDING" ? "Casamento" : "Noivado"}
								</span>
							</div>
						</section>

						{/* Guest */}
						<section>
							<div className="mb-3 flex items-center gap-2">
								<User className="h-4 w-4 text-muted-foreground" />
								<h3 className="font-semibold text-sm">Convidado</h3>
							</div>

							<p className="font-medium text-base">
								{String(guest?.name || "")}
							</p>

							{(guest?.email || guest?.phone) && (
								<div className="mt-1.5 space-y-1 text-muted-foreground text-xs">
									{guest?.phone && (
										<p className="flex items-center gap-2">
											<Phone className="h-3.5 w-3.5" />
											{String(guest.phone)}
										</p>
									)}

									{guest?.email && (
										<p className="flex items-center gap-2">
											<Mail className="h-3.5 w-3.5" />
											{String(guest.email)}
										</p>
									)}
								</div>
							)}
						</section>

						{/* Event Details */}
						<section>
							<h3 className="mb-3 font-semibold text-sm">
								Informações do evento
							</h3>

							<div className="divide-y border-y">
								{event.eventDate && (
									<div className="flex items-center justify-between py-3">
										<div className="flex items-center gap-2.5">
											<Calendar className="h-4 w-4 text-muted-foreground" />
											<span className="text-muted-foreground text-sm">
												Data
											</span>
										</div>

										<span className="font-medium text-sm">
											{formatDate(String(event.eventDate))}
										</span>
									</div>
								)}

								{(event.startTime || event.endTime) && (
									<div className="flex items-center justify-between py-3">
										<div className="flex items-center gap-2.5">
											<Clock className="h-4 w-4 text-muted-foreground" />
											<span className="text-muted-foreground text-sm">
												Horário
											</span>
										</div>

										<span className="font-medium text-sm">
											{event.startTime ? String(event.startTime) : "—"}
											{event.endTime ? ` — ${String(event.endTime)}` : ""}
										</span>
									</div>
								)}

								{event.venueName && (
									<div className="flex items-start justify-between gap-4 py-3">
										<div className="flex items-start gap-2.5">
											<MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />

											<div>
												<p className="text-muted-foreground text-sm">Local</p>
												<p className="mt-0.5 font-medium text-sm">
													{String(event.venueName)}
												</p>
											</div>
										</div>

										{event.address && (
											<p className="max-w-[220px] text-right text-muted-foreground text-xs leading-relaxed">
												{String(event.address)}
												{event.neighborhood
													? `, ${String(event.neighborhood)}`
													: ""}
												{event.municipality
													? ` — ${String(event.municipality)}`
													: ""}
												{event.province ? `, ${String(event.province)}` : ""}
											</p>
										)}
									</div>
								)}
							</div>
						</section>

						{/* Table */}
						{table && (
							<section className="border-y py-4">
								<p className="text-muted-foreground text-xs">Mesa atribuída</p>

								<p className="mt-1 font-semibold text-sm">
									{String(table.name)}
									{table.number
										? ` · ${String(table.number as string | number)}`
										: ""}
								</p>

								{table.location ? (
									<p className="mt-1 text-muted-foreground text-xs">
										{String(table.location)}
									</p>
								) : null}
							</section>
						)}

						{/* Host */}
						{event.owner && (
							<section>
								<div className="mb-3 flex items-center gap-2">
									<User className="h-4 w-4 text-muted-foreground" />
									<h3 className="font-semibold text-sm">Anfitrião</h3>
								</div>

								<p className="font-medium text-sm">
									{String(
										(event.owner as Record<string, unknown>).name ||
											(event.owner as Record<string, unknown>).email,
									)}
								</p>

								{(event.owner as Record<string, unknown>).email ? (
									<p className="mt-1 flex items-center gap-2 text-muted-foreground text-xs">
										<Mail className="h-3.5 w-3.5" />
										{String((event.owner as Record<string, unknown>).email)}
									</p>
								) : null}
							</section>
						)}

						{/* Warning */}
						<section className="border-l-2 px-4 py-1">
							<div className="flex items-start gap-2.5">
								<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />

								<div>
									<p className="font-medium text-sm">Informação importante</p>
									<p className="mt-1 text-muted-foreground text-xs leading-relaxed">
										Por favor, não convidar outras pessoas além das indicadas
										neste convite. A lotação foi definida de acordo com a
										capacidade do evento.
									</p>
								</div>
							</div>
						</section>

						{/* Confirmation Code */}
						<section className="flex items-center justify-between border-y py-4">
							<div>
								<p className="text-[11px] text-muted-foreground uppercase tracking-wider">
									Código de confirmação
								</p>

								<p className="mt-1 font-mono font-semibold text-lg tracking-[0.15em]">
									{String(invitation.code)}
								</p>
							</div>

							<Button
								variant="outline"
								size="sm"
								className="rounded-none"
								onClick={handleCopyCode}
							>
								<Copy className="mr-2 h-3.5 w-3.5" />
								Copiar
							</Button>
						</section>

						{/* Invitation Status */}
						<section className="grid grid-cols-2 divide-x border-y">
							<div className="py-3 pr-4">
								<p className="text-muted-foreground text-xs">
									Estado do convite
								</p>

								<p className="mt-1 font-medium text-sm">
									{String(invitation.status)}
								</p>
							</div>

							<div className="py-3 pl-4">
								<p className="text-muted-foreground text-xs">Enviado em</p>

								<p className="mt-1 font-medium text-sm">
									{invitation.sentAt
										? formatDate(String(invitation.sentAt))
										: "—"}
								</p>
							</div>
						</section>
					</div>
				) : (
					<div className="py-8 text-center">
						<p className="text-muted-foreground text-sm">
							Nenhum convite criado para este convidado.
						</p>

						<Button
							className="mt-4 rounded-none"
							onClick={handleCreate}
							disabled={createInvitation.isPending}
						>
							<Plus className="mr-2 h-4 w-4" />
							{createInvitation.isPending ? "A criar..." : "Criar convite"}
						</Button>
					</div>
				)}

				<DialogFooter className="border-t pt-4">
					<Button variant="outline" className="rounded-none" onClick={onClose}>
						Fechar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ========================
// Share Invitation Dialog
// ========================
function ShareInvitationDialog({
	guest,
	eventId,
	onClose,
}: {
	guest: Record<string, unknown>;
	eventId: string;
	onClose: () => void;
}) {
	const createInvitation = useCreateInvitation();
	const invitationQuery = useInvitation(guest.id as string);
	const invitation = invitationQuery.data;

	const invitationLink = invitation
		? `${window.location.origin}/invite/${(invitation as Record<string, unknown>).code}`
		: null;

	const handleShareWhatsApp = () => {
		if (invitationLink) {
			const text = `Olá ${(guest.name as string) || ""}! 🎉\nEstás convidado(a) para o nosso evento!\n\nConfirma a tua presença: ${invitationLink}`;
			window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
		}
	};

	const handleShareCopy = () => {
		if (invitationLink) {
			navigator.clipboard.writeText(invitationLink);
			toast.success("Link copiado para a área de transferência!");
		}
	};

	const handleCreateAndShare = () => {
		createInvitation.mutate(
			{ guestId: guest.id as string, eventId },
			{
				onSuccess: () => {
					toast.success("Convite criado!");
				},
				onError: (e) => toast.error(e.message),
			},
		);
	};

	return (
		<Dialog open onOpenChange={() => onClose()}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Partilhar Convite</DialogTitle>
					<DialogDescription>
						Envie o convite para <strong>{guest.name as string}</strong>
					</DialogDescription>
				</DialogHeader>
				{invitationQuery.isLoading ? (
					<div className="py-8 text-center text-muted-foreground text-sm">
						A carregar...
					</div>
				) : invitationLink ? (
					<div className="space-y-4">
						<div className="rounded-md border p-3">
							<p className="mb-1 text-muted-foreground text-xs">
								Link de convite
							</p>
							<p className="break-all font-mono text-sm">{invitationLink}</p>
						</div>
						<div className="flex flex-col gap-2">
							<Button
								onClick={handleShareWhatsApp}
								className="w-full bg-green-600 text-white hover:bg-green-700"
							>
								<Share2 className="mr-2 h-4 w-4" />
								Partilhar via WhatsApp
							</Button>
							<Button
								onClick={handleShareCopy}
								variant="outline"
								className="w-full"
							>
								Copiar link
							</Button>
						</div>
					</div>
				) : (
					<div className="space-y-4 py-4 text-center">
						<p className="text-muted-foreground text-sm">
							Ainda não existe convite para este convidado.
						</p>
						<Button
							onClick={handleCreateAndShare}
							disabled={createInvitation.isPending}
						>
							<Plus className="mr-2 h-4 w-4" />
							{createInvitation.isPending
								? "A criar..."
								: "Criar e partilhar convite"}
						</Button>
					</div>
				)}
				<DialogFooter>
					<Button variant="outline" onClick={onClose}>
						Fechar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ========================
// Guest Dialog (Create / Edit)
// ========================
function GuestDialog({
	open,
	onOpenChange,
	initialValues,
	tables,
	onSubmit,
	isLoading,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	initialValues?: {
		name: string;
		phone?: string;
		email?: string;
		group?: string;
		type?: string;
		notes?: string;
		status?: string;
		tableId?: string;
	};
	tables: Array<Record<string, unknown>>;
	onSubmit: (values: {
		name: string;
		phone?: string;
		email?: string;
		group?: string;
		type?: "FAMILY" | "FRIEND" | "COLLEAGUE" | "VIP" | "OTHER";
		notes?: string;
		status?: "PENDING" | "CONFIRMED" | "DECLINED" | "WAITING";
		tableId?: string;
	}) => void;
	isLoading: boolean;
}) {
	const isEditing = !!initialValues;

	const form = useForm({
		defaultValues: {
			name: initialValues?.name || "",
			phone: initialValues?.phone || "",
			email: initialValues?.email || "",
			group: initialValues?.group || "",
			type: (initialValues?.type || "FAMILY") as
				| "FAMILY"
				| "FRIEND"
				| "COLLEAGUE"
				| "VIP"
				| "OTHER",
			notes: initialValues?.notes || "",
			status: (initialValues?.status || "PENDING") as
				| "PENDING"
				| "CONFIRMED"
				| "DECLINED"
				| "WAITING",
			tableId: initialValues?.tableId || "",
		},
		onSubmit: async ({ value }) => {
			const result = guestSchema.safeParse(value);
			if (!result.success) {
				toast.error(result.error.issues[0].message);
				return;
			}
			onSubmit({
				...result.data,
				tableId: value.tableId || undefined,
			});
		},
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>
						{isEditing ? "Editar convidado" : "Adicionar convidado"}
					</DialogTitle>
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
								<Label>Nome</Label>
								<Input
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									disabled={isLoading}
								/>
							</div>
						)}
					</form.Field>

					<div className="grid grid-cols-2 gap-4">
						<form.Field name="phone">
							{(field) => (
								<div className="space-y-2">
									<Label>Telefone</Label>
									<Input
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										disabled={isLoading}
									/>
								</div>
							)}
						</form.Field>
						<form.Field name="email">
							{(field) => (
								<div className="space-y-2">
									<Label>Email</Label>
									<Input
										type="email"
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										disabled={isLoading}
									/>
								</div>
							)}
						</form.Field>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<form.Field name="type">
							{(field) => (
								<div className="space-y-2">
									<Label>Tipo</Label>
									<Select
										items={toSelectItems(GUEST_TYPE_LABELS)}
										value={field.state.value}
										onValueChange={(v) => field.handleChange(v as any)}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{toSelectItems(GUEST_TYPE_LABELS).map((item) => (
												<SelectItem key={item.value} value={item.value}>
													{item.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							)}
						</form.Field>
						<form.Field name="group">
							{(field) => (
								<div className="space-y-2">
									<Label>Grupo</Label>
									<Input
										placeholder="Ex: Família da noiva"
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										disabled={isLoading}
									/>
								</div>
							)}
						</form.Field>
					</div>

					{/* Table assignment */}
					<form.Field name="tableId">
						{(field) => (
							<div className="space-y-2">
								<Label>Mesa</Label>
								<Select
									items={[
										{ value: "", label: "Sem mesa" },
										...tables.map((t) => ({
											value: t.id as string,
											label: `${t.name as string}${t.number ? ` (#${t.number})` : ""} — ${t.capacity} lugares`,
										})),
									]}
									value={field.state.value}
									onValueChange={(v) => field.handleChange(v as string)}
								>
									<SelectTrigger>
										<SelectValue placeholder="Selecionar mesa" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="">Sem mesa</SelectItem>
										{tables.map((t) => (
											<SelectItem key={t.id as string} value={t.id as string}>
												{" "}
												{String(t.name)}
												{t.number ? ` (#${String(t.number)})` : ""} —{" "}
												{String(t.capacity)} lugares
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}
					</form.Field>

					{isEditing && (
						<form.Field name="status">
							{(field) => (
								<div className="space-y-2">
									<Label>Estado</Label>
									<Select
										items={toSelectItems(GUEST_STATUS_LABELS)}
										value={field.state.value}
										onValueChange={(v) => field.handleChange(v as any)}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{toSelectItems(GUEST_STATUS_LABELS).map((item) => (
												<SelectItem key={item.value} value={item.value}>
													{item.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							)}
						</form.Field>
					)}

					<form.Field name="notes">
						{(field) => (
							<div className="space-y-2">
								<Label>Notas</Label>
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
							{isLoading ? "A guardar..." : isEditing ? "Guardar" : "Adicionar"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
