import { Badge } from "@muxima/ui/components/badge";
import { Button } from "@muxima/ui/components/button";
import { Pencil, Trash2 } from "lucide-react";
import { useSelected } from "@/core/hooks/useSelected";
import type { SelectedItem } from "@/core/types";
import { ACTION_TYPES_GUEST } from "../-constants";
import type { ActionTypeGuest, Guest } from "../-types";
import { DeleteDialog } from "./delete-dialog";
import { GuestDialog } from "./guest-dialog";

interface GuestListProps {
	guests: Guest[];
	updateGuest: { mutate: (vars: any, opts: any) => void; isPending: boolean };
	deleteGuest: { mutate: (vars: any, opts: any) => void; isPending: boolean };
}

export function GuestList({
	guests,
	updateGuest,
	deleteGuest,
}: GuestListProps) {
	const { isSelected, selectedAction, selectedItem, onSelect, clearSelection } =
		useSelected<SelectedItem, ActionTypeGuest>();

	return (
		<>
			<div className="space-y-1">
				{guests.map((g) => (
					<div
						key={g.id}
						className="flex items-center justify-between border px-4 py-2"
					>
						<div>
							<p className="font-medium text-sm">{g.name}</p>
							<p className="text-muted-foreground text-xs">
								{g.email || "\u2014"} {g.phone ? `| ${g.phone}` : ""}
							</p>
						</div>
						<div className="flex items-center gap-2">
							<Badge variant="secondary">{g.status}</Badge>
							<Button
								variant="ghost"
								size="icon-sm"
								onClick={() =>
									onSelect(
										g as unknown as SelectedItem,
										ACTION_TYPES_GUEST.UPDATE,
									)
								}
							>
								<Pencil className="h-3.5 w-3.5" />
							</Button>
							<Button
								variant="ghost"
								size="icon-sm"
								className="text-destructive"
								onClick={() =>
									onSelect(
										g as unknown as SelectedItem,
										ACTION_TYPES_GUEST.DELETE,
									)
								}
							>
								<Trash2 className="h-3.5 w-3.5" />
							</Button>
						</div>
					</div>
				))}
			</div>

			{isSelected &&
				selectedAction === ACTION_TYPES_GUEST.UPDATE &&
				selectedItem && (
					<GuestDialog
						open={isSelected}
						onOpenChange={clearSelection}
						initialValues={{
							name: (selectedItem as any).name || "",
							email: (selectedItem as any).email || "",
							phone: (selectedItem as any).phone || "",
							category: (selectedItem as any).category || "OTHER",
							status: (selectedItem as any).status || "PENDING",
							attendance: (selectedItem as any).attendance || "NOT_SENT",
							notes: (selectedItem as any).notes || "",
							plusOne: (selectedItem as any).plusOne || false,
						}}
						onSubmit={(values) => {
							updateGuest.mutate(
								{ id: (selectedItem as any).id, ...values } as never,
								{
									onSuccess: () => {
										clearSelection();
									},
									onError: (e: Error) => {},
								},
							);
						}}
						isLoading={updateGuest.isPending}
					/>
				)}

			{isSelected &&
				selectedAction === ACTION_TYPES_GUEST.DELETE &&
				selectedItem && (
					<DeleteDialog
						open={isSelected}
						onOpenChange={clearSelection}
						onConfirm={() => {
							deleteGuest.mutate(
								{ id: (selectedItem as any).id },
								{
									onSuccess: () => {
										clearSelection();
									},
									onError: (e: Error) => {},
								},
							);
						}}
						isLoading={deleteGuest.isPending}
					/>
				)}
		</>
	);
}
