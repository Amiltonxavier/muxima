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
import { Eye, MapPin, Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BackButton } from "@/shared/components/back-to";
import { QueryState } from "@/shared/components/states";
import { StatsCard } from "@/shared/components/stats-card/stats-card";	import {
	useCreateTable,
	useDeleteTable,
	useTableStats,
	useTables,
	useUpdateTable,
} from "@/shared/queries/table-queries";

export const Route = createFileRoute("/_private/events/$eventId/tables/")({
	component: TablesPage,
});

function TablesPage() {
	const { eventId } = Route.useParams();

	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(20);

	const tablesQuery = useTables(eventId, { page, limit });
	const createTable = useCreateTable();
	const updateTable = useUpdateTable();
	const deleteTable = useDeleteTable();

	const [showCreate, setShowCreate] = useState(false);
	const [editingTable, setEditingTable] = useState<{
		id?: string;
		name?: string;
		number?: number;
		capacity?: number;
		location?: string;
		notes?: string;
		tableGuests?: Array<unknown>;
	} | null>(null);
	const [viewingTable, setViewingTable] = useState<{
		id?: string;
		name?: string;
		number?: number;
		capacity?: number;
		location?: string;
		notes?: string;
		tableGuests?: Array<{
			id?: string;
			guest?: { name?: string; status?: string };
		}>;
	} | null>(null);
	const [deletingTable, setDeletingTable] = useState<{
		id?: string;
		name?: string;
		tableGuests?: Array<unknown>;
	} | null>(null);

	// Filters
	const [searchQuery, setSearchQuery] = useState("");

	const tablesStatsQuery = useTableStats(eventId);

	const tables = tablesQuery.data?.data ?? [];
	const meta = tablesQuery.data?.meta;
	const tableStats = tablesStatsQuery.data;

	const filteredTables = useMemo(() => {
		return tables.filter((table) => {
			const matchesSearch =
				searchQuery === "" ||
				(table.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
				(table.location || "")
					.toLowerCase()
					.includes(searchQuery.toLowerCase());
			return matchesSearch;
		});
	}, [tables, searchQuery]);

	return (
		<div className="space-y-6">
			<BackButton to={`/events/${eventId}`} label="Voltar ao evento" />
			<div className="flex items-center justify-between">
				<div>
					<h1 className="font-semibold text-2xl">Mesas</h1>
					<p className="text-muted-foreground text-sm">
						{tableStats?.total ?? 0} mesas · {tableStats?.totalCapacity ?? 0} lugares · {tableStats?.totalOccupied ?? 0}{" "}
						ocupados
					</p>
				</div>
				<Button onClick={() => setShowCreate(true)}>
					<Plus className="mr-2 h-4 w-4" />
					Criar mesa
				</Button>
			</div>

			{/* Metrics Cards */}
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<StatsCard title="Total de mesas" value={tableStats?.total ?? 0} />

			<StatsCard title="Lugares totais" value={tableStats?.totalCapacity ?? 0} />

			<StatsCard title="Ocupados" value={tableStats?.totalOccupied ?? 0} />

			<StatsCard title="Disponíveis" value={tableStats?.available ?? 0} />
			</div>

			{/* Filters */}
			<div className="flex flex-wrap items-center gap-3">
				<div className="relative min-w-[200px] max-w-sm flex-1">
					<Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder="Pesquisar por nome ou localização..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-9"
					/>
				</div>
			</div>

			<QueryState
				state={{
					isLoading: tablesQuery.isLoading,
					isError: tablesQuery.isError,
					isEmpty: filteredTables.length === 0 && tables.length > 0,
					hasData: tables.length > 0,
				}}
			>
				<Card>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>#</TableHead>
								<TableHead>Nome</TableHead>
								<TableHead>Localização</TableHead>
								<TableHead>Capacidade</TableHead>
								<TableHead>Ocupados</TableHead>
								<TableHead>Disponíveis</TableHead>
								<TableHead>Notas</TableHead>
								<TableHead className="w-28" />
							</TableRow>
						</TableHeader>
						<TableBody>
							{filteredTables.map((table) => {
								const guests = table.tableGuests || [];
								const capacity = table.capacity || 0;
								const occupied = guests.length;
								const available = capacity - occupied;

								return (
									<TableRow key={table.id}>
										<TableCell className="font-mono text-muted-foreground text-sm">
											{table.number ? `#${table.number}` : "—"}
										</TableCell>
										<TableCell className="font-medium">{table.name}</TableCell>
										<TableCell>
											{table.location ? (
												<span className="flex items-center gap-1 text-sm">
													<MapPin className="h-3 w-3 text-muted-foreground" />
													{table.location}
												</span>
											) : (
												<span className="text-muted-foreground text-xs">—</span>
											)}
										</TableCell>
										<TableCell>{capacity}</TableCell>
										<TableCell>
											<Badge className="bg-blue-50 text-blue-700">
												{occupied}
											</Badge>
										</TableCell>
										<TableCell>
											<Badge
												className={
													available <= 0
														? "bg-red-50 text-red-700"
														: "bg-green-50 text-green-700"
												}
											>
												{available}
											</Badge>
										</TableCell>
										<TableCell className="max-w-[200px] truncate text-muted-foreground text-xs">
											{table.notes || "—"}
										</TableCell>
										<TableCell>
											<div className="flex gap-1">
												<Button
													variant="ghost"
													size="icon-sm"
													title="Ver detalhes"
													onClick={() => setViewingTable(table)}
												>
													<Eye className="h-3.5 w-3.5" />
												</Button>
												<Button
													variant="ghost"
													size="icon-sm"
													title="Editar"
													onClick={() => setEditingTable(table)}
												>
													<Pencil className="h-3.5 w-3.5" />
												</Button>
												<Button
													variant="ghost"
													size="icon-sm"
													className="text-destructive"
													title="Eliminar"
													onClick={() => setDeletingTable(table)}
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

			{meta && (
				<Pagination
					meta={meta}
					onPageChange={setPage}
					onLimitChange={(l) => {
						setLimit(l);
						setPage(1);
					}}
					disabled={tablesQuery.isLoading}
				/>
			)}

			{/* Create Dialog */}
			<TableDialog
				open={showCreate}
				onOpenChange={setShowCreate}
				onSubmit={(values) => {
					createTable.mutate(
						{ ...values, eventId },
						{
							onSuccess: () => {
								toast.success("Mesa criada");
								setShowCreate(false);
							},
							onError: (e) => toast.error(e.message),
						},
					);
				}}
				isLoading={createTable.isPending}
			/>

			{/* Edit Dialog */}
			{editingTable && (
				<TableDialog
					open={!!editingTable}
					onOpenChange={() => setEditingTable(null)}
					initialValues={{
						name: editingTable.name || "",
						number: editingTable.number || 0,
						capacity: editingTable.capacity || 8,
						location: editingTable.location || "",
						notes: editingTable.notes || "",
					}}
					onSubmit={(values) => {
						updateTable.mutate(
							{ id: editingTable.id!, ...values },
							{
								onSuccess: () => {
									toast.success("Mesa atualizada");
									setEditingTable(null);
								},
								onError: (e) => toast.error(e.message),
							},
						);
					}}
					isLoading={updateTable.isPending}
				/>
			)}

			{/* View Details Dialog */}
			{viewingTable && (
				<ViewTableDialog
					table={viewingTable}
					onClose={() => setViewingTable(null)}
				/>
			)}

			{/* Delete Confirmation Dialog */}
			<Dialog
				open={!!deletingTable}
				onOpenChange={() => setDeletingTable(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Eliminar mesa</DialogTitle>
						<DialogDescription>
							Tem a certeza que deseja eliminar a mesa{" "}
							<strong>{deletingTable?.name}</strong>?
							{(deletingTable?.tableGuests?.length || 0) > 0 && (
								<p className="mt-2 text-amber-600 text-sm">
									⚠️ Esta mesa tem {deletingTable?.tableGuests?.length}{" "}
									convidados atribuídos que serão removidos.
								</p>
							)}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDeletingTable(null)}>
							Cancelar
						</Button>
						<Button
							variant="destructive"
							onClick={() => {
								if (deletingTable) {
									deleteTable.mutate(
										{ id: deletingTable.id! },
										{
											onSuccess: () => {
												toast.success("Mesa eliminada");
												setDeletingTable(null);
											},
											onError: (e) => toast.error(e.message),
										},
									);
								}
							}}
							disabled={deleteTable.isPending}
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
// View Table Dialog
// ========================
function ViewTableDialog({
	table,
	onClose,
}: {
	table: {
		id?: string;
		name?: string;
		number?: number;
		capacity?: number;
		location?: string;
		notes?: string;
		tableGuests?: Array<{
			id?: string;
			guest?: { name?: string; status?: string };
		}>;
	};
	onClose: () => void;
}) {
	const guests = table.tableGuests || [];
	const capacity = table.capacity || 0;
	const occupied = guests.length;

	return (
		<Dialog open onOpenChange={() => onClose()}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						{table.name}
						{table.number ? (
							<Badge variant="secondary">#{table.number}</Badge>
						) : null}
					</DialogTitle>
					<DialogDescription>Detalhes da mesa</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="grid grid-cols-2 gap-4">
						<div className="rounded-md border p-3 text-center">
							<p className="text-muted-foreground text-xs">Capacidade</p>
							<p className="font-semibold text-2xl">{capacity}</p>
						</div>
						<div className="rounded-md border p-3 text-center">
							<p className="text-muted-foreground text-xs">Ocupados</p>
							<p className="font-semibold text-2xl">{occupied}</p>
						</div>
					</div>

					<div className="rounded-md border p-3 text-center">
						<p className="text-muted-foreground text-xs">Disponíveis</p>
						<p
							className={`font-semibold text-2xl ${capacity - occupied <= 0 ? "text-red-600" : "text-green-600"}`}
						>
							{capacity - occupied}
						</p>
					</div>

					{/* Capacity bar */}
					<div className="space-y-1">
						<div className="flex justify-between text-muted-foreground text-xs">
							<span>Ocupação</span>
							<span>
								{capacity > 0 ? Math.round((occupied / capacity) * 100) : 0}%
							</span>
						</div>
						<div className="h-2 w-full overflow-hidden rounded-full bg-muted">
							<div
								className="h-full rounded-full bg-blue-500 transition-all"
								style={{
									width: `${capacity > 0 ? Math.min((occupied / capacity) * 100, 100) : 0}%`,
								}}
							/>
						</div>
					</div>

					{table.location ? (
						<div className="flex items-center gap-2 text-muted-foreground text-sm">
							<MapPin className="h-4 w-4" />
							<span>{table.location}</span>
						</div>
					) : null}

					{table.notes ? (
						<div className="rounded-md bg-muted/50 p-3 text-sm">
							<p className="text-muted-foreground text-xs">Notas</p>
							<p className="mt-1">{table.notes}</p>
						</div>
					) : null}

					{/* Guest list */}
					<div>
						<div className="mb-2 flex items-center gap-2">
							<Users className="h-4 w-4 text-muted-foreground" />
							<p className="font-medium text-sm">Convidados ({occupied})</p>
						</div>
						{guests.length === 0 ? (
							<p className="py-4 text-center text-muted-foreground text-sm">
								Nenhum convidado atribuído.
							</p>
						) : (
							<div className="space-y-1">
								{guests.map((tg) => {
									const guest = tg.guest;
									return (
										<div
											key={tg.id}
											className="flex items-center justify-between rounded-md border px-3 py-2"
										>
											<span className="text-sm">
												{guest?.name || "Convidado"}
											</span>
											<Badge variant="outline" className="text-xs">
												{guest?.status || "PENDING"}
											</Badge>
										</div>
									);
								})}
							</div>
						)}
					</div>
				</div>

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
// Table Dialog (Create / Edit)
// ========================
function TableDialog({
	open,
	onOpenChange,
	initialValues,
	onSubmit,
	isLoading,
}: {
	open: boolean;
	onOpenChange: (o: boolean) => void;
	initialValues?: {
		name: string;
		number: number;
		capacity: number;
		location: string;
		notes: string;
	};
	onSubmit: (v: {
		name: string;
		number: number;
		capacity: number;
		location: string;
		notes: string;
	}) => void;
	isLoading: boolean;
}) {
	const isEditing = !!initialValues;

	const form = useForm({
		defaultValues: {
			name: initialValues?.name || "",
			number: initialValues?.number || 0,
			capacity: initialValues?.capacity || 8,
			location: initialValues?.location || "",
			notes: initialValues?.notes || "",
		},
		onSubmit: async ({ value }) => {
			onSubmit(value);
		},
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>{isEditing ? "Editar mesa" : "Criar mesa"}</DialogTitle>
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
						<form.Field name="number">
							{(field) => (
								<div className="space-y-2">
									<Label>Número</Label>
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
					</div>
					<form.Field name="location">
						{(field) => (
							<div className="space-y-2">
								<Label>Localização</Label>
								<Input
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									disabled={isLoading}
								/>
							</div>
						)}
					</form.Field>
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
							{isLoading
								? isEditing
									? "A guardar..."
									: "A criar..."
								: isEditing
									? "Guardar"
									: "Criar"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
