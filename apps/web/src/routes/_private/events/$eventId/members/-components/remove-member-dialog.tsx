import { Button } from "@muxima/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@muxima/ui/components/dialog";
import type { MemberItem } from "../-types/member.types";
import { getMemberName, isInvitation } from "../-utils/member.utils";

export function RemoveMemberDialog({
	member,
	onClose,
	onConfirm,
	isLoading,
}: {
	member: MemberItem | null;
	onClose: () => void;
	onConfirm: (memberId: string) => void;
	isLoading: boolean;
}) {
	const invitation = member ? isInvitation(member) : false;
	return (
		<Dialog open={!!member} onOpenChange={() => onClose()}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						{invitation ? "Cancelar convite" : "Remover membro"}
					</DialogTitle>
					<DialogDescription>
						{invitation
							? `O convite para ${member ? getMemberName(member) : "este e-mail"} será cancelado. Poderá voltar a convidar mais tarde.`
							: `${member ? getMemberName(member) : "Este membro"} perderá o acesso a este evento. O evento e os convidados não são eliminados. Esta ação não pode ser desfeita.`}
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant="outline" onClick={onClose}>
						Cancelar
					</Button>
					<Button
						variant="destructive"
						disabled={isLoading}
						onClick={() => member && onConfirm(member.id)}
					>
						{invitation
							? isLoading
								? "A cancelar..."
								: "Cancelar convite"
							: isLoading
								? "A remover..."
								: "Remover"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
