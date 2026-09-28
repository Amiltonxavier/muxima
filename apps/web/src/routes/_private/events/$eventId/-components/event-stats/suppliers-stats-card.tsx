import { Button } from "@muxima/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ShoppingCart } from "lucide-react";
import { formatCurrency } from "@/utils/format-currency";
import { StatRow } from "./stat-row";

interface SuppliersStatsCardProps {
	eventId: string;
	stats?: {
		total: number;
		totalPrice: number;
		totalPaid: number;
		totalPending: number;
	};
}

/**
 * Compact supplier summary. Every figure comes from `suppliers.getStats`
 * (computed by the API); this card only renders it.
 */
export function SuppliersStatsCard({
	eventId,
	stats,
}: SuppliersStatsCardProps) {
	const total = stats?.total ?? 0;
	const totalPrice = stats?.totalPrice ?? 0;
	const totalPaid = stats?.totalPaid ?? 0;

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

			<CardContent className="space-y-3">
				{total === 0 ? (
					<p className="text-muted-foreground text-sm">
						Nenhum fornecedor registado
					</p>
				) : (
					<>
						<StatRow
							label="Montante contratado"
							value={formatCurrency(totalPrice)}
						/>
						<StatRow label="Pago" value={formatCurrency(totalPaid)} />
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
