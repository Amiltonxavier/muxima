import { PERMISSIONS } from "@muxima/permissions";
import { Button } from "@muxima/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@muxima/ui/components/dialog";
import { Progress } from "@muxima/ui/components/progress";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ChartLegend, DonutChart } from "@/shared/components/charts";
import { ErrorState } from "@/shared/components/states/error-state";
import { LoadingState } from "@/shared/components/states/loading-state";
import { StatusDot } from "@/shared/components/status-dot";
import { useEventCan } from "@/shared/hooks/use-can";
import { useEventLock } from "@/shared/hooks/use-event-lock";
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
	const { isEventLocked, lockMessage } = useEventLock();
	const supplier = supplierQuery.data;
	// Sem pagamentos carregados não há botão para esconder, logo `undefined`
	// é seguro. Sem `suppliers.update` o apagar de pagamentos nem aparece —
	// a API rejeita a mesma mutação de qualquer forma.
	const canUpdate = useEventCan(supplier?.eventId, PERMISSIONS.SUPPLIER_UPDATE);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
				<DialogHeader className="border-b pb-5">
					{supplier ? (
						<div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
							<div>
								<DialogTitle className="text-xl">{supplier.name}</DialogTitle>

								<div className="mt-1 flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
									<span>
										{SUPPLIER_CATEGORY_LABELS[supplier.category] ??
											supplier.category}
									</span>

									<span aria-hidden="true">·</span>

									<StatusDot
										label={getStatusLabel(supplier.status, "supplier")}
										tone={getStatusTone(supplier.status)}
									/>
								</div>
							</div>

							<div className="text-left sm:text-right">
								<p className="text-muted-foreground text-xs">
									Montante acordado
								</p>
								<p className="font-semibold text-lg tabular-nums">
									{formatCurrency(supplier.money.total)}
								</p>
							</div>
						</div>
					) : (
						<DialogTitle>Fornecedor</DialogTitle>
					)}
				</DialogHeader>

				{supplierQuery.isLoading ? (
					<LoadingState />
				) : supplierQuery.isError || !supplier ? (
					<ErrorState message="Não foi possível carregar os detalhes do fornecedor." />
				) : (
					<div className="space-y-7 py-1">
						{/* MAIN */}
						<div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
							{/* LEFT — SUPPLIER */}
							<section className="space-y-6 md:border-r md:pr-6">
								<div>
									<h3 className="font-medium text-sm">Dados do fornecedor</h3>

									<p className="mt-1 text-muted-foreground text-xs">
										Informação de contacto e identificação.
									</p>
								</div>

								<div className="space-y-3">
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
								</div>

								<div className="border-t pt-5">
									<h3 className="font-medium text-sm">Dados de pagamento</h3>

									<div className="mt-3 space-y-3">
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
									</div>
								</div>
							</section>

							{/* RIGHT — FINANCIAL */}
							<section className="space-y-6">
								<div>
									<h3 className="font-medium text-sm">Resumo financeiro</h3>

									<p className="mt-1 text-muted-foreground text-xs">
										Estado dos pagamentos deste fornecedor.
									</p>
								</div>

								<div className="grid grid-cols-3 border-y py-4">
									<MoneySummary label="Acordado" value={supplier.money.total} />

									<MoneySummary label="Pago" value={supplier.money.paid} />

									<MoneySummary
										label="Em falta"
										value={supplier.money.pending}
										emphasis={supplier.money.pending > 0}
									/>
								</div>

								<div className="space-y-2">
									<div className="flex items-center justify-between gap-4">
										<span className="text-muted-foreground text-xs">
											{
												SUPPLIER_PAYMENT_STATUS_LABELS[
													supplier.money.paymentStatus
												]
											}
										</span>

										<span className="font-medium text-sm tabular-nums">
											{supplier.money.percentage}%
										</span>
									</div>

									<Progress
										value={supplier.money.percentage}
										aria-label={`Montante pago: ${supplier.money.percentage}%`}
									/>
								</div>

								{supplier.money.total > 0 && (
									<div className="border-t pt-5">
										<div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-between">
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
										</div>
									</div>
								)}
							</section>
						</div>

						{/* INSTALLMENTS */}
						{supplier.money.hasInstallments && (
							<section className="border-t pt-6">
								<div className="mb-4">
									<h3 className="font-medium text-sm">Parcelamento</h3>

									<p className="mt-1 text-muted-foreground text-xs">
										Estado e datas das parcelas acordadas.
									</p>
								</div>

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
							</section>
						)}

						{/* PAYMENT HISTORY */}
						<section className="border-t pt-6">
							<div className="mb-4">
								<h3 className="font-medium text-sm">Histórico de pagamentos</h3>

								<p className="mt-1 text-muted-foreground text-xs">
									Registo dos pagamentos efectuados.
								</p>
							</div>

							{supplier.payments.length === 0 ? (
								<p className="py-4 text-muted-foreground text-sm">
									Ainda não existem pagamentos registados.
								</p>
							) : (
								<ul className="divide-y">
									{supplier.payments.map((payment) => (
										<li
											key={payment.id}
											className="flex items-center justify-between gap-4 py-3"
										>
											<div className="min-w-0">
												<p className="font-medium text-sm">
													{formatCurrency(payment.amount)}
												</p>

												<p className="mt-0.5 text-muted-foreground text-xs">
													{dateHelper.formatMedium(payment.paymentDate)}
													{" · "}
													{PAYMENT_METHOD_LABELS[payment.method] ??
														payment.method}
													{payment.reference ? ` · ${payment.reference}` : ""}
												</p>
											</div>{" "}
											{canUpdate && (
												<Button
													variant="ghost"
													size="icon-sm"
													className="shrink-0 text-destructive"
													title={
														isEventLocked
															? (lockMessage ?? undefined)
															: "Eliminar pagamento"
													}
													disabled={deletePayment.isPending || isEventLocked}
													onClick={() =>
														deletePayment.mutate(
															{ id: payment.id },
															{
																onSuccess: () =>
																	toast.success("Pagamento eliminado."),
															},
														)
													}
												>
													<Trash2 className="size-4" />
												</Button>
											)}
										</li>
									))}
								</ul>
							)}
						</section>
					</div>
				)}

				<DialogFooter className="border-t pt-4">
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Fechar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function MoneySummary({
	label,
	value,
	emphasis = false,
}: {
	label: string;
	value: number;
	emphasis?: boolean;
}) {
	return (
		<div>
			<p className="text-muted-foreground text-xs">{label}</p>
			<p
				className={`mt-1 font-semibold text-sm tabular-nums ${
					emphasis ? "text-amber-700" : ""
				}`}
			>
				{formatCurrency(value)}
			</p>
		</div>
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
		<div className="flex items-baseline justify-between gap-4">
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
		<ol className="grid gap-4 md:grid-cols-2">
			{sorted.map((installment) => {
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
					? installment.paidAt
						? `Paga em ${dateHelper.formatMedium(installment.paidAt)}`
						: "Paga"
					: isOverdue
						? "Em atraso"
						: (INSTALLMENT_STATUS_LABELS[installment.status] ??
							installment.status);

				return (
					<li
						key={installment.id}
						className="flex items-start gap-3 border-b pb-3"
					>
						<div className="mt-1">
							<StatusDot label={label} tone={tone} />
						</div>

						<div className="min-w-0 flex-1">
							<div className="flex items-baseline justify-between gap-4">
								<p className="font-medium text-sm">
									Parcela {installment.position}
								</p>

								<p className="font-medium text-sm tabular-nums">
									{formatCurrency(installment.amount)}
								</p>
							</div>

							<p className="mt-0.5 text-muted-foreground text-xs">
								Vencimento: {dateHelper.formatMedium(installment.dueDate)}
							</p>
						</div>
					</li>
				);
			})}
		</ol>
	);
}
