import { Button } from "@muxima/ui/components/button";
import { Progress } from "@muxima/ui/components/progress";
import { TableCell, TableRow } from "@muxima/ui/components/table";
import {
	Banknote,
	CalendarClock,
	Eye,
	History,
	Pencil,
	Trash2,
} from "lucide-react";
import { StatusDot } from "@/shared/components/status-dot";
import { dateHelper } from "@/shared/utils/date-helper";
import { formatCurrency } from "@/utils/format-currency";
import {
	getStatusLabel,
	getStatusTone,
	SUPPLIER_CATEGORY_LABELS,
	SUPPLIER_PAYMENT_STATUS_LABELS,
} from "@/utils/status-helpers";
import type { SupplierListItem } from "../-queries/suppliers-queries";

export function SupplierTableRow({
	supplier,
	onView,
	onAddPayment,
	onManageInstallments,
	onChangeStatus,
	onEdit,
	onDelete,
}: {
	supplier: SupplierListItem;
	onView: (supplier: SupplierListItem) => void;
	onAddPayment: (supplier: SupplierListItem) => void;
	onManageInstallments: (supplier: SupplierListItem) => void;
	onChangeStatus: (supplier: SupplierListItem) => void;
	onEdit: (supplier: SupplierListItem) => void;
	onDelete: (supplier: SupplierListItem) => void;
}) {
	const agreed = supplier.price ?? 0;
	const missing = supplier.pending ?? 0;

	// Column "Pagamento": single payment vs installment plan. The API resolves
	// the payment model; the row only renders it.
	const paymentLabel = supplier.hasInstallments
		? "Parcelado"
		: supplier.paymentStatus === "PAID"
			? "Pago de uma única vez"
			: "Pagamento único";
	const remaining = supplier.remainingInstallments ?? 0;

	// A payment is only possible on a confirmed supplier with an agreed amount
	// that is not fully settled yet — same rules the API enforces.
	const canPay =
		supplier.status === "CONFIRMED" &&
		agreed > 0 &&
		(supplier.paymentStatus ?? "PENDING") !== "PAID" &&
		!supplier.isFullyPaid;
	const canPlanInstallments =
		(supplier.status === "NEGOTIATING" || supplier.status === "CONFIRMED") &&
		agreed > 0;

	return (
		<TableRow>
			<TableCell>
				<p className="font-medium">{supplier.name}</p>
				{supplier.phone && (
					<p className="text-muted-foreground text-xs">{supplier.phone}</p>
				)}
			</TableCell>
			<TableCell>
				{SUPPLIER_CATEGORY_LABELS[supplier.category] ?? supplier.category}
			</TableCell>
			<TableCell className="text-right">
				<p className="font-medium">{formatCurrency(agreed)}</p>
			</TableCell>
			<TableCell className="text-right">
				<p
					className={
						missing > 0 && supplier.status !== "CANCELLED"
							? "font-medium text-amber-700"
							: "font-medium text-muted-foreground"
					}
				>
					{formatCurrency(missing)}
				</p>
			</TableCell>
			<TableCell>
				<div className="space-y-1">
					<div className="flex items-center justify-between gap-2 text-xs">
						<span className="font-medium">
							{SUPPLIER_PAYMENT_STATUS_LABELS[supplier.paymentStatus] ??
								supplier.paymentStatus}
						</span>
						<span className="text-muted-foreground">
							{supplier.percentage}%
						</span>
					</div>
					<Progress
						value={supplier.percentage}
						aria-label={`Pago ${supplier.percentage}%`}
					/>
					<p className="text-muted-foreground text-xs">{paymentLabel}</p>
					{supplier.hasInstallments && remaining > 0 && (
						<p className="text-muted-foreground text-xs">
							{remaining}{" "}
							{remaining === 1 ? "parcela restante" : "parcelas restantes"}
						</p>
					)}
					{supplier.nextDueDate && (
						<p className="text-muted-foreground text-xs">
							Próximo: {dateHelper.formatMedium(supplier.nextDueDate)}
						</p>
					)}
				</div>
			</TableCell>
			<TableCell>
				<StatusDot
					label={getStatusLabel(supplier.status, "supplier")}
					tone={getStatusTone(supplier.status)}
				/>
			</TableCell>
			<TableCell>
				<div className="flex gap-1">
					<Button
						variant="ghost"
						size="icon-sm"
						title="Ver detalhes"
						onClick={() => onView(supplier)}
					>
						<Eye className="h-3.5 w-3.5" />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						title={
							canPay
								? "Registar pagamento"
								: supplier.status !== "CONFIRMED"
									? "Só é possível pagar a um fornecedor confirmado"
									: agreed <= 0
										? "Defina primeiro o montante acordado"
										: "Montante já liquidado"
						}
						disabled={!canPay}
						onClick={() => onAddPayment(supplier)}
					>
						<Banknote className="h-3.5 w-3.5" />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						title={
							canPlanInstallments
								? "Plano de parcelas"
								: agreed <= 0
									? "Defina primeiro o montante acordado"
									: "Parcelas apenas em negociação ou confirmado"
						}
						disabled={!canPlanInstallments}
						onClick={() => onManageInstallments(supplier)}
					>
						<CalendarClock className="h-3.5 w-3.5" />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						title="Mudar estado"
						onClick={() => onChangeStatus(supplier)}
					>
						<History className="h-3.5 w-3.5" />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						title="Editar"
						onClick={() => onEdit(supplier)}
					>
						<Pencil className="h-3.5 w-3.5" />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						className="text-destructive"
						title="Eliminar"
						onClick={() => onDelete(supplier)}
					>
						<Trash2 className="h-3.5 w-3.5" />
					</Button>
				</div>
			</TableCell>
		</TableRow>
	);
}
