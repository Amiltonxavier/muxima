import { Button } from "@muxima/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@muxima/ui/components/dialog";
import { Progress } from "@muxima/ui/components/progress";
import { toast } from "sonner";
import { ChartLegend, DonutChart } from "@/shared/components/charts";
import { ErrorState } from "@/shared/components/states/error-state";
import { LoadingState } from "@/shared/components/states/loading-state";
import { StatusDot } from "@/shared/components/status-dot";
import { dateHelper } from "@/shared/utils/date-helper";
import { formatCurrency } from "@/utils/format-currency";
import {
	getStatusLabel,
	getStatusTone,
	INSTALLMENT_STATUS_LABELS,
	PAYMENT_METHOD_LABELS,
	SUPPLIER_CATEGORY_LABELS,
	SUPPLIER_PAYMENT_STATUS_LABELS,
} from "@/utils/status-helpers";
import {
	useDeleteSupplierPayment,
	useSupplier,
} from "../-queries/suppliers-queries";

/**
 * Complete read-only view of a supplier: identity, contractual money (agreed,
 * paid, missing), bank details, payment distribution chart, the installment
 * timeline and the payment history. The API resolves every figure — this view
 * only renders it.
 */
export function SupplierDetailsDialog({
	open,
	onOpenChange,
	supplierId,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	supplierId: string;
}) {
	const supplierQuery = useSupplier(supplierId);
	const deletePayment = useDeleteSupplierPayment();

	const supplier = supplierQuery.data;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						{supplier?.name ?? "Fornecedor"}
						{supplier && (
							<StatusDot
								label={getStatusLabel(supplier.status, "supplier")}
								tone={getStatusTone(supplier.status)}
							/>
						)}
					</DialogTitle>
					<DialogDescription>
						{supplier
							? `${SUPPLIER_CATEGORY_LABELS[supplier.category] ?? supplier.category}`
							: "A carregar..."}
					</DialogDescription>
				</DialogHeader>

				{supplierQuery.isLoading ? (
					<LoadingState />
				) : supplierQuery.isError || !supplier ? (
					<ErrorState message="Não foi possível carregar os detalhes do fornecedor." />
				) : (
					<div className="space-y-6">
						{/* ── Money: acordado / pago / em falta ──────────── */}
						<div className="grid grid-cols-3 gap-3">
							<div className="rounded-md border p-3">
								<p className="text-muted-foreground text-xs">
									Montante acordado
								</p>
								<p className="font-semibold text-lg">
									{formatCurrency(supplier.money.total)}
								</p>
							</div>
							<div className="rounded-md border p-3">
								<p className="text-muted-foreground text-xs">Montante pago</p>
								<p className="font-semibold text-lg">
									{formatCurrency(supplier.money.paid)}
								</p>
							</div>
							<div className="rounded-md border p-3">
								<p className="text-muted-foreground text-xs">
									Montante em falta
								</p>
								<p
									className={`font-semibold text-lg ${
										supplier.money.pending > 0 ? "text-amber-700" : ""
									}`}
								>
									{formatCurrency(supplier.money.pending)}
								</p>
							</div>
						</div>

						<div className="space-y-1">
							<div className="flex items-center justify-between text-sm">
								<span className="text-muted-foreground">
									{SUPPLIER_PAYMENT_STATUS_LABELS[
										supplier.money.paymentStatus
									] ?? supplier.money.paymentStatus}
								</span>
								<span className="font-medium">
									{supplier.money.percentage}%
								</span>
							</div>
							<Progress
								value={supplier.money.percentage}
								aria-label={`Montante pago: ${supplier.money.percentage}%`}
							/>
						</div>

						{/* ── Informações + dados bancários ──────────────── */}
						<div className="grid gap-4 sm:grid-cols-2">
							<Card>
								<CardHeader>
									<CardTitle className="text-sm">Dados do fornecedor</CardTitle>
								</CardHeader>
								<CardContent className="space-y-1.5 text-sm">
									<DetailRow label="NIF" value={supplier.nif ?? undefined} />
									<DetailRow
										label="Telefone"
										value={supplier.phone ?? undefined}
									/>
									<DetailRow
										label="Email"
										value={supplier.email ?? undefined}
									/>
									<DetailRow
										label="Morada"
										value={supplier.address ?? undefined}
									/>
									{supplier.description && (
										<DetailRow label="Descrição" value={supplier.description} />
									)}
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle className="text-sm">Dados bancários</CardTitle>
								</CardHeader>
								<CardContent className="space-y-1.5 text-sm">
									<DetailRow
										label="IBAN"
										value={supplier.iban ?? undefined}
										mono
									/>
									<DetailRow
										label="MULTICAIXA Express"
										value={supplier.hasMcxExpress ? "Sim" : "Não"}
									/>
									{supplier.hasMcxExpress && (
										<DetailRow
											label="Telefone associado"
											value={supplier.mcxPhone ?? undefined}
										/>
									)}
									<DetailRow
										label="Modelo de pagamento"
										value={
											supplier.paymentModel === "INSTALLMENTS"
												? "Parcelado"
												: supplier.paymentModel === "CUSTOM"
													? "Personalizado"
													: "Pagamento único"
										}
									/>
								</CardContent>
							</Card>
						</div>

						{/* ── Distribuição pago/restante ─────────────────── */}
						{supplier.money.total > 0 && (
							<Card>
								<CardHeader>
									<CardTitle className="text-sm">
										Distribuição do montante
									</CardTitle>
								</CardHeader>
								<CardContent className="flex flex-col items-center gap-4 sm:flex-row sm:justify-around">
									<DonutChart
										segments={[
											{
												label: "Pago",
												value: Math.min(
													supplier.money.paid,
													supplier.money.total,
												),
												color: "var(--chart-2)",
											},
											{
												label: "Em falta",
												value: supplier.money.pending,
												color: "var(--chart-3)",
											},
										]}
										size={140}
										centerValue={`${supplier.money.percentage}%`}
										centerLabel="pago"
									/>
									<ChartLegend
										items={[
											{
												label: "Pago",
												color: "var(--chart-2)",
												value: formatCurrency(supplier.money.paid),
											},
											{
												label: "Em falta",
												color: "var(--chart-3)",
												value: formatCurrency(supplier.money.pending),
											},
										]}
									/>
								</CardContent>
							</Card>
						)}

						{/* ── Timeline de parcelas ───────────────────────── */}
						{supplier.money.hasInstallments && (
							<Card>
								<CardHeader>
									<CardTitle className="text-sm">Parcelamento</CardTitle>
								</CardHeader>
								<CardContent>
									<InstallmentTimeline
										installments={supplier.installments.map((installment) => ({
											id: installment.id,
											position: installment.position,
											amount: Number(installment.amount),
											dueDate: installment.dueDate,
											status: installment.status,
											paidAt: installment.paidAt,
										}))}
										now={new Date()}
									/>
								</CardContent>
							</Card>
						)}

						{/* ── Histórico de pagamentos ────────────────────── */}
						<Card>
							<CardHeader>
								<CardTitle className="text-sm">
									Histórico de pagamentos
								</CardTitle>
							</CardHeader>
							<CardContent>
								{supplier.payments.length === 0 ? (
									<p className="text-muted-foreground text-sm">
										Ainda não existem pagamentos registados.
									</p>
								) : (
									<ul className="space-y-2">
										{supplier.payments.map((payment) => (
											<li
												key={payment.id}
												className="flex items-center justify-between rounded-md border p-2.5 text-sm"
											>
												<div>
													<p className="font-medium">
														{formatCurrency(payment.amount)}
													</p>
													<p className="text-muted-foreground text-xs">
														{dateHelper.formatMedium(payment.paymentDate)} ·{" "}
														{PAYMENT_METHOD_LABELS[payment.method] ??
															payment.method}
														{payment.reference ? ` · ${payment.reference}` : ""}
													</p>
												</div>
												<Button
													variant="ghost"
													size="icon-sm"
													className="text-destructive"
													title="Eliminar pagamento"
													disabled={deletePayment.isPending}
													onClick={() =>
														deletePayment.mutate(
															{ id: payment.id },
															{
																onSuccess: () =>
																	toast.success("Pagamento eliminado"),
																onError: (error) => toast.error(error.message),
															},
														)
													}
												>
													🗑
												</Button>
											</li>
										))}
									</ul>
								)}
							</CardContent>
						</Card>
					</div>
				)}

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Fechar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function DetailRow({
	label,
	value,
	mono,
}: {
	label: string;
	value?: string;
	mono?: boolean;
}) {
	return (
		<div className="flex items-baseline justify-between gap-3">
			<span className="shrink-0 text-muted-foreground text-xs">{label}</span>
			{value ? (
				<span className={`text-right text-sm ${mono ? "font-mono" : ""}`}>
					{value}
				</span>
			) : (
				<span className="text-muted-foreground/50 text-sm">—</span>
			)}
		</div>
	);
}

/**
 * Vertical timeline of installments: position, amount, due date and state.
 * Reusable for any paid/overdue schedule presentation.
 */
export function InstallmentTimeline({
	installments,
	now,
}: {
	installments: Array<{
		id: string;
		position: number;
		amount: number;
		dueDate: Date | string;
		status: string;
		paidAt: Date | string | null;
	}>;
	now: Date;
}) {
	const sorted = [...installments].sort((a, b) => a.position - b.position);

	return (
		<ol className="space-y-0">
			{sorted.map((installment, index) => {
				const isPaid =
					installment.status === "PAID" || installment.paidAt !== null;
				const isOverdue =
					!isPaid &&
					installment.status !== "CANCELLED" &&
					new Date(installment.dueDate).getTime() < now.getTime();
				const tone = isPaid
					? "success"
					: isOverdue
						? "danger"
						: installment.status === "CANCELLED"
							? "neutral"
							: "warning";
				const label = isPaid
					? `Paga${installment.paidAt ? ` em ${dateHelper.formatMedium(installment.paidAt)}` : ""}`
					: isOverdue
						? "Em atraso"
						: (INSTALLMENT_STATUS_LABELS[installment.status] ??
							installment.status);

				return (
					<li key={installment.id} className="relative flex gap-3 pb-4">
						{/* Connector line between dots */}
						{index < sorted.length - 1 && (
							<span
								aria-hidden="true"
								className="absolute top-4 bottom-0 left-[7px] w-px bg-border"
							/>
						)}
						<span className="relative mt-1.5">
							<StatusDot label={label} tone={tone} />
						</span>
						<div className="min-w-0 flex-1 space-y-0.5">
							<div className="flex items-baseline justify-between gap-3">
								<p className="font-medium text-sm">
									Parcela {installment.position}
								</p>
								<p className="font-medium text-sm">
									{formatCurrency(installment.amount)}
								</p>
							</div>
							<p className="text-muted-foreground text-xs">
								{dateHelper.formatMedium(installment.dueDate)}
							</p>
						</div>
					</li>
				);
			})}
		</ol>
	);
}
