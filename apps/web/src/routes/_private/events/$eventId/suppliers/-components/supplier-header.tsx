import { Button } from "@muxima/ui/components/button";
import { Plus } from "lucide-react";

export function SupplierHeader({
	total,
	onAddSupplier,
}: {
	total: number;
	onAddSupplier: () => void;
}) {
	return (
		<div className="flex items-center justify-between gap-4">
			<div>
				<h1 className="font-semibold text-2xl">Fornecedores</h1>
				<p className="text-muted-foreground text-sm">{total} fornecedores</p>
			</div>
			<Button onClick={onAddSupplier}>
				<Plus className="mr-2 h-4 w-4" />
				Adicionar fornecedor
			</Button>
		</div>
	);
}
