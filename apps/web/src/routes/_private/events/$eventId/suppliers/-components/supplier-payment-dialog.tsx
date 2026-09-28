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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@muxima/ui/components/select";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { CurrencyInput } from "@/shared/components/currency-input";
import { dateHelper } from "@/shared/utils/date-helper";
import { formatCurrency } from "@/utils/format-currency";
import { PAYMENT_METHOD_LABELS, toSelectItems } from "@/utils/status-helpers";
import { useAddSupplierPayment } from "../-queries/suppliers-queries";
import type {
	SupplierPaymentMethod,
	SupplierPaymentValues,
} from "../-types/suppliers.types";

const PAYMENT_METHOD_OPTIONS = toSelectItems(PAYMENT_METHOD_LABELS);

export function SupplierPaymentDialog({
	open,
	onOpenChange,
	supplierId,
	remaining,
	agreed,
	status = "CONFIRMED",
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	supplierId: string;
	/** Montante ainda em falta (agreed - paid), resolvido pela API. */
	remaining: number;
	/** Montante acordado; 0 quando ainda não foi definido. */
	agreed: number;
	/** Estado do fornecedor; a API revalida. Default: CONFIRMED. */
	status?: string;
}) {
	const addPayment = useAddSupplierPayment();

	// Espelho das regras da API: fornecedor confirmado + montante acordado.
	// O botão desabilitado é conveniência; o backend é a autoridade.
	const blockedByStatus = status !== "CONFIRMED";
	const blockedByAmount = !(agreed > 0);
	const blocked = blockedByStatus || blockedByAmount || remaining <= 0;

	const form = useForm({
		defaultValues: {
			amount: 0,
			paymentDate: dateHelper.formatToIsoDate(dateHelper.now()),
			method: "BANK_TRANSFER" as SupplierPaymentMethod,
			reference: "",
		},
		onSubmit: async ({ value }) => {
			if (value.amount <= 0) {
				toast.error("O montante pago tem de ser maior que zero");
				return;
			}
			// `parseISO` keeps the `yyyy-MM-dd` input on the local day the user
			// picked, instead of shifting it to UTC like `new Date(string)` does.
			const paymentDate = dateHelper.getDate(value.paymentDate);
			if (!paymentDate) {
				toast.error("Data de pagamento inválida");
				return;
			}
			const values: SupplierPaymentValues = {
				supplierId,
				amount: value.amount,
				paymentDate,
				method: value.method,
				reference: value.reference || undefined,
			};
			addPayment.mutate(values, {
				onSuccess: () => {
					toast.success("Pagamento registado");
					onOpenChange(false);
				},
				onError: (error) => toast.error(error.message),
			});
		},
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Registar pagamento</DialogTitle>
					<DialogDescription>
						{remaining > 0
							? `Montante em falta: ${formatCurrency(remaining)}`
							: "Não há montante em falta."}
					</DialogDescription>
				</DialogHeader>
				{blockedByStatus && (
					<p className="text-amber-700 text-xs">
						Só é possível registar pagamentos num fornecedor confirmado. Mude o
						estado do fornecedor primeiro.
					</p>
				)}
				{blockedByAmount && (
					<p className="text-amber-700 text-xs">
						Defina primeiro o montante acordado do fornecedor.
					</p>
				)}
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-4"
				>
					<form.Field name="amount">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor="payment-amount">Montante pago (Kz)</Label>
								<CurrencyInput
									id="payment-amount"
									value={field.state.value || 0}
									onChange={(v) => field.handleChange(v)}
									disabled={addPayment.isPending}
								/>
							</div>
						)}
					</form.Field>
					<div className="grid grid-cols-2 gap-4">
						<form.Field name="paymentDate">
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor="payment-date">Data</Label>
									<Input
										id="payment-date"
										type="date"
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										disabled={addPayment.isPending}
									/>
								</div>
							)}
						</form.Field>
						<form.Field name="method">
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor="payment-method">Método</Label>
									<Select
										items={PAYMENT_METHOD_OPTIONS}
										value={field.state.value}
										onValueChange={(v) =>
											field.handleChange(v as SupplierPaymentMethod)
										}
									>
										<SelectTrigger id="payment-method">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{PAYMENT_METHOD_OPTIONS.map((item) => (
												<SelectItem key={item.value} value={item.value}>
													{item.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							)}
						</form.Field>
					</div>
					<form.Field name="reference">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor="payment-reference">Referência</Label>
								<Input
									id="payment-reference"
									placeholder="Opcional"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									disabled={addPayment.isPending}
								/>
							</div>
						)}
					</form.Field>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancelar
						</Button>
						<Button type="submit" disabled={blocked || addPayment.isPending}>
							{addPayment.isPending ? "A guardar..." : "Registar"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
