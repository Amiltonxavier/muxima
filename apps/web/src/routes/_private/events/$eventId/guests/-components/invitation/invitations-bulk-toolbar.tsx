import { Button } from "@muxima/ui/components/button";
import { AlertTriangle, Globe, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { usePublishInvitationsBatch } from "../../-queries/invitation-queries";
import type { BulkPublishSummary } from "../../-types/invitation.types";

/**
 * Contextual toolbar shown while invitations are selected.
 *
 * The whole batch is sent as ONE `publishBatch` request — there is no loop over
 * per-invitation calls. The backend answers with a per-invitation verdict and
 * this component surfaces partial failures instead of hiding them.
 */
export function InvitationsBulkToolbar({
	eventId,
	selectedIds,
	publishableIds,
	onClearSelection,
}: {
	eventId: string;
	selectedIds: string[];
	/** Subset of `selectedIds` that the UI believes can be published. */
	publishableIds: string[];
	onClearSelection: () => void;
}) {
	const publishBatch = usePublishInvitationsBatch();

	const handlePublish = () => {
		if (publishableIds.length === 0) return;

		publishBatch.mutate(
			{ eventId, invitationIds: publishableIds, scope: "SELECTED" },
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

	if (selectedIds.length === 0) return null;

	const notPublishable = selectedIds.length - publishableIds.length;

	return (
		<div
			className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/50 px-3 py-2"
			data-testid="invitations-bulk-toolbar"
		>
			<div className="flex items-center gap-2 text-sm">
				<span className="font-medium">{selectedIds.length} selecionados</span>
				<Button
					variant="ghost"
					size="icon-sm"
					title="Limpar seleção"
					onClick={onClearSelection}
				>
					<X className="h-3.5 w-3.5" />
				</Button>
				{notPublishable > 0 && (
					<span className="flex items-center gap-1 text-muted-foreground text-xs">
						<AlertTriangle className="h-3 w-3" />
						{notPublishable} já publicado(s) ou indisponível(is)
					</span>
				)}
			</div>

			<Button
				size="sm"
				disabled={publishableIds.length === 0 || publishBatch.isPending}
				onClick={handlePublish}
			>
				{publishBatch.isPending ? (
					<Loader2 className="mr-2 h-4 w-4 animate-spin" />
				) : (
					<Globe className="mr-2 h-4 w-4" />
				)}
				{publishBatch.isPending
					? "A publicar..."
					: `Publicar ${publishableIds.length} convite(s)`}
			</Button>
		</div>
	);
}

/** Turns the backend verdict into an honest summary toast. */
export function reportBulkPublishResult(summary: BulkPublishSummary) {
	const { published, alreadyPublished, invalid, failed, total } = summary;

	if (published === 0) {
		toast.error(
			failed > 0
				? `Nenhum convite publicado: ${failed} falha(s).`
				: "Nenhum convite foi publicado.",
		);
	} else {
		toast.success(`${published} de ${total} convites publicados.`);
	}

	const problems: string[] = [];
	if (alreadyPublished > 0)
		problems.push(`${alreadyPublished} já publicado(s)`);
	if (invalid > 0) problems.push(`${invalid} inválido(s)`);
	if (failed > 0) problems.push(`${failed} com falha`);

	if (problems.length > 0) {
		toast.warning(`Ignorados — ${problems.join(", ")}.`, {
			description:
				summary.errors[0]?.reason ??
				"Consulta o detalhe de cada convite para mais informação.",
		});
	}
}
