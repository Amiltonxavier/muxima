import { Button } from "@muxima/ui/components/button";
import { Checkbox } from "@muxima/ui/components/checkbox";
import { Input } from "@muxima/ui/components/input";
import { Label } from "@muxima/ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@muxima/ui/components/select";
import { Textarea } from "@muxima/ui/components/textarea";
import { useForm, useStore } from "@tanstack/react-form";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CurrencyInput } from "@/shared/components/currency-input";
import { IBANInput } from "@/shared/components/iban-input";
import { PhoneInput } from "@/shared/components/phone-input";
import { PAYMENT_METHOD_LABELS } from "@/utils/status-helpers";
import {
	SUPPLIER_CATEGORY_OPTIONS,
	SUPPLIER_STATUS_OPTIONS,
} from "../-constants/suppliers.constants";
import type {
	SupplierCategoryValue,
	SupplierStatusValue,
} from "../-queries/suppliers-queries";
import { useSupplierCategorySchema } from "../-queries/suppliers-queries";
import type {
	SupplierCustomFields,
	SupplierFormInstallment,
	SupplierFormPayment,
	SupplierFormValues,
	SupplierPaymentMethod,
	SupplierSubmitValues,
} from "../-types/suppliers.types";
import { SupplierCustomField } from "./supplier-custom-field";

export const EMPTY_SUPPLIER_FORM: SupplierFormValues = {
	name: "",
	category: "OTHER",
	price: 0,
	phone: "",
	email: "",
	address: "",
	nif: "",
	iban: "",
	hasMcxExpress: false,
	mcxPhone: "",
	description: "",
	notes: "",
	status: "PROSPECT",
};

export const EMPTY_FORM_PAYMENT: SupplierFormPayment = {
	amount: 0,
	paymentDate: "",
	method: "BANK_TRANSFER",
	reference: "",
};

let installmentDraftSeq = 0;
function newInstallmentDraft(): SupplierFormInstallment {
	installmentDraftSeq += 1;
	return {
		draftId: `draft-${installmentDraftSeq}`,
		amount: "",
		dueDate: "",
	};
}

const PAYMENT_METHOD_OPTIONS = (
	[
		"CASH",
		"BANK_TRANSFER",
		"ATM",
		"CARD",
		"MOBILE_PAYMENT",
		"MULTICAIXA_EXPRESS",
		"OTHER",
	] as SupplierPaymentMethod[]
).map((value) => ({
	value,
	label: PAYMENT_METHOD_LABELS[value],
}));

/**
 * The form shared by the create and edit dialogs. Besides the fixed fields, the
 * inputs of the chosen category are rendered from the spec returned by the API,
 * so those values live outside the typed form: their names are only known at
 * runtime.
 *
 * Sections: basic data (with optional NIF), bank details (optional IBAN +
 * MULTICAIXA Express), the agreed amount, and an optional payment section —
 * a single payment or an installment plan. Money rules (agreed amount must
 * exist, totals within the agreed amount) are mirrored here only for instant
 * feedback; the API re-validates everything.
 */
