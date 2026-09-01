import { Button } from "@muxima/ui/components/button";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { BackButton } from "@/shared/components/back-to";
import { QueryState } from "@/shared/components/states";
import { StatsCard } from "@/shared/components/stats-card/stats-card";
import {
	useInventoryItems,
	useInventoryStats,
} from "@/routes/_private/events/$eventId/inventory/-queries/inventory-queries";
import { formatCurrency } from "@/shared/utils/format-currency";
import { BeveragePlanning } from "./-components/beverage-planning";
import { CreateInventoryDialog } from "./-components/create-inventory-dialog";
import { InventoryFilters } from "./-components/inventory-filters";
import { InventoryTable } from "./-components/inventory-table";

export const Route = createFileRoute("/_private/events/$eventId/inventory/")({
	component: InventoryPage,
});

function InventoryPage() {
	const { eventId } = Route.useParams();

	const [search, setSearch] = useState("");
	const [categoryFilter, setCategoryFilter] = useState("ALL");
	const [stockFilter, setStockFilter] = useState("ALL");
	const [showCreate, setShowCreate] = useState(false);

	const statsQuery = useInventoryStats(eventId);
	const itemsQuery = useInventoryItems(eventId, {
		search: search || undefined,
		category: categoryFilter,
		stockStatus: stockFilter !== "ALL" ? (stockFilter as "LOW" | "OK" | "FULL") : undefined,
	});


	const items = (itemsQuery.data?.data ?? []) as Record<string, unknown>[];
	const stats = statsQuery.data?.stats;
	const pagination = itemsQuery.data?.pagination;

	const drinkStats = stats?.drinkStats;
	const drinkItems = (drinkStats?.items ?? []) as Record<string, unknown>[];

	return (
		<div className="space-y-6">
			<BackButton to={`/events/${eventId}`} label="Voltar ao evento" />

			<div className="flex items-center justify-between">
				<div>
					<h1 className="font-semibold text-2xl">Inventário</h1>
					<p className="text-muted-foreground text-sm">
						{pagination?.total ?? items.length} itens
					</p>
				</div>
				<Button onClick={() => setShowCreate(true)}>
					<Plus className="mr-2 h-4 w-4" />
					Adicionar item
				</Button>
			</div>

			{stats && (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<StatsCard
						title="Total planeado"
						value={stats.totalPlanned}
						description="itens"
					/>
					<StatsCard
						title="Em Estoque"
						value={stats.totalCurrent}
						description="itens"
					/>
					<StatsCard title="Valor total" value={formatCurrency(stats.totalValue)} />
					<StatsCard
						title="Stock baixo"
						value={stats.lowStockCount}
						description={stats.lowStockCount > 0}
					/>
				</div>
			)}

			{drinkStats && drinkStats.count > 0 && (
				<BeveragePlanning drinkStats={drinkStats} items={drinkItems} />
			)}

			<InventoryFilters
				search={search}
				onSearchChange={setSearch}
				categoryFilter={categoryFilter}
				onCategoryFilterChange={setCategoryFilter}
				stockFilter={stockFilter}
				onStockFilterChange={setStockFilter}
			/>

			<QueryState
				state={{
					isLoading: itemsQuery.isLoading,
					isError: itemsQuery.isError,
					isEmpty: items.length === 0,
					hasData: items.length > 0,
				}}
			>
				<InventoryTable
					items={items}
				/>
			</QueryState>

			{showCreate && <CreateInventoryDialog
				open={showCreate}
				onOpenChange={()=>setShowCreate (false)}
				eventId={eventId}
			/>}
		</div>
	);
}
