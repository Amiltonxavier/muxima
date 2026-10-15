import { Card, CardContent, CardHeader } from "@muxima/ui/components/card";
import { ShoppingCart, UtensilsCrossed } from "lucide-react";
import { MetricProgressCard, StatsGrid } from "@/shared/components/metrics";
import { StatsCard } from "@/shared/components/stats-card/stats-card";
import { useFoodPlanStats } from "@/shared/queries/food-plan-queries";

export function FoodPlanStats({ eventId }: { eventId: string }) {
	const statsQuery = useFoodPlanStats(eventId);
	const stats = statsQuery.data;

	if (statsQuery.isLoading) {
		return (
			<StatsGrid columns={4}>
				{["card-1", "card-2", "card-3", "card-4"].map((id) => (
					<Card key={id}>
						<CardHeader>
							<div className="h-4 w-20 animate-pulse rounded bg-muted" />
						</CardHeader>
						<CardContent>
							<div className="h-8 w-24 animate-pulse rounded bg-muted" />
						</CardContent>
					</Card>
				))}
			</StatsGrid>
		);
	}

	return (
		<StatsGrid columns={4}>
			<StatsCard
				title="Itens"
				value={stats?.totalItems ?? 0}
				description={
					(stats?.pendingItems ?? 0) > 0
						? `${stats?.pendingItems} pendentes`
						: undefined
				}
				icon={<UtensilsCrossed className="h-4 w-4" />}
			/>
			<StatsCard
				title="Concluídos"
				value={stats?.completedItems ?? 0}
				description={
					(stats?.inProgressItems ?? 0) > 0
						? `${stats?.inProgressItems} em curso`
						: undefined
				}
			/>
			<MetricProgressCard
				title="Progresso"
				value={stats?.completedItems ?? 0}
				limit={stats?.totalItems ?? 0}
				percentage={stats?.completionPercentage}
				label={`${stats?.completionPercentage ?? 0}%`}
				description={`${stats?.totalQuantity ?? 0} unidades no total`}
			/>
			<StatsCard
				title="Fornecedor"
				value={
					stats?.hasSupplier ? (stats.supplierName ?? "—") : "Sem fornecedor"
				}
				description={
					stats?.hasSupplier
						? "Catering associado"
						: "Associe o fornecedor de catering"
				}
				icon={<ShoppingCart className="h-4 w-4" />}
			/>
		</StatsGrid>
	);
}
