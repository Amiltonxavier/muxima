import { Badge } from "@muxima/ui/components/badge";
import { Card } from "@muxima/ui/components/card";
import { Progress } from "@muxima/ui/components/progress";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@muxima/ui/components/table";
import { EmptyState } from "@/shared/components/states/empty-state";
import { ErrorState } from "@/shared/components/states/error-state";
import { LoadingState } from "@/shared/components/states/loading-state";
import { formatCurrency } from "@/utils/format-currency";
import { SOURCE_LABELS } from "../-constants/budget.constants";
import type { BudgetLine } from "../-queries/budget-queries";

export function BudgetLinesTable({
	lines,
	isLoading,
	isError,
	hasActiveFilter,
}: {
	lines: BudgetLine[];
	isLoading: boolean;
	isError: boolean;
	hasActiveFilter: boolean;
}) {
	if (isLoading) {
		return <LoadingState />;
	}

	if (isError) {
		return (
			<ErrorState message="Não foi possível carregar os itens do orçamento. Tente novamente." />
		);
	}

	if (lines.length === 0) {
		return (
			<EmptyState
				message={
					hasActiveFilter
						? "Nenhum item para a origem seleccionada."
						: "Ainda não existem itens com valores no inventário ou nos fornecedores."
				}
			/>
		);
	}

	return (
		<Card>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Origem</TableHead>
						<TableHead>Descrição</TableHead>
						<TableHead className="text-right">Planeado</TableHead>
						<TableHead className="text-right">Pago</TableHead>
						<TableHead className="text-right">Por pagar</TableHead>
						<TableHead className="w-40">Progresso</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{lines.map((line) => (
						<TableRow key={`${line.source}-${line.id}`}>
							<TableCell>
								<Badge variant="outline">{SOURCE_LABELS[line.source]}</Badge>
							</TableCell>
							<TableCell className="font-medium">{line.label}</TableCell>
							<TableCell className="text-right">
								{formatCurrency(line.planned)}
							</TableCell>
							<TableCell className="text-right">
								{formatCurrency(line.paid)}
							</TableCell>
							<TableCell className="text-right">
								{formatCurrency(line.pending)}
							</TableCell>
							<TableCell>
								<div className="space-y-1">
									<Progress value={line.percentage} />
									<span className="text-muted-foreground text-xs">
										{line.percentage}%
									</span>
								</div>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</Card>
	);
}
