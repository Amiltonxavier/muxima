import { Button } from "@muxima/ui/components/button";
import { Globe, Loader2, MailPlus, X } from "lucide-react";
import { toast } from "sonner";
import {
	useCreateInvitation,
	usePublishInvitationsBatch,
} from "../-queries/invitation-queries";
import type { BulkPublishSummary } from "../-types/invitation.types";
import { reportBulkPublishResult } from "./invitation/invitations-bulk-toolbar";

/**
 * Contextual toolbar shown while guests are selected.
 *
 * Shows the two things a bulk action can do with a selection:
 *   • create one invitation for the guests that still have none
 *   • publish the invitations of the selected guests that are not published yet
 *
 * Both are single backend calls — no per-guest request loops.
 */
export function GuestsBulkToolbar({
	eventId,
	selectedCount,
	invitationIdsToPublish,
	guestIdsWithoutInvitation,
	onClearSelection,
}: {
	eventId: string;
	selectedCount: number;
	invitationIdsToPublish: string[];
	guestIdsWithoutInvitation: string[];
	onClearSelection: () => void;
}) {
	const createInvitation = useCreateInvitation();
	const publishBatch = usePublishInvitationsBatch();

	if (selectedCount === 0) return null;

	const canPublish = invitationIdsToPublish.length > 0;
	const canCreate = guestIdsWithoutInvitation.length > 0;
	const isBusy = createInvitation.isPending || publishBatch.isPending;

	const handleCreate = () => {
		createInvitation.mutate(
			{ eventId, guestIds: guestIdsWithoutInvitation },
			{
				onSuccess: () => {
					toast.success(
						`Convites criados para ${guestIdsWithoutInvitation.length} convidado(s).`,
					);
					onClearSelection();
				},
				onError: (e: Error) => toast.error(e.message),
			},
		);
	};

	const handlePublish = () => {
		if (!canPublish) return;

		publishBatch.mutate(
			{ eventId, invitationIds: invitationIdsToPublish, scope: "SELECTED" },
			{
				onSuccess: (summary: BulkPublishSummary) => {
					reportBulkPublishResult(summary);
					if (summary.published > 0) onClearSelection();
				},
				onError: (e: Error) =>
					toast.error(e.message || "Não foi possível publicar os convites"),
			},
		);
	};

	return (
		<div
			className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/50 px-3 py-2"
			data-testid="guests-bulk-toolbar"
		>
			<div className="flex items-center gap-2 text-sm">
				<span className="font-medium">
					{selectedCount} selecionado{selectedCount === 1 ? "" : "s"}
				</span>
				<Button
					variant="ghost"
					size="icon-sm"
					title="Limpar seleção"
					onClick={onClearSelection}
				>
					<X className="h-3.5 w-3.5" />
				</Button>
			</div>

			<div className="flex flex-wrap gap-2">
				{canCreate && (
					<Button
						variant="outline"
						size="sm"
						disabled={isBusy}
						onClick={handleCreate}
					>
						{createInvitation.isPending ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : (
							<MailPlus className="mr-2 h-4 w-4" />
						)}
						Criar convites ({guestIdsWithoutInvitation.length})
					</Button>
				)}

				<Button
					size="sm"
					disabled={!canPublish || isBusy}
					title={
						canPublish
							? undefined
							: "Os convidados selecionados já têm convites publicados"
					}
					onClick={handlePublish}
				>
					{publishBatch.isPending ? (
						<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					) : (
						<Globe className="mr-2 h-4 w-4" />
					)}
					{publishBatch.isPending
						? "A publicar..."
						: `Publicar convites (${invitationIdsToPublish.length})`}
				</Button>
			</div>
		</div>
	);
}
