import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@muxima/ui/components/table";
import { EmptyState } from "@/shared/components/states/empty-state";
import { ErrorState } from "@/shared/components/states/error-state";
import { LoadingState } from "@/shared/components/states/loading-state";
import { InvitationTableRow } from "./invitation-table-row";
import type { InvitationItem } from "../-types/invitation.types";

export function InvitationsTable({
	invitations,
	isLoading,
	isError,
}: {
	invitations: InvitationItem[];
	isLoading: boolean;
	isError: boolean;
}) {
	if (isLoading) return <LoadingState />;
	if (isError) return <ErrorState />;
	if (invitations.length === 0) {
		return (
			<EmptyState message="Ainda não existem convites para este evento." />
		);
	}

	return (
		<div className="overflow-x-auto rounded-md border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Convidado</TableHead>
						<TableHead>Código</TableHead>
						<TableHead>Resposta</TableHead>
						<TableHead>Estado</TableHead>
						<TableHead>Respondido em</TableHead>
						<TableHead>Publicação</TableHead>
						<TableHead className="text-right">Ações</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{invitations.map((invitation) => (
						<InvitationTableRow key={invitation.id} invitation={invitation} />
					))}
				</TableBody>
			</Table>
		</div>
	);
}