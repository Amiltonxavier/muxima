
import { CreditCard } from "lucide-react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@muxima/ui/components/card";
import { ChartStatItem } from "./chart-stat-item";
import { ProgressDonut } from "@/shared/components/charts";
import { formatCurrency } from "@/utils/format-currency";



interface BudgetSummaryChartProps {
	data?: {
		totalBudget: number;
		reserve: number;
		planned: number;
		spent: number;
		available: number;
	};
}

export function BudgetSummaryChart({
	data,
}: BudgetSummaryChartProps) {
	if (!data) {
		return null;
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-sm">
					<CreditCard className="h-4 w-4" />
					Resumo Financeiro
				</CardTitle>
			</CardHeader>

			<CardContent className="space-y-4">
				{data.totalBudget > 0 ? (
					<>
						<div className="flex items-center justify-center">
							<ProgressDonut
								value={data.spent}
								max={data.totalBudget}
								color="#f59e0b"
								size={140}
								centerLabel="gasto"
							/>
						</div>

						<div className="grid grid-cols-2 gap-3">
							<ChartStatItem
								label="Total"
								value={formatCurrency(data.totalBudget)}
							/>

							<ChartStatItem
								label="Gasto"
								value={formatCurrency(data.spent)}
							/>

							{data.planned > 0 && (
								<ChartStatItem
									label="Planeado"
									value={formatCurrency(data.planned)}
								/>
							)}

							<ChartStatItem
								label="Disponível"
								value={formatCurrency(
									data.available > 0 ? data.available : 0,
								)}
								valueClassName={
									data.available < 0
										? "text-red-600"
										: "text-green-600"
								}
							/>
						</div>
					</>
				) : (
					<p className="text-center text-muted-foreground text-sm">
						Nenhum orçamento definido
					</p>
				)}
			</CardContent>
		</Card>
	);
}