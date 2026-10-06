import { PERMISSIONS } from "@muxima/permissions";
import { Button } from "@muxima/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@muxima/ui/components/dialog";
import { EyeOff, Globe, Plus } from "lucide-react";
import { toast } from "sonner";
import { useEventCan } from "@/shared/hooks/use-can";
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
	// Gating de UX: sem a permissão o controlo não aparece. A API rejeita a
	// mesma mutação de qualquer forma (o backend é a autoridade).
	const canCreate = useEventCan(eventId, PERMISSIONS.INVITATION_CREATE);
	const canPublish = useEventCan(eventId, PERMISSIONS.INVITATION_PUBLISH);
	const canRespond = useEventCan(eventId, PERMISSIONS.INVITATION_RESPOND);

	const invitation = invitationQuery.data;
	const event = invitation?.event;
	const allGuests = invitation?.guests ?? [];

	const firstGuest = allGuests[0]?.guest;
	const tableGuests = firstGuest?.tableGuests ?? [];
	const table = tableGuests[0]?.table ?? null;

	const isPublished = Boolean(invitation?.publishedAt);
	const invitationUrl = resolveInvitationUrl(invitation ?? null);

	const handleCreate = () => {
		const guestIds =
			allGuests.length > 0
				? allGuests
						.map((ig) => ig.guest?.id)
						.filter((id): id is string => Boolean(id))
				: [guestId];

		createInvitation.mutate(
			{ guestIds, eventId },
			{
				onSuccess: () => toast.success("Convite criado com sucesso."),
			},
		);
	};

	const handleCopyCode = () => {
		if (!invitation?.code) return;

		navigator.clipboard.writeText(String(invitation.code));
		toast.success("Código copiado.");
	};

	const handleCopyLink = () => {
		if (!invitationUrl) return;

		navigator.clipboard.writeText(invitationUrl);
		toast.success("Link do convite copiado.");
	};

	const handleTogglePublish = () => {
		if (!invitation) return;

		if (isPublished) {
			unpublish.mutate(
				{
					eventId,
					invitationId: invitation.id,
				},
				{
					onSuccess: () => toast.success("Convite retirado da publicação."),
				},
			);

			return;
		}

		publish.mutate(
			{
				eventId,
				invitationId: invitation.id,
			},
			{
				onSuccess: () => toast.success("Convite publicado."),
			},
		);
	};

	const handleResponse = (response: "CONFIRM" | "DECLINE" | "MAYBE") => {
		if (!invitation?.code) return;

		respondToInvitation.mutate(
			{
				eventId,
				code: String(invitation.code),
				response,
			},
			{
				onSuccess: () => {
					const messages = {
						CONFIRM: "Convite confirmado.",
						MAYBE: "Convite marcado como talvez.",
						DECLINE: "Convite recusado.",
					};

					toast.success(messages[response]);
					invitationQuery.refetch();
				},
			},
		);
	};

	return (
		<Dialog open onOpenChange={onClose}>
			<DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
				<DialogHeader className="border-b pb-5">
					{event ? (
						<div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
							<div>
								<p className="text-muted-foreground text-xs">Convite</p>

								<DialogTitle className="mt-1 text-xl">
									{String(event.name)}
								</DialogTitle>
							</div>

							<div className="flex items-center gap-2 text-muted-foreground text-xs">
								<span>
									{event.type === "WEDDING" ? "Casamento" : "Noivado"}
								</span>

								<span aria-hidden="true">·</span>

								<span className="font-medium text-foreground">
									{getStatusLabel(String(event.status), "event")}
								</span>
							</div>
						</div>
					) : (
						<DialogTitle>Convite</DialogTitle>
					)}
				</DialogHeader>

				{invitationQuery.isLoading ? (
					<div className="py-12 text-center text-muted-foreground text-sm">
						A carregar o convite...
					</div>
				) : invitation && event ? (
					<div className="space-y-6 py-2">
						{/* MAIN INFORMATION */}
						<div className="grid gap-6 md:grid-cols-[1fr_1fr]">
							{/* LEFT — PEOPLE */}
							<section className="space-y-5 md:border-r md:pr-6">
								<div>
									<h3 className="font-medium text-sm">Convidados</h3>

									<p className="mt-1 text-muted-foreground text-xs">
										Pessoas associadas a este convite.
									</p>
								</div>

								<InvitationGuests guests={allGuests} />

								<InvitationTable table={table} />

								<InvitationHost owner={event.owner} />
							</section>

							{/* RIGHT — ACCESS */}
							<section className="space-y-5">
								<div>
									<h3 className="font-medium text-sm">Acesso ao convite</h3>

									<p className="mt-1 text-muted-foreground text-xs">
										Partilhe o QR Code ou o link com os convidados.
									</p>
								</div>
								<div className="flex justify-center border-b pb-5 sm:justify-start">
									<InvitationQrCode qrCode={invitation.qrCode} size={168} />
								</div>
								<InvitationLink url={invitationUrl} onCopy={handleCopyLink} />
								<InvitationCode
									code={invitation.code}
									onCopy={handleCopyCode}
								/>{" "}
								<div className="border-t pt-4">
									{canPublish && (
										<Button
											variant={isPublished ? "outline" : "default"}
											className="w-full"
											disabled={publish.isPending || unpublish.isPending}
											onClick={handleTogglePublish}
										>
											{isPublished ? (
												<>
													<EyeOff className="mr-2 size-4" />
													Retirar publicação
												</>
											) : (
												<>
													<Globe className="mr-2 size-4" />
													Publicar convite
												</>
											)}
										</Button>
									)}

									<p className="mt-2 text-muted-foreground text-xs">
										{isPublished
											? `Publicado em ${formatDate(
													String(invitation.publishedAt),
												)}.`
											: "O convite ainda não está público."}
									</p>
								</div>
							</section>
						</div>

						{/* INVITATION STATUS */}
						<section className="border-y py-4">
							<div className="grid gap-4 sm:grid-cols-2">
								<InfoRow
									label="Estado do convite"
									value={
										INVITATION_STATUS_LABELS[String(invitation.status)] ||
										String(invitation.status)
									}
								/>

								<InfoRow
									label="Enviado em"
									value={
										invitation.sentAt
											? formatDate(String(invitation.sentAt))
											: "—"
									}
								/>

								<InfoRow
									label="Resposta"
									value={
										invitation.response
											? getInvitationResponseLabel(invitation.response)
											: "Sem resposta"
									}
								/>

								<InfoRow
									label="Respondido em"
									value={
										invitation.respondedAt
											? formatDate(String(invitation.respondedAt))
											: "—"
									}
								/>
							</div>
						</section>

						{/* RESPONSE */}
						<InvitationResponse
							status={invitation.status}
							response={invitation.response}
							respondedAt={invitation.respondedAt}
							onConfirm={() => handleResponse("CONFIRM")}
							onMaybe={() => handleResponse("MAYBE")}
							onDecline={() => handleResponse("DECLINE")}
							isResponding={respondToInvitation.isPending}
							canRespond={canRespond}
						/>

						{/* EVENT */}
						<section className="border-t pt-5">
							<div className="mb-4">
								<h3 className="font-medium text-sm">Detalhes do evento</h3>

								<p className="mt-1 text-muted-foreground text-xs">
									Informação associada ao evento deste convite.
								</p>
							</div>

							<InvitationEventDetails event={event} />
						</section>

						<InvitationWarning />
					</div>
				) : (
					<div className="py-12 text-center">
						<p className="font-medium text-sm">Nenhum convite criado</p>

						<p className="mt-1 text-muted-foreground text-xs">
							Crie um convite para este convidado para gerar o código e o acesso
							público.
						</p>

						{canCreate && (
							<Button
								className="mt-5"
								onClick={handleCreate}
								disabled={createInvitation.isPending}
							>
								<Plus className="mr-2 size-4" />
								{createInvitation.isPending ? "A criar..." : "Criar convite"}
							</Button>
						)}
					</div>
				)}

				<DialogFooter className="border-t pt-4">
					<Button variant="outline" onClick={onClose}>
						Fechar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function InfoRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-center justify-between gap-4">
			<span className="text-muted-foreground text-xs">{label}</span>
			<span className="text-right font-medium text-sm">{value}</span>
		</div>
	);
}

function getInvitationResponseLabel(response: string) {
	const labels: Record<string, string> = {
		CONFIRM: "Confirmado",
		MAYBE: "Talvez",
		DECLINE: "Recusado",
	};

	return labels[response] ?? response;
}
