import { PERMISSIONS } from "@muxima/permissions";
import { Button } from "@muxima/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@muxima/ui/components/dialog";
import { Plus, Share2 } from "lucide-react";
import { toast } from "sonner";
import { useEventCan } from "@/shared/hooks/use-can";
import { useEventLock } from "@/shared/hooks/use-event-lock";
import {
	useCreateInvitation,
	useInvitation,
} from "../-queries/invitation-queries";
import {
	buildInvitationMessage,
	resolveInvitationUrl,
} from "../-utils/invitation.utils";
import { InvitationQrCode } from "./invitation/invitation-qr-code";

export function ShareInvitationDialog({
	guest,
	eventId,
	onClose,
}: {
	guest: { id: string; name: string };
	eventId: string;
	onClose: () => void;
}) {
	const createInvitation = useCreateInvitation();
	const { isEventLocked, lockMessage } = useEventLock();
	// Sharing an EXISTING link is a read; creating the invitation first is a
	// write and needs its own capability. Without it the fallback branch just
	// explains that no invitation exists — the backend would refuse anyway.
	const mayCreate = useEventCan(eventId, PERMISSIONS.INVITATION_CREATE);
	const invitationQuery = useInvitation(eventId, guest.id);
	const invitation = invitationQuery.data;

	// Backend-built URL — the exact payload encoded in the QR Code.
	const invitationLink = resolveInvitationUrl(invitation ?? null);

	const handleShareWhatsApp = () => {
		if (invitationLink) {
			const text = buildInvitationMessage(guest.name || "", invitationLink);
			window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
		}
	};

	const handleShareCopy = () => {
		if (invitationLink) {
			navigator.clipboard.writeText(invitationLink);
			toast.success("Link copiado para a área de transferência!");
		}
	};

	const handleCreateAndShare = () => {
		createInvitation.mutate(
			{ guestIds: [guest.id], eventId },
			{
				onSuccess: () => {
					toast.success("Convite criado!");
				},
			},
		);
	};

	return (
		<Dialog open onOpenChange={() => onClose()}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Partilhar Convite</DialogTitle>
					<DialogDescription>
						Envie o convite para <strong>{guest.name}</strong>
					</DialogDescription>
				</DialogHeader>
				{invitationQuery.isLoading ? (
					<div className="py-8 text-center text-muted-foreground text-sm">
						A carregar...
					</div>
				) : invitationLink ? (
					<div className="space-y-4">
						<div className="flex flex-col items-center gap-3">
							<InvitationQrCode qrCode={invitation?.qrCode} size={176} />
						</div>
						<div className="border p-3">
							<p className="mb-1 text-muted-foreground text-xs">
								Link de convite
							</p>
							<p className="break-all font-mono text-sm">{invitationLink}</p>
						</div>
						<div className="flex flex-col gap-2">
							<Button
								onClick={handleShareWhatsApp}
								className="w-full bg-green-600 text-white hover:bg-green-700"
							>
								<Share2 className="mr-2 h-4 w-4" />
								Partilhar via WhatsApp
							</Button>
							<Button
								onClick={handleShareCopy}
								variant="outline"
								className="w-full"
							>
								Copiar link
							</Button>
						</div>
					</div>
				) : (
					<div className="space-y-4 py-4 text-center">
						<p className="text-muted-foreground text-sm">
							Ainda não existe convite para este convidado.
						</p>
						{mayCreate && (
							<Button
								onClick={handleCreateAndShare}
								disabled={createInvitation.isPending || isEventLocked}
								title={isEventLocked ? (lockMessage ?? undefined) : undefined}
							>
								<Plus className="mr-2 h-4 w-4" />
								{createInvitation.isPending
									? "A criar..."
									: "Criar e partilhar convite"}
							</Button>
						)}
					</div>
				)}
				<DialogFooter>
					<Button variant="outline" onClick={onClose}>
						Fechar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
