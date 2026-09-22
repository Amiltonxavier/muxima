import { Button } from "@muxima/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@muxima/ui/components/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/utils/format-date";
import {
	getStatusLabel,
	INVITATION_STATUS_LABELS,
} from "@/utils/status-helpers";
import {
	useCreateInvitation,
	useInvitation,
	useRespondToInvitation,
} from "../../-queries/guest-queries";
import { InvitationCode } from "./invitation-code";
import { InvitationEventDetails } from "./invitation-event-details";
import { InvitationGuests } from "./invitation-guests";
import { InvitationHost } from "./invitation-host";
import { InvitationResponse } from "./invitation-response";
import { InvitationTable } from "./invitation-table";
import { InvitationWarning } from "./invitation-warning";

export function ViewInvitationDialog({
	guestId,
	eventId,
	onClose,
}: {
	guestId: string;
	eventId: string;
	onClose: () => void;
}) {
	const invitationQuery = useInvitation(guestId);
	const createInvitation = useCreateInvitation();
	const respondToInvitation = useRespondToInvitation();
	const invitation = invitationQuery.data;

	const event = invitation?.event;
	const allGuests = invitation?.guests ?? [];

	const firstGuest = allGuests.length > 0 ? allGuests[0]?.guest : undefined;
	const tableGuests = firstGuest?.tableGuests ?? [];
	const table = tableGuests.length > 0 ? tableGuests[0]?.table : null;

	const handleCreate = () => {
		const guestIds =
			allGuests.length > 0 ? allGuests.map((ig) => ig.guest?.id) : [guestId];
		createInvitation.mutate(
			{ guestIds, eventId },
			{
				onSuccess: () => toast.success("Convite criado com sucesso"),
				onError: (e) => toast.error(e.message),
			},
		);
	};

	const handleCopyCode = () => {
		if (invitation?.code) {
			navigator.clipboard.writeText(String(invitation.code));
			toast.success("Código copiado!");
		}
	};

	const handleResponse = (response: "CONFIRM" | "DECLINE" | "MAYBE") => {
		if (!invitation?.code) return;
		respondToInvitation.mutate(
			{ code: String(invitation.code), response },
			{
				onSuccess: () => {
					toast.success(
						response === "CONFIRM"
							? "Convite confirmado"
							: response === "MAYBE"
								? "Convite marcado como talvez"
								: "Convite recusado",
					);
					invitationQuery.refetch();
				},
				onError: (e) => toast.error(e.message),
			},
		);
	};

	return (
		<Dialog open onOpenChange={() => onClose()}>
			<DialogContent className="max-h-[85vh] overflow-y-auto rounded-none sm:max-w-2xl">
				<DialogHeader className="border-b pb-4">
					<DialogTitle className="font-semibold text-lg tracking-tight">
						Convite
					</DialogTitle>
					<DialogDescription className="text-muted-foreground text-sm">
						Detalhes do convite e informações do evento.
					</DialogDescription>
				</DialogHeader>

				{invitationQuery.isLoading ? (
					<div className="py-10 text-center text-muted-foreground text-sm">
						A carregar...
					</div>
				) : invitation && event ? (
					<div className="space-y-6 py-2">
						<section className="border-b pb-5">
							<p className="mb-2 font-medium text-[11px] text-muted-foreground uppercase tracking-[0.16em]">
								Convite para
							</p>
							<h2 className="font-semibold text-2xl tracking-tight">
								{String(event.name)}
							</h2>
							<div className="mt-2 flex items-center gap-2 text-muted-foreground text-xs">
								<span>{getStatusLabel(String(event.status), "event")}</span>
								<span>·</span>
								<span>
									{event.type === "WEDDING" ? "Casamento" : "Noivado"}
								</span>
							</div>
						</section>

						<InvitationGuests guests={allGuests} />

						<InvitationEventDetails event={event} />

						<InvitationTable table={table} />

						<InvitationHost owner={event.owner} />

						<InvitationWarning />

						<InvitationCode code={invitation.code} onCopy={handleCopyCode} />

						<section className="grid grid-cols-2 divide-x border-y">
							<div className="py-3 pr-4">
								<p className="text-muted-foreground text-xs">
									Estado do convite
								</p>
								<p className="mt-1 font-medium text-sm">
									{INVITATION_STATUS_LABELS[String(invitation.status)] ||
										String(invitation.status)}
								</p>
							</div>
							<div className="py-3 pl-4">
								<p className="text-muted-foreground text-xs">Enviado em</p>
								<p className="mt-1 font-medium text-sm">
									{invitation.sentAt
										? formatDate(String(invitation.sentAt))
										: "—"}
								</p>
							</div>
						</section>

						<InvitationResponse
							status={invitation.status}
							response={invitation.response}
							respondedAt={invitation.respondedAt}
							onConfirm={() => handleResponse("CONFIRM")}
							onMaybe={() => handleResponse("MAYBE")}
							onDecline={() => handleResponse("DECLINE")}
							isResponding={respondToInvitation.isPending}
						/>
					</div>
				) : (
					<div className="py-8 text-center">
						<p className="text-muted-foreground text-sm">
							Nenhum convite criado para este convidado.
						</p>
						<Button
							className="mt-4 rounded-none"
							onClick={handleCreate}
							disabled={createInvitation.isPending}
						>
							<Plus className="mr-2 h-4 w-4" />
							{createInvitation.isPending ? "A criar..." : "Criar convite"}
						</Button>
					</div>
				)}

				<DialogFooter className="border-t pt-4">
					<Button variant="outline" className="rounded-none" onClick={onClose}>
						Fechar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
