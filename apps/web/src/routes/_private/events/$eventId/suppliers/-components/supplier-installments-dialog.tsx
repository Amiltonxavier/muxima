import { Button } from "@muxima/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@muxima/ui/components/dialog";
import { Input } from "@muxima/ui/components/input";
import { Label } from "@muxima/ui/components/label";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { dateHelper } from "@/shared/utils/date-helper";
import { formatCurrency } from "@/utils/format-currency";
import { useSetSupplierInstallments } from "../-queries/suppliers-queries";
import type {
	SupplierInstallmentDraft,
	SupplierInstallmentInput,
	SupplierInstallmentValue,
} from "../-types/suppliers.types";

const EMPTY_DRAFT: SupplierInstallmentDraft = {
	amount: "",
	dueDate: "",
	notes: "",
};

/** Rebuilds the editable rows from the plan currently stored in the API. */
function toDrafts(
	installments: SupplierInstallmentInput[],
): SupplierInstallmentDraft[] {
	if (installments.length === 0) {
		return [{ ...EMPTY_DRAFT }];
	}
	return installments.map((installment) => ({
		amount: String(Number(installment.amount)),
		dueDate: dateHelper.formatToIsoDate(installment.dueDate),
		notes: installment.notes ?? "",
	}));
}

export function SupplierInstallmentsDialog({
	open,
	onOpenChange,
	supplierId,
	price,
	installments,
	status = "CONFIRMED",
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	supplierId: string;
	/** Montante acordado; 0 quando ainda não foi definido. */
	price: number;
	installments: SupplierInstallmentInput[];
	/** Estado do fornecedor; a API revalida. Default: CONFIRMED. */
	status?: string;
}) {
	const setInstallments = useSetSupplierInstallments();
	const [rows, setRows] = useState(() => toDrafts(installments));

	const total = rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
	const exceedsPrice = price > 0 && total > price;
	// Espelho das regras da API: montante acordado + estado elegível.
	const blockedByStatus = status !== "NEGOTIATING" && status !== "CONFIRMED";
	const blockedByAmount = !(price > 0);
	const blocked = blockedByStatus || blockedByAmount;

	const patchRow = (
		index: number,
		changes: Partial<SupplierInstallmentDraft>,
	) => {
		setRows((current) =>
			current.map((row, i) => (i === index ? { ...row, ...changes } : row)),
		);
	};

	const handleSave = () => {
		const valid = rows.filter((row) => Number(row.amount) > 0 && row.dueDate);
		if (valid.length === 0) {
			toast.error("Adicione pelo menos uma parcela com montante e data");
			return;
		}
		// `parseISO` keeps each `yyyy-MM-dd` row on the local day the user
		// picked, instead of shifting it to UTC like `new Date(string)` does.
		const values: SupplierInstallmentValue[] = [];
		for (const row of valid) {
			const dueDate = dateHelper.getDate(row.dueDate);
			if (!dueDate) {
				toast.error("Data de vencimento inválida");
				return;
			}
			values.push({ amount: Number(row.amount), dueDate });
		}
		setInstallments.mutate(
			{ supplierId, installments: values },
			{
				onSuccess: () => {
					toast.success("Plano de parcelas actualizado");
					onOpenChange(false);
				},
				onError: (error) => toast.error(error.message),
			},
		);
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				// Reopening discards the abandoned edits, so the rows are seeded
				// again from the plan stored in the API.
				if (next) {
					setRows(toDrafts(installments));
				}
				onOpenChange(next);
			}}
		>
			<DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Plano de parcelas</DialogTitle>
					<DialogDescription>
						A soma não pode ultrapassar o montante acordado (
						{formatCurrency(price)}).
					</DialogDescription>
					{blockedByStatus && (
						<p className="text-amber-700 text-xs">
							As parcelas só podem ser geridas num fornecedor em negociação ou
							confirmado.
						</p>
					)}
					{blockedByAmount && (
						<p className="text-amber-700 text-xs">
							Defina primeiro o montante acordado do fornecedor.
						</p>
					)}
				</DialogHeader>

				<ul className="space-y-3">
					{rows.map((row, index) => (
						<li
							key={index}
							className="grid grid-cols-[1fr_9rem_auto] items-end gap-2"
						>
							<div className="space-y-1">
								<Label htmlFor={`installment-amount-${index}`}>
									Montante (Kz)
								</Label>
								<Input
									id={`installment-amount-${index}`}
									type="number"
									min={0}
									step={1000}
									value={row.amount}
									onChange={(e) => patchRow(index, { amount: e.target.value })}
									disabled={setInstallments.isPending}
								/>
							</div>
							<div className="space-y-1">
								<Label htmlFor={`installment-due-${index}`}>Vence</Label>
								<Input
									id={`installment-due-${index}`}
									type="date"
									value={row.dueDate}
									onChange={(e) => patchRow(index, { dueDate: e.target.value })}
									disabled={setInstallments.isPending}
								/>
							</div>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="text-destructive"
								title="Remover parcela"
								disabled={setInstallments.isPending || rows.length === 1}
								onClick={() =>
									setRows((current) => current.filter((_, i) => i !== index))
								}
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						</li>
					))}
				</ul>

				<div className="flex items-center justify-between text-sm">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() =>
							setRows((current) => [...current, { ...EMPTY_DRAFT }])
						}
						disabled={setInstallments.isPending}
					>
						<Plus className="mr-2 h-3.5 w-3.5" />
						Adicionar parcela
					</Button>
					<span className={exceedsPrice ? "font-medium text-destructive" : ""}>
						Total: {formatCurrency(total)}
					</span>
				</div>

				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
					>
						Cancelar
					</Button>
					<Button
						type="button"
						disabled={blocked || setInstallments.isPending || exceedsPrice}
						onClick={handleSave}
					>
						{setInstallments.isPending ? "A guardar..." : "Guardar plano"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
