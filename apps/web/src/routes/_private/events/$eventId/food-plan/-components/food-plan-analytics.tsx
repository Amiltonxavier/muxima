import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { StatChart } from "@/shared/components/charts";
import {
	useFoodPlan,
	useFoodPlanStats,
} from "@/shared/queries/food-plan-queries";
import { FOOD_PLAN_CATEGORY_COLORS } from "../-constants/food-plan.constants";
import type { FoodPlanItemRow } from "../-types/food-plan.types";

export function FoodPlanAnalytics({ eventId }: { eventId: string }) {
	const statsQuery = useFoodPlanStats(eventId);
	const planQuery = useFoodPlan(eventId);

	const stats = statsQuery.data;
	const items = (planQuery.data?.items ?? []) as FoodPlanItemRow[];

	if (statsQuery.isLoading) {
		return (
			<Card>
				<CardContent className="animate-pulse space-y-4 pt-6">
					<div className="h-40 rounded bg-muted" />
					<div className="h-8 w-48 rounded bg-muted" />
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="grid gap-4 lg:grid-cols-2">
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Itens por categoria</CardTitle>
				</CardHeader>
				<CardContent>
					{!stats || stats.byCategory.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							Sem itens para mostrar.
						</p>
					) : (
						<div className="space-y-4">
							<StatChart
								data={stats.byCategory.map((entry) => ({
									label: entry.label,
									value: entry.count,
									color: FOOD_PLAN_CATEGORY_COLORS[entry.key] ?? "#3b82f6",
								}))}
							/>
							<div className="space-y-1">
								{stats.byCategory.map((entry) => (
									<div
										key={entry.key}
										className="flex items-center justify-between text-sm"
									>
										<span>{entry.label}</span>
										<span className="text-muted-foreground">
											{entry.count} itens · {entry.totalQuantity} unidades ·{" "}
											{entry.completed} concluídos
										</span>
									</div>
								))}
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Resumo</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3 text-sm">
					<div className="flex justify-between">
						<span className="text-muted-foreground">Total de itens</span>
						<span className="font-medium">{stats?.totalItems ?? 0}</span>
					</div>
					<div className="flex justify-between">
						<span className="text-muted-foreground">Quantidade total</span>
						<span className="font-medium">{stats?.totalQuantity ?? 0}</span>
					</div>
					<div className="flex justify-between">
						<span className="text-muted-foreground">
							Categoria com mais itens
						</span>
						<span className="font-medium">
							{!stats || stats.byCategory.length === 0
								? "—"
								: [...stats.byCategory].sort((a, b) => b.count - a.count)[0]
										.label}
						</span>
					</div>
					<div className="flex justify-between">
						<span className="text-muted-foreground">
							Item com maior quantidade
						</span>
						<span className="font-medium">
							{items.length > 0
								? [...items].sort((a, b) => b.quantity - a.quantity)[0].name
								: "—"}
						</span>
					</div>
					<div className="flex justify-between">
						<span className="text-muted-foreground">Fornecedor do plano</span>
						<span className="font-medium">
							{stats?.hasSupplier
								? (stats.supplierName ?? "—")
								: "Sem fornecedor"}
						</span>
					</div>
					{planQuery.data?.notes && (
						<div className="space-y-1 border-t pt-3">
							<span className="text-muted-foreground">Notas</span>
							<p className="whitespace-pre-line">{planQuery.data.notes}</p>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
