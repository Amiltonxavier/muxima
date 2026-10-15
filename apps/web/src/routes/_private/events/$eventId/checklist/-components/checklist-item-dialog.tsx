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
import { Textarea } from "@muxima/ui/components/textarea";
import { useForm } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { dateHelper } from "@/shared/utils/date-helper";
import { CHECKLIST_STATUS_LABELS, toSelectItems } from "@/utils/status-helpers";
import { LINK_TYPE_OPTIONS } from "../-constants/checklist.constants";
import {
	type ChecklistItem,
	type ChecklistStatusValue,
	useCreateChecklistItem,
	useUpdateChecklistItem,
} from "../-queries/checklist-queries";
import type { LinkType } from "../-types/checklist.types";
import { LinkedEntitySelect } from "./linked-entity-select";

/**
 * Cria ou edita um item. Detém as mutações e os toasts (como o diálogo da meta
 * no orçamento), pelo que a página só o abre e fecha.
 */
export function ChecklistItemDialog({
	open,
	onOpenChange,
	eventId,
	editingItem,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	eventId: string;
	editingItem: ChecklistItem | null;
}) {
	const createItem = useCreateChecklistItem();
	const updateItem = useUpdateChecklistItem();
	const isPending = createItem.isPending || updateItem.isPending;

	const isEditing = editingItem !== null;

	function handleSubmit(values: {
		title: string;
		description: string;
		dueDate: string;
		status: ChecklistStatusValue;
		linkType: LinkType;
		linkId: string;
	}) {
		if (editingItem) {
			updateItem.mutate(
				{
					id: editingItem.id,
					eventId,
					title: values.title,
					description: values.description || null,
					dueDate: values.dueDate || null,
					// Estado só é enviado para itens manuais: o backend recusa
					// estado em itens auto-geridos.
					status:
						editingItem.autoManaged && values.status
							? undefined
							: values.status,
				},
				{
					onSuccess: () => {
						toast.success("Item atualizado");
						onOpenChange(false);
					},
				},
			);
			return;
		}

		createItem.mutate(
			{
				eventId,
				title: values.title,
				description: values.description || undefined,
				dueDate: values.dueDate || undefined,
				supplierId: values.linkType === "SUPPLIER" ? values.linkId : undefined,
				inventoryItemId:
					values.linkType === "INVENTORY" ? values.linkId : undefined,
			},
			{
				onSuccess: () => {
					toast.success("Item criado");
					onOpenChange(false);
				},
			},
		);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>
						{isEditing ? "Editar item" : "Novo item do checklist"}
					</DialogTitle>
					<DialogDescription>
						{editingItem?.autoManaged
							? "Este item é gerido pela API a partir do fornecedor ou do inventário. O estado não pode ser alterado manualmente."
							: "Itens manuais podem ser concluídos aqui. Itens ligados a fornecedor ou inventário passam a ser atualizados automaticamente."}
					</DialogDescription>
				</DialogHeader>

				{/*
				 * Montado só enquanto aberto para o formulário re-semear a partir do
				 * item selecionado: `defaultValues` só é lido uma vez.
				 */}
				{open && (
					<ItemForm
						eventId={eventId}
						editingItem={editingItem}
						isPending={isPending}
						onSubmit={handleSubmit}
						onCancel={() => onOpenChange(false)}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}

function ItemForm({
	eventId,
	editingItem,
	isPending,
	onSubmit,
	onCancel,
}: {
	eventId: string;
	editingItem: ChecklistItem | null;
	isPending: boolean;
	onSubmit: (values: {
		title: string;
		description: string;
		dueDate: string;
		status: ChecklistStatusValue;
		linkType: LinkType;
		linkId: string;
	}) => void;
	onCancel: () => void;
}) {
	const isEditing = editingItem !== null;
	const isAutoManaged = editingItem?.autoManaged ?? false;

	const form = useForm({
		defaultValues: {
			title: editingItem?.title ?? "",
			description: editingItem?.description ?? "",
			dueDate: editingItem?.dueDate
				? dateHelper.formatToIsoDate(editingItem.dueDate)
				: "",
			status:
				(editingItem?.status as ChecklistStatusValue | undefined) ?? "PENDING",
			linkType: (editingItem?.supplierId
				? "SUPPLIER"
				: editingItem?.inventoryItemId
					? "INVENTORY"
					: "NONE") as LinkType,
			linkId: editingItem?.supplierId ?? editingItem?.inventoryItemId ?? "",
		},
		onSubmit: async ({ value }) => {
			onSubmit({
				title: value.title,
				description: value.description,
				dueDate: value.dueDate,
				status: value.status,
				linkType: value.linkType,
				linkId: value.linkId || "",
			});
		},
	});

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				form.handleSubmit();
			}}
			className="space-y-4"
		>
			<form.Field name="title">
				{(field) => (
					<div className="space-y-2">
						<Label htmlFor="checklist-title">Título</Label>
						<Input
							id="checklist-title"
							value={field.state.value}
							onChange={(e) => field.handleChange(e.target.value)}
							placeholder="Ex.: Confirmar prova do menu"
							disabled={isPending}
							required
						/>
					</div>
				)}
			</form.Field>

			<form.Field name="description">
				{(field) => (
					<div className="space-y-2">
						<Label htmlFor="checklist-description">Descrição</Label>
						<Textarea
							id="checklist-description"
							value={field.state.value}
							onChange={(e) => field.handleChange(e.target.value)}
							placeholder="Detalhes opcionais"
							disabled={isPending}
						/>
					</div>
				)}
			</form.Field>

			<div className="grid gap-4 sm:grid-cols-2">
				<form.Field name="dueDate">
					{(field) => (
						<div className="space-y-2">
							<Label htmlFor="checklist-due-date">Data limite</Label>
							<Input
								id="checklist-due-date"
								type="date"
								value={field.state.value}
								onChange={(e) => field.handleChange(e.target.value)}
								disabled={isPending}
							/>
						</div>
					)}
				</form.Field>

				{!isAutoManaged && (
					<form.Field name="status">
						{(field) => (
							<div className="space-y-2">
								<Label>Estado</Label>
								<Select
									value={field.state.value}
									onValueChange={(v) =>
										field.handleChange(v as ChecklistStatusValue)
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Escolher..." />
									</SelectTrigger>
									<SelectContent>
										{toSelectItems(CHECKLIST_STATUS_LABELS).map((option) => (
											<SelectItem key={option.value} value={option.value}>
												{option.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}
					</form.Field>
				)}
			</div>

			{!isEditing && (
				<div className="space-y-2">
					<Label>Associação (opcional)</Label>
					<div className="grid gap-2 sm:grid-cols-2">
						<form.Field name="linkType">
							{(field) => (
								<Select
									value={field.state.value}
									onValueChange={(v) => field.handleChange(v as LinkType)}
								>
									<SelectTrigger>
										<SelectValue placeholder="Escolher..." />
									</SelectTrigger>
									<SelectContent>
										{LINK_TYPE_OPTIONS.map((option) => (
											<SelectItem key={option.value} value={option.value}>
												{option.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						</form.Field>
						<form.Field name="linkId">
							{(linkIdField) => (
								<form.Subscribe selector={(s) => s.values.linkType}>
									{(linkType) =>
										linkType !== "NONE" ? (
											<LinkedEntitySelect
												value={linkIdField.state.value}
												onChange={linkIdField.handleChange}
												eventId={eventId}
												linkType={linkType}
											/>
										) : null
									}
								</form.Subscribe>
							)}
						</form.Field>
					</div>
					<p className="text-muted-foreground text-xs">
						Um item pode estar associado a um fornecedor ou a um item de
						inventário, nunca a ambos.
					</p>
				</div>
			)}

			<DialogFooter>
				<Button type="button" variant="outline" onClick={onCancel}>
					Cancelar
				</Button>
				<Button type="submit" disabled={isPending}>
					{isPending ? (
						<>
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />A guardar...
						</>
					) : isEditing ? (
						"Guardar"
					) : (
						"Criar"
					)}
				</Button>
			</DialogFooter>
		</form>
	);
}
