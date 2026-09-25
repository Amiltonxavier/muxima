import { Button } from "@muxima/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Package } from "lucide-react";
import { formatCurrency } from "@/utils/format-currency";
import { StatRow } from "./stat-row";

interface VendorsStatsCardProps {
	eventId: string;
	stats?: {
		total: number;
		expenseCount: number;
		totalExpenses: number;
	};
}

export function VendorsStatsCard({ eventId, stats }: VendorsStatsCardProps) {
	const total = stats?.total ?? 0;
	const expenseCount = stats?.expenseCount ?? 0;
	const totalExpenses = stats?.totalExpenses ?? 0;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center justify-between text-sm">
					<span className="flex items-center gap-2">
						<Package className="h-4 w-4" />
						Fornecedores
					</span>

					<span className="font-normal text-muted-foreground text-xs">
						{total} total
					</span>
				</CardTitle>
			</CardHeader>

			<CardContent className="space-y-3">
				{total === 0 ? (
					<p className="text-muted-foreground text-sm">
						Nenhum fornecedor registado
					</p>
				) : (
					<>
						<StatRow label="Despesas" value={expenseCount} />

						{totalExpenses > 0 && (
							<StatRow label="Total" value={formatCurrency(totalExpenses)} />
						)}
					</>
				)}

				<Button
					variant="ghost"
					size="sm"
					className="mt-1 h-auto p-0"
					render={<Link to="/events/$eventId/suppliers" params={{ eventId }} />}
				>
					Ver fornecedores <ArrowRight size={4} />
				</Button>
			</CardContent>
		</Card>
	);
}
