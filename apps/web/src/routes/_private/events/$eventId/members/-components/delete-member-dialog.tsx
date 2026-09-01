import { Button } from "@muxima/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@muxima/ui/components/dialog";

interface DeleteMemberDialogProps {
	open: boolean;
	onOpenChange: (o: boolean) => void;
	onConfirm: () => void;
	isLoading: boolean;
}

export function DeleteMemberDialog({
	open,
	onOpenChange,
	onConfirm,
	isLoading,
}: DeleteMemberDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Remover membro</DialogTitle>
					<DialogDescription>
						Tem a certeza que deseja remover este membro do evento? Esta accao
						nao pode ser desfeita.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancelar
					</Button>
					<Button
						variant="destructive"
						disabled={isLoading}
						onClick={onConfirm}
					>
						{isLoading ? "A remover..." : "Remover"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
