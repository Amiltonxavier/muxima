/*
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@muxima/ui/components/dialog";

interface ViewExpenseDialogProps {
  open: boolean,
  expense: Record<string, unknown>,
  onClose: VoidFunction;
}

export function ViewExpenseDialog({
  open,
	expense,
	onClose,
}: ViewExpenseDialogProps) {
  const totalPaid = (
		(expense.payments as Array<Record<string, unknown>>) ?? []
	).reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
	const totalAmount = Number(expense.totalAmount ?? 0);
	const remaining = totalAmount - totalPaid;
	const vendor = expense.vendor as Record<string, unknown> | undefined;
	const category = expense.budgetCategory as
		| Record<string, unknown>
		| undefined;
	const payments = (expense.payments as Array<Record<string, unknown>>) ?? [];
  return (
   	<Dialog open={open} onOpenChange={() => onClose()}>
			<DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{String(expense.description)}</DialogTitle>
					<DialogDescription>Detalhes da despesa</DialogDescription>
				</DialogHeader>
				<div className="space-y-4">
					<div className="grid grid-cols-2 gap-3">
						<div className="rounded border p-3">
							<p className="text-muted-foreground text-xs">Valor total</p>
							<p className="font-semibold text-xl">
								{formatCurrency(totalAmount)}
							</p>
						</div>
						<div className="rounded border p-3">
							<p className="text-muted-foreground text-xs">Estado</p>
							<Badge
								className={getStatusColor(String(expense.status ?? "PLANNED"))}
							>
								{getStatusLabel(String(expense.status ?? "PLANNED"), "expense")}
							</Badge>
						</div>
					</div>

					<div className="rounded border p-3">
						<p className="mb-1 text-muted-foreground text-xs">
							Progresso de pagamento
						</p>
						<div className="mb-1 flex items-center justify-between text-sm">
							<span>Pago: {formatCurrency(totalPaid)}</span>
							<span>
								Restante: {formatCurrency(remaining > 0 ? remaining : 0)}
							</span>
						</div>
						<Progress
							value={
								totalAmount > 0
									? Math.round((totalPaid / totalAmount) * 100)
									: 0
							}
						/>
					</div>

					<div className="grid grid-cols-2 gap-3">
						{expense.dueDate ? (
							<div className="rounded border p-3">
								<p className="text-muted-foreground text-xs">Data limite</p>
								<p className="font-medium text-sm">
									{formatDate(expense.dueDate as string)}
								</p>
							</div>
						) : null}
						{category && (
							<div className="rounded border p-3">
								<p className="text-muted-foreground text-xs">Categoria</p>
								<p className="font-medium text-sm">{String(category.name)}</p>
							</div>
						)}
					</div>

					{vendor && (
						<div className="rounded border p-3">
							<p className="text-muted-foreground text-xs">Fornecedor</p>
							<p className="font-medium text-sm">{String(vendor.name)}</p>
							{vendor.phone ? (
								<p className="text-muted-foreground text-xs">
									📞 {String(vendor.phone)}
								</p>
							) : null}
						</div>
					)}

					{expense.notes ? (
						<div className="rounded border p-3">
							<p className="text-muted-foreground text-xs">Notas</p>
							<p className="text-sm">{String(expense.notes)}</p>
						</div>
					) : null}

					{payments.length > 0 && (
						<div>
							<h4 className="mb-2 font-medium text-sm">
								Pagamentos ({payments.length})
							</h4>
							<div className="space-y-2">
								{payments.map((payment, i) => (
									<div
										key={i}
										className="flex items-center justify-between rounded border p-2.5 text-sm"
									>
										<div>
											<p className="font-medium">
												{formatCurrency(Number(payment.amount))}
											</p>
											<p className="text-muted-foreground text-xs">
												{payment.paymentDate
													? formatDate(String(payment.paymentDate))
													: "—"}{" "}
												· {String(payment.method)}
											</p>
										</div>
										<Badge variant="outline" className="text-xs">
											{String(payment.method)}
										</Badge>
									</div>
								))}
							</div>
						</div>
					)}
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={onClose}>
						Fechar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
  )
} */
