import { Button } from "@muxima/ui/components/button";
import { ExportMenu } from "@/shared/components/export-menu";
import { Plus } from "lucide-react";

export function SupplierHeader({
	eventId,
	total,
	onAddSupplier,
}: {
	eventId: string;
	total: number;
	onAddSupplier: () => void;
}) {
	return (
		<div className="flex items-center justify-between gap-4">
			<div>
				<h1 className="font-semibold text-2xl">Fornecedores</h1>
				<p className="text-muted-foreground text-sm">{total} fornecedores</p>
			</div>
			<div className="flex gap-2">
				<ExportMenu eventId={eventId} module="suppliers" />

				<Button onClick={onAddSupplier}>
				<Plus className="mr-2 h-4 w-4" />
				Adicionar fornecedor
			</Button>
			</div>
		</div>
	);
}
