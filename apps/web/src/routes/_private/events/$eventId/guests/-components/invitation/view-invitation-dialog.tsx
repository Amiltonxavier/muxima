import { Button } from "@muxima/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@muxima/ui/components/dialog";
import { EyeOff, Globe, Plus } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/utils/format-date";
import {
	getStatusLabel,
	INVITATION_STATUS_LABELS,
} from "@/utils/status-helpers";
import {
	useCreateInvitation,
	useInvitation,
	usePublishInvitation,
	useRespondToInvitation,
	useUnpublishInvitation,
} from "../../-queries/invitation-queries";
import { resolveInvitationUrl } from "../../-utils/invitation.utils";
import { InvitationCode } from "./invitation-code";
import { InvitationEventDetails } from "./invitation-event-details";
import { InvitationGuests } from "./invitation-guests";
import { InvitationHost } from "./invitation-host";
import { InvitationLink } from "./invitation-link";
import { InvitationQrCode } from "./invitation-qr-code";
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
	const invitationQuery = useInvitation(eventId, guestId);
	const createInvitation = useCreateInvitation();
	const respondToInvitation = useRespondToInvitation();
	const publish = usePublishInvitation();
	const unpublish = useUnpublishInvitation();
	const invitation = invitationQuery.data;

	const event = invitation?.event;
	const allGuests = invitation?.guests ?? [];

	const firstGuest = allGuests.length > 0 ? allGuests[0]?.guest : undefined;
	const tableGuests = firstGuest?.tableGuests ?? [];
	const table = tableGuests.length > 0 ? tableGuests[0]?.table : null;

	const isPublished = Boolean(invitation?.publishedAt);
	const invitationUrl = resolveInvitationUrl(invitation ?? null);

	const handleCreate = () => {
		const guestIds =
			allGuests.length > 0
				? allGuests.map((ig) => ig.guest?.id).filter((id): id is string => !!id)
				: [guestId];
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

	const handleCopyLink = () => {
		if (invitationUrl) {
			navigator.clipboard.writeText(invitationUrl);
			toast.success("Link do convite copiado!");
		}
	};

	const handleTogglePublish = () => {
		if (!invitation) return;

		if (isPublished) {
			unpublish.mutate(
				{ eventId, invitationId: invitation.id },
				{
					onError: (e: Error) => toast.error(e.message),
					onSuccess: () => toast.success("Convite retirado da publicação"),
				},
			);
			return;
		}

		publish.mutate(
			{ eventId, invitationId: invitation.id },
			{
				onError: (e: Error) =>
					toast.error(e.message || "Não foi possível publicar o convite"),
				onSuccess: () => toast.success("Convite publicado!"),
			},
		);
	};

	const handleResponse = (response: "CONFIRM" | "DECLINE" | "MAYBE") => {
		if (!invitation?.code) return;
		respondToInvitation.mutate(
			{ eventId, code: String(invitation.code), response },
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
						Detalhes do convite, QR Code de acesso e informações do evento.
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

						{/* QR + public link: the QR is the primary way guests get in. */}
						<section className="flex flex-col gap-4 border-y py-5 sm:flex-row sm:items-start">
							<InvitationQrCode qrCode={invitation.qrCode} size={168} />
							<div className="min-w-0 flex-1 space-y-3">
								<InvitationLink url={invitationUrl} onCopy={handleCopyLink} />
								<Button
									variant={isPublished ? "outline" : "default"}
									size="sm"
									className="w-full rounded-none"
									disabled={publish.isPending || unpublish.isPending}
									onClick={handleTogglePublish}
								>
									{isPublished ? (
										<>
											<EyeOff className="mr-2 h-4 w-4" />
											Retirar publicação
										</>
									) : (
										<>
											<Globe className="mr-2 h-4 w-4" />
											Publicar convite
										</>
									)}
								</Button>
								<p className="text-[11px] text-muted-foreground">
									{isPublished
										? `Publicado em ${formatDate(String(invitation.publishedAt))}. Qualquer pessoa com o link consegue abrir o convite.`
										: "Enquanto não for publicado, apenas tu tens acesso a este convite."}
								</p>
							</div>
						</section>

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
