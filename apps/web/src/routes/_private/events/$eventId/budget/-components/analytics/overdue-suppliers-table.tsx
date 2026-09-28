import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@muxima/ui/components/table";
import { AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/utils/format-currency";
import { formatDate } from "@/utils/format-date";
import type { OverdueSupplier } from "../../-types/analytics.types";
import { AnalyticsEmpty } from "./analytics-empty";

/**
 * Deliberately a table: a supplier, an overdue amount and a due date is
 * operational detail the user acts on, not a shape to plot.
 */
export function OverdueSuppliersTable({
	suppliers,
}: {
	suppliers: OverdueSupplier[];
}) {
	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="flex items-center gap-2 text-sm">
					<AlertTriangle className="h-4 w-4" />
					Fornecedores em atraso
				</CardTitle>
			</CardHeader>
			<CardContent>
				{suppliers.length === 0 ? (
					<AnalyticsEmpty message="Nenhum fornecedor em atraso." />
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Fornecedor</TableHead>
								<TableHead className="text-right">Em atraso</TableHead>
								<TableHead className="text-right">Próximo</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{suppliers.map((supplier) => (
								<TableRow key={supplier.id}>
									<TableCell>{supplier.name}</TableCell>
									<TableCell className="text-right font-medium">
										{formatCurrency(supplier.overdueAmount)}
									</TableCell>
									<TableCell className="text-right text-muted-foreground text-xs">
										{supplier.nextDueDate
											? formatDate(supplier.nextDueDate)
											: "—"}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</CardContent>
		</Card>
	);
}
