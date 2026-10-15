import { Button } from "@muxima/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ShoppingCart } from "lucide-react";
import { Ring } from "@/components/charts/ring";
import { RingCenter } from "@/components/charts/ring-center";
import { RingChart } from "@/components/charts/ring-chart";
import { ChartLegend } from "@/shared/components/charts";
import { SUPPLIER_STATUS_LABELS } from "@/utils/status-helpers";

interface SuppliersStatsCardProps {
	eventId: string;
	stats?: {
		total: number;
		/** Counts per lifecycle status, computed by `suppliers.getStats`. */
		byStatus: Record<string, number>;
	};
}

const STATUS_ORDER = [
	"PROSPECT",
	"CONTACTED",
	"NEGOTIATING",
	"CONFIRMED",
	"COMPLETED",
	"CANCELLED",
] as const;

const STATUS_COLORS: Record<string, string> = {
	PROSPECT: "var(--chart-4)",
	CONTACTED: "var(--chart-5)",
	NEGOTIATING: "var(--chart-1)",
	CONFIRMED: "var(--chart-2)",
	COMPLETED: "var(--chart-3)",
	CANCELLED: "var(--destructive)",
};

const RING_SIZE = 180;
const RING_STROKE_WIDTH = 11;

/**
 * Compact supplier summary by lifecycle status. Every count comes from
 * `suppliers.getStats` (computed by the API); this card only renders it as a
 * ring chart — one status per ring, sharing the total as the max.
 */
export function SuppliersStatsCard({
	eventId,
	stats,
}: SuppliersStatsCardProps) {
	const byStatus = stats?.byStatus ?? {};
	const total = stats?.total ?? 0;
	const statuses = STATUS_ORDER.filter((status) => (byStatus[status] ?? 0) > 0);

	const ringData = statuses.map((status) => ({
		label: SUPPLIER_STATUS_LABELS[status] ?? status,
		value: byStatus[status],
		maxValue: total,
		color: STATUS_COLORS[status],
	}));

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center justify-between text-sm">
					<span className="flex items-center gap-2">
						<ShoppingCart className="h-4 w-4" />
						Fornecedores
					</span>

					<span className="font-normal text-muted-foreground text-xs">
						{total} total
					</span>
				</CardTitle>
			</CardHeader>

			<CardContent className="space-y-4">
				{total === 0 ? (
					<p className="text-center text-muted-foreground text-sm">
						Nenhum fornecedor registado
					</p>
				) : (
					<div className="flex flex-col items-center gap-4">
						<RingChart
							data={ringData}
							size={RING_SIZE}
							strokeWidth={RING_STROKE_WIDTH}
						>
							{ringData.map((data, index) => (
								<Ring key={data.label} index={index} />
							))}

							<RingCenter defaultLabel="fornecedores" />
						</RingChart>

						<div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
							<ChartLegend
								items={ringData.map((data) => ({
									label: data.label,
									color: data.color,
									value: data.value,
								}))}
							/>
						</div>
					</div>
				)}

				<Button
					variant="ghost"
					size="sm"
					className="mx-auto mt-1 h-auto p-0"
					render={<Link to="/events/$eventId/suppliers" params={{ eventId }} />}
				>
					Ver fornecedores <ArrowRight size={4} />
				</Button>
			</CardContent>
		</Card>
	);
}
