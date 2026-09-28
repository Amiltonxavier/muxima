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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@muxima/ui/components/select";
import { toast } from "sonner";
import { StatusDot } from "@/shared/components/status-dot";
import {
	getStatusTone,
	SUPPLIER_STATUS_LABELS,
	toSelectItems,
} from "@/utils/status-helpers";
import type {
	SupplierListItem,
	SupplierStatusValue,
} from "../-queries/suppliers-queries";
import { useChangeSupplierStatus } from "../-queries/suppliers-queries";

const STATUS_OPTIONS = toSelectItems(SUPPLIER_STATUS_LABELS);

/**
 * "Mudar estado" action. Shows the current status and lets the user pick a
 * new one; the definitive transition rules live in the API, which rejects
 * invalid moves even if the UI ever lets one through.
 */
export function SupplierStatusDialog({
	open,
	onOpenChange,
	supplier,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	supplier: SupplierListItem | null;
}) {
	const changeStatus = useChangeSupplierStatus();

	const currentStatus = supplier?.status ?? "PROSPECT";

	const handleSubmit = (next: SupplierStatusValue) => {
		if (!supplier) return;
		changeStatus.mutate(
			{ id: supplier.id, status: next },
			{
				onSuccess: () => {
					toast.success(
						`Estado alterado para "${SUPPLIER_STATUS_LABELS[next] ?? next}"`,
					);
					onOpenChange(false);
				},
				onError: (error) => toast.error(error.message),
			},
		);
	};

	return (
		<Dialog
			open={open && !!supplier}
			onOpenChange={(next) => onOpenChange(next)}
		>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Mudar estado</DialogTitle>
					<DialogDescription>{supplier?.name ?? ""}</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="flex items-center justify-between rounded-md border p-3">
						<span className="text-muted-foreground text-sm">Estado actual</span>
						<StatusDot
							label={SUPPLIER_STATUS_LABELS[currentStatus] ?? currentStatus}
							tone={getStatusTone(currentStatus)}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="supplier-status-next">Novo estado</Label>
						<Select
							items={STATUS_OPTIONS}
							value={currentStatus}
							onValueChange={(v) => handleSubmit(v as SupplierStatusValue)}
						>
							<SelectTrigger id="supplier-status-next">
								<SelectValue placeholder="Escolher..." />
							</SelectTrigger>
							<SelectContent>
								{STATUS_OPTIONS.map((item) => (
									<SelectItem key={item.value} value={item.value}>
										{item.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<p className="text-muted-foreground text-xs">
							Escolher um novo estado aplica a alteração imediatamente. Um
							fornecedor concluído não pode voltar a estados anteriores.
						</p>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Fechar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
