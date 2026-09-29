import { Button } from "@muxima/ui/components/button";
import { Pagination } from "@muxima/ui/components/pagination";
import { Link2 } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";
import { useInvitationsFilters } from "../../-hooks/use-invitations-filters";
import { useVisibleSelection } from "../../-hooks/use-visible-selection";
import {
	useInvitationStats,
	useInvitations,
	usePublishInvitationsBatch,
} from "../../-queries/invitation-queries";
import type { BulkPublishSummary } from "../../-types/invitation.types";
import { isInvitationPublishable } from "../../-utils/invitation.utils";
import {
	InvitationsBulkToolbar,
	reportBulkPublishResult,
} from "./invitations-bulk-toolbar";
import { InvitationsFilters } from "./invitations-filters";
import { InvitationsStats } from "./invitations-stats";
import { InvitationsTable } from "./invitations-table";

/**
 * "Convites" tab — the invitations half of the guests module.
 *
 * Migrated from the deactivated `invitations` page and extended with multi
 * selection plus backend bulk publish.
 */
export function InvitationsTab({
	eventId,
	onViewInvitation,
}: {
	eventId: string;
	onViewInvitation: (guestId: string) => void;
}) {
	const filters = useInvitationsFilters();
	const publishBatch = usePublishInvitationsBatch();

	const invitationsQuery = useInvitations(eventId, {
		page: filters.page,
		limit: filters.limit,
		search: filters.search || undefined,
		response: filters.response,
	});
	const statsQuery = useInvitationStats(eventId);

	const invitations = invitationsQuery.data?.data ?? [];
	const meta = invitationsQuery.data?.meta;

	const visibleIds = useMemo(
		() => invitations.map((invitation) => invitation.id),
		[invitations],
	);
	const selection = useVisibleSelection(visibleIds);

	const publishableIdSet = useMemo(
		() =>
			new Set(
				invitations
					.filter((invitation) => isInvitationPublishable(invitation))
					.map((invitation) => invitation.id),
			),
		[invitations],
	);

	const unpublishedCount = statsQuery.data?.unpublished ?? 0;

	const handlePublishAll = () => {
		publishBatch.mutate(
			{ eventId, invitationIds: [], scope: "ALL_UNPUBLISHED" },
			{
				onSuccess: (summary: BulkPublishSummary) => {
					reportBulkPublishResult(summary);
					selection.clear();
				},
				onError: (e: Error) =>
					toast.error(e.message || "Não foi possível publicar os convites"),
			},
		);
	};

	return (
		<div className="space-y-6">
			<InvitationsStats
				stats={statsQuery.data}
				isLoading={statsQuery.isLoading}
			/>

			<div className="flex flex-wrap items-center justify-end gap-2">
				<Button
					variant="outline"
					size="sm"
					disabled={unpublishedCount === 0 || publishBatch.isPending}
					title={
						unpublishedCount === 0
							? "Não existem convites por publicar"
							: "Publica todos os convites ainda privados deste evento"
					}
					onClick={handlePublishAll}
				>
					Publicar todos
				</Button>
			</div>

			<InvitationsFilters
				search={filters.search}
				response={filters.response}
				onSearchChange={filters.setSearch}
				onResponseChange={filters.setResponse}
			/>

			<InvitationsBulkToolbar
				eventId={eventId}
				selectedIds={selection.selectedIds}
				publishableIds={selection.selectedIds.filter((id) =>
					publishableIdSet.has(id),
				)}
				onClearSelection={selection.clear}
			/>

			<InvitationsTable
				invitations={invitations}
				isLoading={invitationsQuery.isLoading}
				isError={invitationsQuery.isError}
				selectedIds={selection.selectedIds}
				onToggleSelected={selection.toggle}
				onToggleAll={selection.toggleAll}
				onView={onViewInvitation}
			/>

			{meta && (
				<Pagination
					meta={meta}
					onPageChange={filters.setPage}
					onLimitChange={filters.setLimit}
					disabled={invitationsQuery.isLoading}
				/>
			)}

			<div className="flex items-start gap-2 bg-muted p-3 text-muted-foreground text-xs">
				<Link2 className="mt-0.5 h-4 w-4 shrink-0" />
				<p>
					Um convite só pode ser acedido pelo convidado depois de{" "}
					<strong>publicado</strong> (botão de globo). O link público é único e
					não é indexado por motores de busca.
				</p>
			</div>
		</div>
	);
}
