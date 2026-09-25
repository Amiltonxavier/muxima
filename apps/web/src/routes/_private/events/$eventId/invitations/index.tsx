import { Button } from "@muxima/ui/components/button";
import { Pagination } from "@muxima/ui/components/pagination";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Link2, MailPlus } from "lucide-react";
import { useState } from "react";
import { BackButton } from "@/shared/components/back-to";
import { InvitationsFilters } from "./-components/invitations-filters";
import { InvitationsStats } from "./-components/invitations-stats";
import { InvitationsTable } from "./-components/invitations-table";
import type { InvitationResponseFilter } from "./-constants/invitation.constants";
import {
	useInvitationStats,
	useInvitations,
} from "./-queries/invitation-queries";

export const Route = createFileRoute("/_private/events/$eventId/invitations/")({
	component: InvitationsPage,
});

function InvitationsPage() {
	const { eventId } = Route.useParams();
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(20);
	const [search, setSearch] = useState("");
	const [response, setResponse] = useState<InvitationResponseFilter>("ALL");

	const invitationsQuery = useInvitations(eventId, {
		page,
		limit,
		search: search || undefined,
		response,
	});
	const statsQuery = useInvitationStats(eventId);

	const invitations = invitationsQuery.data?.data ?? [];
	const meta = invitationsQuery.data?.meta;
	const stats = statsQuery.data;

	return (
		<div className="space-y-6">
			<BackButton to={`/events/${eventId}`} label="Voltar ao evento" />
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div>
					<h1 className="font-semibold text-2xl">Convites</h1>
					<p className="text-muted-foreground text-sm">
						Gere os convites e acompanha as respostas dos teus convidados.
					</p>
				</div>
				<Button
					render={<Link to="/events/$eventId/guests" params={{ eventId }} />}
					variant="outline"
					size="sm"
				>
					<MailPlus className="mr-2 h-4 w-4" />
					Criar convite
				</Button>
			</div>

			<InvitationsStats stats={stats} />

			<InvitationsFilters
				search={search}
				response={response}
				onSearchChange={setSearch}
				onResponseChange={setResponse}
			/>

			<InvitationsTable
				invitations={invitations}
				isLoading={invitationsQuery.isLoading}
				isError={invitationsQuery.isError}
			/>

			{meta && (
				<Pagination
					meta={meta}
					onPageChange={setPage}
					onLimitChange={setLimit}
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
