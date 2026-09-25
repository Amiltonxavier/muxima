import type { TableWithGuests } from "@muxima/api/shared/types/entities";
import { Badge } from "@muxima/ui/components/badge";
import { Button } from "@muxima/ui/components/button";
import { Card } from "@muxima/ui/components/card";
import { Input } from "@muxima/ui/components/input";
import { Pagination } from "@muxima/ui/components/pagination";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@muxima/ui/components/table";
import { createFileRoute } from "@tanstack/react-router";
import {
	ChartPie,
	Eye,
	MapPin,
	Pencil,
	Plus,
	Search,
	Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BackButton } from "@/shared/components/back-to";
import { QueryState } from "@/shared/components/states";
import { StatsCard } from "@/shared/components/stats-card/stats-card";
import {
	useCreateTable,
	useDeleteTable,
	useTableStats,
	useTables,
	useUpdateTable,
} from "@/shared/queries/table-queries";
import { DeleteTableDialog } from "./-components/delete-table-dialog";
import { TableAnalyticsDialog } from "./-components/table-analytics-dialog";
import { TableDialog } from "./-components/table-dialog";
import { ViewTableDialog } from "./-components/view-table-dialog";

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
	const [editingTable, setEditingTable] = useState<TableWithGuests | null>(
		null,
	);
	const [viewingTable, setViewingTable] = useState<TableWithGuests | null>(
		null,
	);
	const [deletingTable, setDeletingTable] = useState<TableWithGuests | null>(
		null,
	);
	const [showAnalytics, setShowAnalytics] = useState(false);

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
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h1 className="font-semibold text-2xl">Mesas</h1>
					<p className="text-muted-foreground text-sm">
						{tableStats?.total ?? 0} mesas · {tableStats?.totalCapacity ?? 0}{" "}
						lugares · {tableStats?.totalOccupied ?? 0} ocupados
					</p>
				</div>
				<div className="flex gap-2">
					<Button
						variant="outline"
						onClick={() => setShowAnalytics(true)}
						disabled={!tableStats || (tableStats.total ?? 0) === 0}
					>
						<ChartPie className="mr-2 h-4 w-4" />
						Analytics
					</Button>
					<Button onClick={() => setShowCreate(true)}>
						<Plus className="mr-2 h-4 w-4" />
						Criar mesa
					</Button>
				</div>
			</div>

			{/* Metrics Cards */}
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<StatsCard title="Total de mesas" value={tableStats?.total ?? 0} />

				<StatsCard
					title="Lugares totais"
					value={tableStats?.totalCapacity ?? 0}
				/>

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
							{ id: editingTable.id, ...values },
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

			{viewingTable && (
				<ViewTableDialog
					table={viewingTable}
					onClose={() => setViewingTable(null)}
				/>
			)}

			<DeleteTableDialog
				open={!!deletingTable}
				table={deletingTable}
				onOpenChange={() => setDeletingTable(null)}
				onConfirm={() => {
					if (deletingTable) {
						deleteTable.mutate(
							{ id: deletingTable.id },
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
				isLoading={deleteTable.isPending}
			/>

			<TableAnalyticsDialog
				open={showAnalytics}
				onOpenChange={setShowAnalytics}
				stats={tableStats}
			/>
		</div>
	);
}
