import { Button } from "@muxima/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@muxima/ui/components/dialog";

interface DeleteDialogProps {
	open: boolean;
	onOpenChange: (o: boolean) => void;
	tableName: string;
	guestCount: number;
	onConfirm: () => void;
	isLoading: boolean;
}

export function DeleteDialog({
	open,
	onOpenChange,
	tableName,
	guestCount,
	onConfirm,
	isLoading,
}: DeleteDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Eliminar mesa</DialogTitle>
					<DialogDescription>
						Tem a certeza que deseja eliminar a mesa{" "}
						<strong>{tableName}</strong>?
						{guestCount > 0 && (
							<p className="mt-2 text-amber-600 text-sm">
								Esta mesa tem {guestCount} convidados atribuidos que serao
								removidos.
							</p>
						)}
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancelar
					</Button>
					<Button
						variant="destructive"
						onClick={onConfirm}
						disabled={isLoading}
					>
						Eliminar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
