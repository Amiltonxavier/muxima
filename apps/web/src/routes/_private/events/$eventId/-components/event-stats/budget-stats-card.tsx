// event-stats/components/budget-stats-card.tsx

import { ArrowRight, CreditCard } from "lucide-react";

import { Link } from "@tanstack/react-router";
import { Button } from "@muxima/ui/components/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@muxima/ui/components/card";
import { formatCurrency } from "@/utils/format-currency";
import { StatRow } from "./stat-row";


interface BudgetStatsCardProps {
	eventId: string;
	stats?: {
		plannedAmount: number;
		categoryCount: number;
	};
}

export function BudgetStatsCard({
	eventId,
	stats,
}: BudgetStatsCardProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-sm">
					<CreditCard className="h-4 w-4" />
					Orçamento
				</CardTitle>
			</CardHeader>

			<CardContent className="space-y-3">
				<StatRow
					label="Planeado"
					value={formatCurrency(stats?.plannedAmount ?? 0)}
				/>

				<StatRow
					label="Categorias"
					value={stats?.categoryCount ?? 0}
				/>

				<Button
					variant="ghost"
					size="sm"
					className="mt-1 h-auto p-0"
					render={
						<Link
							to="/events/$eventId/budget"
							params={{ eventId }}
						/>
					}
				>
					Ver orçamento <ArrowRight size={4} />
				</Button>
			</CardContent>
		</Card>
	);
}