export function SupplierForm({
	initialValues = EMPTY_SUPPLIER_FORM,
	initialPayment,
	initialInstallments,
	/**
	 * The status select only makes sense on creation: afterwards the state is
	 * changed through the dedicated "Mudar estado" action, whose transition
	 * rules the API enforces.
	 */
	showStatusField = true,
	submitLabel,
	pendingLabel = "A guardar...",
	isSubmitting,
	onCancel,
	onSubmit,
}: {
	initialValues?: SupplierFormValues;
	/** Seeds the payment section (edit flow). */
	initialPayment?: SupplierFormPayment | null;
	/** Seeds the installment rows (edit flow). */
	initialInstallments?: SupplierFormInstallment[];
	showStatusField?: boolean;
	submitLabel: string;
	pendingLabel?: string;
	isSubmitting: boolean;
	onCancel: () => void;
	onSubmit: (values: SupplierSubmitValues) => void;
}) {
	const categorySchemaQuery = useSupplierCategorySchema();
	const [customFields, setCustomFields] = useState<SupplierCustomFields>({});

	// Payment section (optional): toggled by the user, seeded on edit when the
	// supplier already has payments.
	const [hasPayment, setHasPayment] = useState(() => !!initialPayment);
	const [payment, setPayment] = useState<SupplierFormPayment>(
		() => initialPayment ?? { ...EMPTY_FORM_PAYMENT },
	);

	// Installment plan (optional): only meaningful with an agreed amount.
	const [hasInstallments, setHasInstallments] = useState(
		() => (initialInstallments?.length ?? 0) > 0,
	);
	const [installments, setInstallments] = useState<SupplierFormInstallment[]>(
		() =>
			initialInstallments && initialInstallments.length > 0
				? initialInstallments
				: [newInstallmentDraft()],
	);

	const form = useForm({
		defaultValues: { ...initialValues },
		onSubmit: async ({ value }) => {
			const nonEmpty = Object.fromEntries(
				Object.entries(customFields).filter(
					([, entry]) => entry !== "" && entry !== undefined,
				),
			);

			// ── Build the optional payment payload ────────────────────
			let paymentPayload: SupplierSubmitValues["payment"];
			let installmentsPayload: SupplierSubmitValues["installments"];

			if (hasPayment) {
				if (payment.amount <= 0) {
					toast.error("O montante pago tem de ser maior que zero.");
					return;
				}
				if (!payment.paymentDate) {
					toast.error("Indique a data do pagamento.");
					return;
				}
				paymentPayload = {
					amount: payment.amount,
					paymentDate: new Date(`${payment.paymentDate}T12:00:00`),
					method: payment.method,
					reference: payment.reference || undefined,
				};
			}

			if (hasInstallments) {
				const valid = installments.filter(
					(row) => Number(row.amount) > 0 && row.dueDate,
				);
				if (valid.length === 0) {
					toast.error(
						"Adicione pelo menos uma parcela com montante e data, ou desligue o parcelamento.",
					);
					return;
				}
				installmentsPayload = valid.map((row) => ({
					amount: Number(row.amount),
					dueDate: new Date(`${row.dueDate}T12:00:00`),
				}));
			}

			onSubmit({
				...value,
				price: value.price || undefined,
				phone: value.phone || undefined,
				email: value.email || undefined,
				address: value.address || undefined,
				nif: value.nif || undefined,
				iban: value.iban || undefined,
				hasMcxExpress: value.hasMcxExpress,
				mcxPhone: value.hasMcxExpress ? value.mcxPhone || undefined : undefined,
				description: value.description || undefined,
				notes: value.notes || undefined,
				// The create endpoint accepts the initial status; the update one
				// strips it — status changes go through `changeStatus`.
				status: value.status,
				payment: paymentPayload,
				installments: installmentsPayload,
				customFields: Object.keys(nonEmpty).length > 0 ? nonEmpty : undefined,
			});
		},
	});

	const category = useStore(form.store, (state) => state.values.category);
	const agreed = useStore(form.store, (state) => state.values.price) || 0;

	const installmentTotal = installments.reduce(
		(sum, row) => sum + (Number(row.amount) || 0),
		0,
	);
	const installmentsExceedAgreed = agreed > 0 && installmentTotal > agreed;
	const paymentExceedsAgreed =
		agreed > 0 && hasPayment && payment.amount > agreed;

	const spec = categorySchemaQuery.data?.categories.find(
		(item) => item.category === category,
	);

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				form.handleSubmit();
			}}
			className="space-y-6"
		>
			{/* ── Dados básicos ─────────────────────────────────────── */}
			<section className="space-y-4">
				<form.Field name="name">
					{(field) => (
						<div className="space-y-2">
							<Label htmlFor="supplier-name">Nome</Label>
							<Input
								id="supplier-name"
								value={field.state.value}
								onChange={(e) => field.handleChange(e.target.value)}
								disabled={isSubmitting}
							/>
						</div>
					)}
				</form.Field>

				<div className="grid grid-cols-2 gap-4">
					<form.Field name="category">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor="supplier-category">Categoria</Label>
								<Select
									items={SUPPLIER_CATEGORY_OPTIONS}
									value={field.state.value}
									onValueChange={(v) =>
										field.handleChange(v as SupplierCategoryValue)
									}
								>
									<SelectTrigger id="supplier-category">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{SUPPLIER_CATEGORY_OPTIONS.map((item) => (
											<SelectItem key={item.value} value={item.value}>
												{item.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}
					</form.Field>
					{showStatusField && (
						<form.Field name="status">
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor="supplier-status">Estado</Label>
									<Select
										items={SUPPLIER_STATUS_OPTIONS}
										value={field.state.value}
										onValueChange={(v) =>
											field.handleChange(v as SupplierStatusValue)
										}
									>
										<SelectTrigger id="supplier-status">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{SUPPLIER_STATUS_OPTIONS.map((item) => (
												<SelectItem key={item.value} value={item.value}>
													{item.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							)}
						</form.Field>
					)}
				</div>

				<div className="grid grid-cols-2 gap-4">
					<form.Field name="phone">
						{(field) => (
							<PhoneInput
								id="supplier-phone"
								label="Telefone"
								value={field.state.value}
								onChange={(v) => field.handleChange(v)}
								disabled={isSubmitting}
							/>
						)}
					</form.Field>
					<form.Field name="email">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor="supplier-email">Email</Label>
								<Input
									id="supplier-email"
									type="email"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									disabled={isSubmitting}
								/>
							</div>
						)}
					</form.Field>
				</div>

				<form.Field name="address">
					{(field) => (
						<div className="space-y-2">
							<Label htmlFor="supplier-address">Morada</Label>
							<Input
								id="supplier-address"
								value={field.state.value}
								onChange={(e) => field.handleChange(e.target.value)}
								disabled={isSubmitting}
							/>
						</div>
					)}
				</form.Field>

				<form.Field name="nif">
					{(field) => (
						<div className="space-y-2">
							<Label htmlFor="supplier-nif">NIF (opcional)</Label>
							<Input
								id="supplier-nif"
								value={field.state.value}
								onChange={(e) =>
									field.handleChange(e.target.value.toUpperCase())
								}
								disabled={isSubmitting}
								placeholder="Ex.: 541709150"
							/>
						</div>
					)}
				</form.Field>
			</section>

			{/* ── Dados bancários (opcionais) ───────────────────────── */}
			<section className="space-y-4 rounded-md border p-4">
				<p className="font-medium text-sm">Dados bancários (opcionais)</p>

				<form.Field name="iban">
					{(field) => (
						<IBANInput
							id="supplier-iban"
							value={field.state.value}
							onChange={(v) => field.handleChange(v)}
							disabled={isSubmitting}
						/>
					)}
				</form.Field>

				<form.Field name="hasMcxExpress">
					{(field) => (
						<div className="space-y-2">
							<label className="flex items-center gap-3 text-sm">
								<Checkbox
									checked={field.state.value}
									onCheckedChange={(checked) =>
										field.handleChange(checked === true)
									}
									disabled={isSubmitting}
									aria-label="Possui MULTICAIXA Express"
								/>
								Possui MULTICAIXA Express?
							</label>
							<p className="text-muted-foreground text-xs">
								A MULTICAIXA Express é uma aplicação móvel interbancária em
								Angola que permite utilizar os cartões MULTICAIXA no telemóvel
								para pagamentos, transferências e consultas.
							</p>
						</div>
					)}
				</form.Field>

				<form.Subscribe selector={(s) => s.values.hasMcxExpress}>
					{(hasMcx) =>
						hasMcx && (
							<form.Field name="mcxPhone">
								{(field) => (
									<PhoneInput
										id="supplier-mcx-phone"
										label="Telefone associado ao MULTICAIXA Express"
										value={field.state.value}
										onChange={(v) => field.handleChange(v)}
										disabled={isSubmitting}
									/>
								)}
							</form.Field>
						)
					}
				</form.Subscribe>
			</section>

			{/* ── Montante acordado ─────────────────────────────────── */}
			<section className="space-y-4">
				<form.Field name="price">
					{(field) => (
						<div className="space-y-2">
							<Label htmlFor="supplier-price">Montante acordado (Kz)</Label>
							<CurrencyInput
								id="supplier-price"
								value={field.state.value || 0}
								onChange={(v) => field.handleChange(v)}
								disabled={isSubmitting}
							/>
							<p className="text-muted-foreground text-xs">
								Deixe a zero enquanto o montante não estiver fechado. O
								pagamento e as parcelas precisam de um montante acordado.
							</p>
						</div>
					)}
				</form.Field>
			</section>

			{!!spec?.fields.length && (
				<fieldset className="space-y-3 rounded border p-4">
					<legend className="px-1 font-medium text-sm">
						Dados de {spec.label}
					</legend>
					{spec.fields.map((field) => (
						<SupplierCustomField
							key={field.name}
							field={field}
							value={customFields[field.name]}
							onChange={(value: unknown) =>
								setCustomFields((current) => ({
									...current,
									[field.name]: value,
								}))
							}
							disabled={isSubmitting}
						/>
					))}
				</fieldset>
			)}

			{/* ── Pagamento (opcional) ──────────────────────────────── */}
			<section className="space-y-4 rounded-md border p-4">
				<label className="flex items-center gap-3 font-medium text-sm">
					<Checkbox
						checked={hasPayment}
						onCheckedChange={(checked) => setHasPayment(checked === true)}
						disabled={isSubmitting}
						aria-label="Registar um pagamento neste formulário"
					/>
					Pagamento (opcional)
				</label>

				{agreed <= 0 && hasPayment && (
					<p className="text-amber-700 text-xs">
						Defina primeiro o montante acordado para poder registar um
						pagamento.
					</p>
				)}

				{hasPayment && (
					<div className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="supplier-payment-amount">
									Montante pago (Kz)
								</Label>
								<CurrencyInput
									id="supplier-payment-amount"
									value={payment.amount || 0}
									onChange={(v) =>
										setPayment((current) => ({ ...current, amount: v }))
									}
									disabled={isSubmitting}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="supplier-payment-date">Data</Label>
								<Input
									id="supplier-payment-date"
									type="date"
									value={payment.paymentDate}
									onChange={(e) =>
										setPayment((current) => ({
											...current,
											paymentDate: e.target.value,
										}))
									}
									disabled={isSubmitting}
								/>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="supplier-payment-method">Método</Label>
								<Select
									items={PAYMENT_METHOD_OPTIONS}
									value={payment.method}
									onValueChange={(v) =>
										setPayment((current) => ({
											...current,
											method: v as SupplierPaymentMethod,
										}))
									}
								>
									<SelectTrigger id="supplier-payment-method">
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
							<div className="space-y-2">
								<Label htmlFor="supplier-payment-reference">
									Referência (opcional)
								</Label>
								<Input
									id="supplier-payment-reference"
									value={payment.reference}
									onChange={(e) =>
										setPayment((current) => ({
											...current,
											reference: e.target.value,
										}))
									}
									disabled={isSubmitting}
								/>
							</div>
						</div>
						{paymentExceedsAgreed && (
							<p className="text-destructive text-xs" role="alert">
								O montante pago não pode ultrapassar o montante acordado (
								{new Intl.NumberFormat("pt-AO").format(agreed)} Kz).
							</p>
						)}
					</div>
				)}
			</section>

			{/* ── Parcelamento (opcional) ───────────────────────────── */}
			<section className="space-y-4 rounded-md border p-4">
				<label className="flex items-center gap-3 font-medium text-sm">
					<Checkbox
						checked={hasInstallments}
						onCheckedChange={(checked) => setHasInstallments(checked === true)}
						disabled={isSubmitting}
						aria-label="Configurar parcelamento"
					/>
					Parcelamento (opcional)
				</label>

				{hasInstallments && (
					<>
						{agreed <= 0 && (
							<p className="text-amber-700 text-xs">
								Defina primeiro o montante acordado para poder planear parcelas.
							</p>
						)}

						<ul className="space-y-3">
							{installments.map((row, index) => (
								<li
									key={row.draftId}
									className="grid grid-cols-[1fr_9rem_auto] items-end gap-2"
								>
									<div className="space-y-1">
										<Label htmlFor={`supplier-installment-amount-${index}`}>
											Montante (Kz)
										</Label>
										<Input
											id={`supplier-installment-amount-${index}`}
											type="number"
											min={0}
											step={1000}
											value={row.amount}
											onChange={(e) =>
												setInstallments((current) =>
													current.map((item, i) =>
														i === index
															? { ...item, amount: e.target.value }
															: item,
													),
												)
											}
											disabled={isSubmitting}
										/>
									</div>
									<div className="space-y-1">
										<Label htmlFor={`supplier-installment-due-${index}`}>
											Vence
										</Label>
										<Input
											id={`supplier-installment-due-${index}`}
											type="date"
											value={row.dueDate}
											onChange={(e) =>
												setInstallments((current) =>
													current.map((item, i) =>
														i === index
															? { ...item, dueDate: e.target.value }
															: item,
													),
												)
											}
											disabled={isSubmitting}
										/>
									</div>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="text-destructive"
										title="Remover parcela"
										disabled={isSubmitting || installments.length === 1}
										onClick={() =>
											setInstallments((current) =>
												current.filter((_, i) => i !== index),
											)
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
									setInstallments((current) => [
										...current,
										newInstallmentDraft(),
									])
								}
								disabled={isSubmitting}
							>
								<Plus className="mr-2 h-3.5 w-3.5" />
								Adicionar parcela
							</Button>
							<span
								className={
									installmentsExceedAgreed
										? "font-medium text-destructive"
										: undefined
								}
							>
								Total: {new Intl.NumberFormat("pt-AO").format(installmentTotal)}{" "}
								Kz
							</span>
						</div>
						{installmentsExceedAgreed && (
							<p className="text-destructive text-xs" role="alert">
								A soma das parcelas não pode ultrapassar o montante acordado.
							</p>
						)}
					</>
				)}
			</section>

			{/* ── Notas ─────────────────────────────────────────────── */}
			<form.Field name="notes">
				{(field) => (
					<div className="space-y-2">
						<Label htmlFor="supplier-notes">Notas</Label>
						<Textarea
							id="supplier-notes"
							value={field.state.value}
							onChange={(e) => field.handleChange(e.target.value)}
							disabled={isSubmitting}
						/>
					</div>
				)}
			</form.Field>

			<div className="flex justify-end gap-2">
				<Button type="button" variant="outline" onClick={onCancel}>
					Cancelar
				</Button>
				<Button
					type="submit"
					disabled={isSubmitting || installmentsExceedAgreed}
				>
					{isSubmitting ? pendingLabel : submitLabel}
				</Button>
			</div>
		</form>
	);
}
