import { Checkbox } from "@muxima/ui/components/checkbox";
import {
	Table,
	TableBody,
	TableHead,
	TableHeader,
	TableRow,
} from "@muxima/ui/components/table";
import { EmptyState } from "@/shared/components/states/empty-state";
import { ErrorState } from "@/shared/components/states/error-state";
import { LoadingState } from "@/shared/components/states/loading-state";
import type { InvitationItem } from "../../-types/invitation.types";
import { InvitationTableRow } from "./invitation-table-row";

export function InvitationsTable({
	invitations,
	isLoading,
	isError,
	selectedIds,
	onToggleSelected,
	onToggleAll,
	onView,
}: {
	invitations: InvitationItem[];
	isLoading: boolean;
	isError: boolean;
	selectedIds: string[];
	onToggleSelected: (invitationId: string) => void;
	onToggleAll: () => void;
	onView: (guestId: string) => void;
}) {
	if (isLoading) return <LoadingState />;
	if (isError) return <ErrorState />;
	if (invitations.length === 0) {
		return (
			<EmptyState message="Ainda não existem convites para este evento." />
		);
	}

	const selected = new Set(selectedIds);
	const allSelected =
		invitations.length > 0 && selectedIds.length === invitations.length;

	return (
		<div className="overflow-x-auto border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="w-10">
							<Checkbox
								checked={allSelected}
								onCheckedChange={onToggleAll}
								aria-label="Seleccionar todos os convites"
							/>
						</TableHead>
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
						<InvitationTableRow
							key={invitation.id}
							invitation={invitation}
							isSelected={selected.has(invitation.id)}
							onToggleSelected={onToggleSelected}
							onView={onView}
						/>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
