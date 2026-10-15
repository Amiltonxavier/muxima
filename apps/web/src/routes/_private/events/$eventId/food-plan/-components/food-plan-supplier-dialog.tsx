import { Badge } from "@muxima/ui/components/badge";
import { Button } from "@muxima/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@muxima/ui/components/dialog";
import { Label } from "@muxima/ui/components/label";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { QueryState } from "@/shared/components/states";
import { useSetFoodPlanSupplier } from "@/shared/queries/food-plan-queries";
import { useSuppliers } from "@/shared/queries/supplier-queries";

export function FoodPlanSupplierDialog({
	eventId,
	open,
	onOpenChange,
}: {
	eventId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const suppliersQuery = useSuppliers(eventId, { page: 1, limit: 100 });
	const setSupplier = useSetFoodPlanSupplier();
	const isPending = setSupplier.isPending;

	const suppliers = suppliersQuery.data?.data ?? [];
	const cateringSuppliers = suppliers.filter((s) => s.category === "CATERING");

	const handleSelect = (supplierId: string) => {
		setSupplier.mutate(
			{ eventId, supplierId },
			{
				onSuccess: () => {
					toast.success("Fornecedor associado ao plano");
					onOpenChange(false);
				},
			},
		);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Associar fornecedor</DialogTitle>
					<DialogDescription>
						O plano suporta um único fornecedor — normalmente o catering. Depois
						de associado, só pode ser removido, não trocado.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4">
					<QueryState
						state={{
							isLoading: suppliersQuery.isLoading,
							isError: suppliersQuery.isError,
							isEmpty: cateringSuppliers.length === 0,
							hasData: cateringSuppliers.length > 0,
						}}
					>
						<div className="space-y-2">
							<Label>Fornecedores de catering</Label>
							{cateringSuppliers.map((supplier) => (
								<button
									type="button"
									key={supplier.id}
									onClick={() => handleSelect(supplier.id)}
									disabled={isPending}
									className="flex w-full items-center justify-between rounded-md border p-3 text-left transition-colors hover:bg-accent disabled:opacity-50"
								>
									<span className="font-medium text-sm">{supplier.name}</span>
									<Badge variant="outline">{supplier.status}</Badge>
								</button>
							))}
						</div>
					</QueryState>
					{cateringSuppliers.length === 0 && !suppliersQuery.isLoading && (
						<p className="text-muted-foreground text-sm">
							Sem fornecedores de catering.{" "}
							<Link
								to="/events/$eventId/suppliers"
								params={{ eventId }}
								className="underline"
							>
								Criar fornecedor
							</Link>
						</p>
					)}
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancelar
						</Button>
					</DialogFooter>
				</div>
			</DialogContent>
		</Dialog>
	);
}
