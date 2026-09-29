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
import { getMemberName } from "../-utils/member.utils";

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
	return (
		<Dialog open={!!member} onOpenChange={() => onClose()}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Remover membro</DialogTitle>
					<DialogDescription>
						{member ? getMemberName(member) : "Este membro"} perderá o acesso a
						este evento. O evento e os convidados não são eliminados. Esta ação
						não pode ser desfeita.
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
						{isLoading ? "A remover..." : "Remover"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
