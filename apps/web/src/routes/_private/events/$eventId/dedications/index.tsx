import { PERMISSIONS } from "@muxima/permissions";
import { Button } from "@muxima/ui/components/button";
import { Pagination } from "@muxima/ui/components/pagination";
import { createFileRoute } from "@tanstack/react-router";
import { Feather, Plus } from "lucide-react";
import { BackButton } from "@/shared/components/back-to";
import { ExportMenu } from "@/shared/components/export-menu";
import { EmptyState } from "@/shared/components/states/empty-state";
import { ErrorState } from "@/shared/components/states/error-state";
import { LoadingState } from "@/shared/components/states/loading-state";
import { useEventCan } from "@/shared/hooks/use-can";
import { useEventLock } from "@/shared/hooks/use-event-lock";
import { DedicationsDialogs } from "./-components/dedications-dialogs";
import { DedicationsFilters } from "./-components/dedications-filters";
import { DedicationsTable } from "./-components/dedications-table";
import { useDedicationsPage } from "./-hooks/use-dedications-page";

export const Route = createFileRoute("/_private/events/$eventId/dedications/")({
	component: DedicationsPage,
});

function DedicationsPage() {
	const { eventId } = Route.useParams();
	const page = useDedicationsPage(eventId);
	const { isEventLocked, lockMessage } = useEventLock();
	// Hidden without `dedications.create` — the backend re-rejects the mutation.
	const canCreate = useEventCan(eventId, PERMISSIONS.DEDICATION_CREATE);

	return (
		<div className="space-y-6">
			<BackButton to={`/events/${eventId}`} label="Voltar ao evento" />

			<div className="flex items-center justify-between">
				<div>
					<h1 className="flex items-center gap-2 font-semibold text-2xl">
						Dedicatórias &amp; Votos
					</h1>
					<p className="text-muted-foreground text-sm">
						Escreva os votos e deduque palavras a quem importa.
					</p>
				</div>
				<div className="flex gap-2">
					<ExportMenu eventId={eventId} module="event" />

					{canCreate && (
						<Button
							onClick={() => page.openDialog({ kind: "create" })}
							disabled={isEventLocked}
							title={lockMessage ?? undefined}
						>
							<Plus className="mr-2 h-4 w-4" />
							Nova dedicatória
						</Button>
					)}
				</div>
			</div>

			<DedicationsFilters
				search={page.search}
				type={page.type}
				status={page.status}
				visibility={page.visibility}
				onSearchChange={page.handleSearchChange}
				onTypeChange={page.handleTypeChange}
				onStatusChange={page.handleStatusChange}
				onVisibilityChange={page.handleVisibilityChange}
			/>

			{page.listQuery.isLoading ? (
				<LoadingState />
			) : page.listQuery.isError ? (
				<ErrorState />
			) : page.dedications.length === 0 ? (
				<EmptyState
					message={
						page.hasFilters
							? "Nenhuma dedicatória corresponde aos filtros."
							: "Ainda não existem dedicatórias para este evento."
					}
				/>
			) : (
				<DedicationsTable
					dedications={page.dedications}
					onView={(id) => page.openDialog({ kind: "view", id })}
					onEdit={(id) => page.openDialog({ kind: "edit", id })}
					onShare={(id) => page.openDialog({ kind: "visibility", id })}
					onDelete={(id) => page.openDialog({ kind: "delete", id })}
				/>
			)}

			{page.meta ? (
				<Pagination
					meta={page.meta}
					onPageChange={page.handlePageChange}
					onLimitChange={page.handleLimitChange}
					disabled={page.listQuery.isLoading}
				/>
			) : null}

			<DedicationsDialogs
				eventId={eventId}
				dialog={page.dialog}
				activeItem={page.activeItem}
				currentViewers={page.currentViewers}
				selectableMembers={page.selectableMembers}
				isViewersLoading={page.isViewersLoading}
				onClose={page.closeDialog}
				onSaved={page.closeDialog}
			/>
		</div>
	);
}
