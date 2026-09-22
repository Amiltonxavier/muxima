import type { Table as TableEntity } from "@muxima/api/shared/types/entities";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@muxima/ui/components/dialog";
import type {
	GuestDialogInitialValues,
	GuestDialogValues,
} from "../../-types/guest.types";
import { GuestForm } from "./guest-form";

export function GuestDialog({
	open,
	onOpenChange,
	initialValues,
	tables,
	onSubmit,
	isLoading,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	initialValues?: GuestDialogInitialValues;
	tables: Array<TableEntity>;
	onSubmit: (values: GuestDialogValues) => void;
	isLoading: boolean;
}) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>
						{initialValues ? "Editar convidado" : "Adicionar convidado"}
					</DialogTitle>
				</DialogHeader>
				<GuestForm
					initialValues={initialValues}
					tables={tables}
					onSubmit={onSubmit}
					onCancel={() => onOpenChange(false)}
					isLoading={isLoading}
				/>
			</DialogContent>
		</Dialog>
	);
}
