import { Button } from "@muxima/ui/components/button";
import { Pencil } from "lucide-react";

export function BudgetHeader({
	hasBudget,
	onEditTarget,
}: {
	hasBudget: boolean;
	onEditTarget: () => void;
}) {
	return (
		<div className="flex items-center justify-between gap-4">
			<div>
				<h1 className="font-semibold text-2xl">Orçamento</h1>
				<p className="text-muted-foreground text-sm">
					Os totais são calculados a partir do inventário e dos fornecedores.
					Aqui só define a meta.
				</p>
			</div>
			<Button
				variant={hasBudget ? "outline" : "default"}
				onClick={onEditTarget}
			>
				<Pencil className="mr-2 h-4 w-4" />
				{hasBudget ? "Editar meta" : "Definir meta"}
			</Button>
		</div>
	);
}
