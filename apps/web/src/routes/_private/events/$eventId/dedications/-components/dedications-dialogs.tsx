import type { DedicationListItem } from "@muxima/api/shared/types/entities";
import { Button } from "@muxima/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@muxima/ui/components/dialog";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { LoadingState } from "@/shared/components/states/loading-state";
import {
	useDedication,
	useDeleteDedication,
} from "@/shared/queries/dedication-queries";
import type {
	DedicationDialogState,
	ViewerMember,
} from "../-types/dedication.types";
import { DedicationDetailDialog } from "./dedication-detail-dialog";
import { DedicationFormDialog } from "./dedication-form-dialog";
import { DedicationVisibilityDialog } from "./dedication-visibility-dialog";

type Props = {
	eventId: string;
	dialog: DedicationDialogState;
	/** The list row backing the open dialog, when it is still loaded. */
	activeItem?: DedicationListItem;
	currentViewers: ViewerMember[];
	selectableMembers: ViewerMember[];
	isViewersLoading: boolean;
	onClose: () => void;
	onSaved: () => void;
};

/**
 * Renders whichever overlay the page state asks for. Only the open dialog
 * mounts, which is what keeps the side-effecting `get` out of the list.
 */
export function DedicationsDialogs({
	eventId,
	dialog,
	activeItem,
	currentViewers,
	selectableMembers,
	isViewersLoading,
	onClose,
	onSaved,
}: Props) {
	const deleteDedication = useDeleteDedication();
	// Only the view/edit overlays need the full document, and `get` has a
	// side effect, so the id is passed only while one of them is open.
	const detailId =
		dialog.kind === "view" || dialog.kind === "edit" ? dialog.id : null;
	const detailQuery = useDedication(eventId, detailId);

	const handleDelete = async (id: string) => {
		try {
			await deleteDedication.mutateAsync({ eventId, dedicationId: id });
			toast.success("Dedicatória eliminada");
			onClose();
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Não foi possível eliminar",
			);
		}
	};

	return (
		<>
			{/* ── Create ─────────────────────────────────────────────── */}
			<DedicationFormDialog
				open={dialog.kind === "create"}
				onOpenChange={(open) => {
					if (!open) onClose();
				}}
				eventId={eventId}
				onSaved={onSaved}
			/>

			{/* ── Edit ─────────────────────────────────────────────────
				The form only mounts once the real document has been fetched, so
				an edit can never be submitted against an empty placeholder. */}
			{dialog.kind === "edit" ? (
				detailQuery.isLoading ? (
					<LoadingState />
				) : detailQuery.data ? (
					<DedicationFormDialog
						open
						onOpenChange={(open) => {
							if (!open) onClose();
						}}
						eventId={eventId}
						dedicationId={detailQuery.data.id}
						initialValues={{
							title: detailQuery.data.title,
							type: detailQuery.data.type,
							status: detailQuery.data.status,
							content: detailQuery.data.content,
						}}
						baseUpdatedAt={String(detailQuery.data.updatedAt)}
						onSaved={onSaved}
					/>
				) : null
			) : null}

			{/* ── View + history ─────────────────────────────────────── */}
			{dialog.kind === "view" ? (
				<DedicationDetailDialog
					open
					onOpenChange={(open) => {
						if (!open) onClose();
					}}
					eventId={eventId}
					dedicationId={dialog.id}
					fallbackTitle={activeItem?.title ?? "Dedicatória"}
				/>
			) : null}

			{/* ── Sharing ────────────────────────────────────────────── */}
			{dialog.kind === "visibility" && activeItem ? (
				<DedicationVisibilityDialog
					open
					onOpenChange={(open) => {
						if (!open) onClose();
					}}
					eventId={eventId}
					dedicationId={activeItem.id}
					dedicationTitle={activeItem.title}
					isLocked={activeItem.isLocked}
					currentViewers={currentViewers}
					selectableMembers={selectableMembers}
					isLoading={isViewersLoading}
				/>
			) : null}

			{/* ── Delete ─────────────────────────────────────────────── */}
			<Dialog
				open={dialog.kind === "delete"}
				onOpenChange={(open) => {
					if (!open) onClose();
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							Eliminar “{activeItem?.title ?? "dedicatória"}”
						</DialogTitle>
					</DialogHeader>
					<p className="text-muted-foreground text-sm">
						Esta acção elimina o texto e o histórico. Não pode ser anulada.
					</p>
					<DialogFooter>
						<Button variant="outline" onClick={onClose}>
							Cancelar
						</Button>
						<Button
							variant="destructive"
							disabled={deleteDedication.isPending}
							onClick={() => {
								if (dialog.kind === "delete") handleDelete(dialog.id);
							}}
						>
							<Trash2 className="mr-2 h-4 w-4" />
							{deleteDedication.isPending ? "A eliminar..." : "Eliminar"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
