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
import { useCreateInvitation, useInvitation } from "../-queries/guest-queries";
import {
	buildInvitationLink,
	buildInvitationMessage,
} from "../-utils/invitation.utils";

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
	const invitationQuery = useInvitation(guest.id);
	const invitation = invitationQuery.data;

	const invitationLink = invitation
		? buildInvitationLink(String(invitation.code))
		: null;

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
				onError: (e) => toast.error(e.message),
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
						<Button
							onClick={handleCreateAndShare}
							disabled={createInvitation.isPending}
						>
							<Plus className="mr-2 h-4 w-4" />
							{createInvitation.isPending
								? "A criar..."
								: "Criar e partilhar convite"}
						</Button>
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
