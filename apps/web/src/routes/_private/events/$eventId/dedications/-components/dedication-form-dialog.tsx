import type {
	DedicationStatus,
	DedicationType,
	RichTextNode,
} from "@muxima/api/shared/types/entities";
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
import { Save } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { RichTextEditor } from "@/shared/components/rich-text-editor";
import {
	useCreateDedication,
	useUpdateDedication,
} from "@/shared/queries/dedication-queries";
import {
	type DedicationDraft,
	draftKey,
	useDedicationDrafts,
} from "@/utils/dedication-drafts";
import { EMPTY_RICH_TEXT, isRichTextEmpty } from "@/utils/rich-text";
import {
	DEDICATION_STATUS_LABELS,
	DEDICATION_TYPE_LABELS,
	getStatusColor,
	toSelectItems,
} from "@/utils/status-helpers";
import { DRAFT_AUTOSAVE_DEBOUNCE_MS } from "../-constants/dedication.constants";
import type { DedicationFormValues } from "../-types/dedication.types";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	eventId: string;
	/** Present when editing. */
	dedicationId?: string;
	initialValues?: DedicationFormValues;
	/** `updatedAt` of the row being edited; guards local drafts. */
	baseUpdatedAt?: string | null;
	onSaved?: () => void;
};

export function DedicationFormDialog({
	open,
	onOpenChange,
	eventId,
	dedicationId,
	initialValues,
	baseUpdatedAt = null,
	onSaved,
}: Props) {
	const isEditing = !!dedicationId;
	const createDedication = useCreateDedication();
	const updateDedication = useUpdateDedication();
	const isPending = isEditing
		? updateDedication.isPending
		: createDedication.isPending;

	const saveDraft = useDedicationDrafts((state) => state.saveDraft);
	const discardDraft = useDedicationDrafts((state) => state.discardDraft);
	const reconcileDraft = useDedicationDrafts((state) => state.reconcileDraft);
	const hydrateDrafts = useDedicationDrafts((state) => state.hydrate);

	const key = draftKey(dedicationId ?? null, eventId);

	const [content, setContent] = useState<RichTextNode>(
		initialValues?.content ?? EMPTY_RICH_TEXT,
	);
	const [pendingDraft, setPendingDraft] = useState<DedicationDraft | null>(
		null,
	);
	const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	const form = useForm({
		defaultValues: {
			title: initialValues?.title ?? "",
			type: (initialValues?.type ?? "WEDDING_VOW") as DedicationType,
			status: (initialValues?.status ?? "NOT_STARTED") as DedicationStatus,
		},
		onSubmit: async ({ value }) => {
			try {
				// The backend rejects an empty payload, so never send a no-op save.
				if (isEditing && dedicationId) {
					const unchanged =
						value.title.trim() === (initialValues?.title ?? "").trim() &&
						value.type === initialValues?.type &&
						value.status === initialValues?.status &&
						JSON.stringify(content) ===
							JSON.stringify(initialValues?.content ?? EMPTY_RICH_TEXT);
					if (unchanged) {
						toast.info("Não há alterações para guardar");
						return;
					}

					await updateDedication.mutateAsync({
						eventId,
						dedicationId,
						title: value.title.trim(),
						type: value.type,
						status: value.status,
						content,
					});
				} else {
					await createDedication.mutateAsync({
						eventId,
						title: value.title.trim(),
						type: value.type,
						status: value.status,
						content,
						// New dedications are always born private and locked; sharing
						// is a deliberate second step.
						visibility: "PRIVATE",
						viewerEventMemberIds: [],
					});
				}

				discardDraft(key);
				setPendingDraft(null);
				toast.success(
					isEditing ? "Dedicatória actualizada" : "Dedicatória criada",
				);
				onSaved?.();
				onOpenChange(false);
			} catch (error) {
				toast.error(
					error instanceof Error
						? error.message
						: "Não foi possível guardar a dedicatória",
				);
			}
		},
	});

	// `initialValues` is rebuilt by the parent on every render, so it is read
	// through a ref: depending on it would reset the editor mid-typing.
	const initialValuesRef = useRef(initialValues);
	initialValuesRef.current = initialValues;

	// Recoverable drafts are resolved on open, never during render, because
	// reconciling can discard a stale draft.
	useEffect(() => {
		if (!open) {
			setPendingDraft(null);
			return;
		}
		hydrateDrafts();
		setContent(initialValuesRef.current?.content ?? EMPTY_RICH_TEXT);
		setPendingDraft(
			reconcileDraft(key, isEditing ? (baseUpdatedAt ?? null) : null),
		);
	}, [open, key, isEditing, baseUpdatedAt, hydrateDrafts, reconcileDraft]);

	useEffect(() => {
		return () => {
			if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
		};
	}, []);

	const storeDraftIfNeeded = () => {
		const title = form.state.values.title.trim();
		if (!title && isRichTextEmpty(content)) return false;

		saveDraft(key, {
			dedicationId: dedicationId ?? null,
			title,
			type: form.state.values.type,
			status: form.state.values.status,
			content,
			visibility: "PRIVATE",
			viewerEventMemberIds: [],
			baseUpdatedAt: isEditing ? (baseUpdatedAt ?? null) : null,
			savedAt: new Date().toISOString(),
		});
		return true;
	};

	const scheduleAutosave = () => {
		if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
		autosaveTimer.current = setTimeout(
			storeDraftIfNeeded,
			DRAFT_AUTOSAVE_DEBOUNCE_MS,
		);
	};

	const restoreDraft = (draft: DedicationDraft) => {
		setContent((draft.content as RichTextNode) ?? EMPTY_RICH_TEXT);
		form.setFieldValue("title", draft.title);
		form.setFieldValue("type", draft.type);
		form.setFieldValue("status", draft.status);
		setPendingDraft(null);
		toast.success("Rascunho restaurado");
	};

	const handleOpenChange = (next: boolean) => {
		if (!next && autosaveTimer.current) {
			clearTimeout(autosaveTimer.current);
			autosaveTimer.current = null;
			if (storeDraftIfNeeded()) {
				toast.info("Rascunho guardado localmente");
			}
		}
		onOpenChange(next);
	};

	// The backend locks the type once the dedication is no longer in the
	// initial state, so the control is disabled to match.
	const typeLocked = isEditing && initialValues?.status !== "NOT_STARTED";

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="max-w-4xl">
				<DialogHeader>
					<DialogTitle>
						{isEditing ? "Editar dedicatória" : "Nova dedicatória"}
					</DialogTitle>
					<DialogDescription>
						{isEditing
							? "As alterações ficam visíveis para quem tem acesso a esta dedicatória."
							: "Comece por escrever. Pode partilhar o resultado mais tarde."}
					</DialogDescription>
				</DialogHeader>

				{pendingDraft ? (
					<div className="flex items-center justify-between gap-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900 text-sm">
						<span>Existe um rascunho local por guardar.</span>
						<div className="flex shrink-0 gap-2">
							<Button
								type="button"
								size="sm"
								variant="outline"
								onClick={() => restoreDraft(pendingDraft)}
							>
								Restaurar
							</Button>
							<Button
								type="button"
								size="sm"
								variant="ghost"
								onClick={() => {
									discardDraft(key);
									setPendingDraft(null);
								}}
							>
								Descartar
							</Button>
						</div>
					</div>
				) : null}

				{/*
				 * The overlay is taller than the viewport on long documents, so
				 * the form scrolls independently and keeps its footer reachable.
				 */}
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="max-h-[70vh] space-y-4 overflow-y-auto pr-1"
				>
					<form.Field name="title">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor="dedication-title">Título</Label>
								<Input
									id="dedication-title"
									value={field.state.value}
									onChange={(e) => {
										field.handleChange(e.target.value);
										scheduleAutosave();
									}}
									onBlur={storeDraftIfNeeded}
									disabled={isPending}
									placeholder="Votos da cerimónia"
								/>
							</div>
						)}
					</form.Field>

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<form.Field name="type">
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor="dedication-type">Tipo</Label>
									<Select
										items={toSelectItems(DEDICATION_TYPE_LABELS)}
										value={field.state.value}
										onValueChange={(v) => {
											if (!v) return;
											field.handleChange(v as DedicationType);
											scheduleAutosave();
										}}
										disabled={typeLocked || isPending}
									>
										<SelectTrigger id="dedication-type">
											<SelectValue placeholder="Seleccione um tipo" />
										</SelectTrigger>
										<SelectContent>
											{Object.entries(DEDICATION_TYPE_LABELS).map(
												([typeValue, label]) => (
													<SelectItem key={typeValue} value={typeValue}>
														{label}
													</SelectItem>
												),
											)}
										</SelectContent>
									</Select>
									{typeLocked ? (
										<p className="text-muted-foreground text-xs">
											O tipo deixa de poder ser alterado depois de começar a
											escrever.
										</p>
									) : null}
								</div>
							)}
						</form.Field>

						<form.Field name="status">
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor="dedication-status">Estado</Label>
									<Select
										items={toSelectItems(DEDICATION_STATUS_LABELS)}
										value={field.state.value}
										onValueChange={(v) => {
											if (!v) return;
											field.handleChange(v as DedicationStatus);
											scheduleAutosave();
										}}
										disabled={isPending}
									>
										<SelectTrigger id="dedication-status">
											<SelectValue placeholder="Estado" />
										</SelectTrigger>
										<SelectContent>
											{Object.entries(DEDICATION_STATUS_LABELS).map(
												([statusValue, label]) => (
													<SelectItem key={statusValue} value={statusValue}>
														{label}
													</SelectItem>
												),
											)}
										</SelectContent>
									</Select>
								</div>
							)}
						</form.Field>
					</div>

					<div className="space-y-2">
						<RichTextEditor
							value={content}
							onChange={(doc) => {
								setContent(doc);
								scheduleAutosave();
							}}
							disabled={isPending}
						/>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => handleOpenChange(false)}
							disabled={isPending}
						>
							Cancelar
						</Button>
						<Button type="submit" disabled={isPending}>
							<Save className="mr-2 h-4 w-4" />
							{isPending
								? "A guardar..."
								: isEditing
									? "Guardar alterações"
									: "Criar dedicatória"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
