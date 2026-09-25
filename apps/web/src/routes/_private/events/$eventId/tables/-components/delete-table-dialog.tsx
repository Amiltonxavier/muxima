import type { TableWithGuests } from "@muxima/api/shared/types/entities";
import { Button } from "@muxima/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@muxima/ui/components/dialog";

type DeleteTableDialogProps = {
	open: boolean;
	table: TableWithGuests | null;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
	isLoading: boolean;
};

export function DeleteTableDialog({
	open,
	table,
	onOpenChange,
	onConfirm,
	isLoading,
}: DeleteTableDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Eliminar mesa</DialogTitle>
					<DialogDescription>
						Tem a certeza que deseja eliminar a mesa{" "}
						<strong>{table?.name}</strong>?
						{(table?.tableGuests?.length || 0) > 0 && (
							<p className="mt-2 text-amber-600 text-sm">
								⚠️ Esta mesa tem {table?.tableGuests?.length} convidados
								atribuídos que serão removidos.
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
