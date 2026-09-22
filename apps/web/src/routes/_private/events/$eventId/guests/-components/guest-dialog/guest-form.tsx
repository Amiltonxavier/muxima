import type { Table as TableEntity } from "@muxima/api/shared/types/entities";
import { Button } from "@muxima/ui/components/button";
import { DialogFooter } from "@muxima/ui/components/dialog";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { toast } from "sonner";
import { guestSchema } from "@/utils/guest-schemas";
import type {
	GuestDialogInitialValues,
	GuestDialogValues,
} from "../../-types/guest.types";
import { GuestCompanionsInput } from "./guest-companions-input";
import { GuestFormFields } from "./guest-form-fields";

export function GuestForm({
	initialValues,
	tables,
	onSubmit,
	onCancel,
	isLoading,
}: {
	initialValues?: GuestDialogInitialValues;
	tables: Array<TableEntity>;
	onSubmit: (values: GuestDialogValues) => void;
	onCancel: () => void;
	isLoading: boolean;
}) {
	const isEditing = !!initialValues;
	const [companionNames, setCompanionNames] = useState<string[]>([]);

	const form = useForm({
		defaultValues: {
			name: initialValues?.name || "",
			phone: initialValues?.phone || "",
			email: initialValues?.email || "",
			group: initialValues?.group || "",
			type: (initialValues?.type || "FAMILY") as
				| "FAMILY"
				| "FRIEND"
				| "COLLEAGUE"
				| "VIP"
				| "OTHER",
			notes: initialValues?.notes || "",
			status: (initialValues?.status || "PENDING") as
				| "PENDING"
				| "CONFIRMED"
				| "DECLINED"
				| "WAITING",
			tableId: initialValues?.tableId || "",
		},
		onSubmit: async ({ value }) => {
			const result = guestSchema.safeParse(value);
			if (!result.success) {
				toast.error(result.error.issues[0].message);
				return;
			}
			onSubmit({
				...result.data,
				tableId: value.tableId || undefined,
				companions:
					companionNames.length > 0
						? companionNames.map((name) => ({ name }))
						: undefined,
			});
		},
	});

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				form.handleSubmit();
			}}
			className="space-y-4"
		>
			<GuestFormFields
				form={form}
				tables={tables}
				isEditing={isEditing}
				isLoading={isLoading}
				companionsSection={
					!isEditing ? (
						<GuestCompanionsInput
							names={companionNames}
							onChange={setCompanionNames}
							disabled={isLoading}
						/>
					) : undefined
				}
			/>

			<DialogFooter>
				<Button type="button" variant="outline" onClick={onCancel}>
					Cancelar
				</Button>
				<Button type="submit" disabled={isLoading}>
					{isLoading ? "A guardar..." : isEditing ? "Guardar" : "Adicionar"}
				</Button>
			</DialogFooter>
		</form>
	);
}
