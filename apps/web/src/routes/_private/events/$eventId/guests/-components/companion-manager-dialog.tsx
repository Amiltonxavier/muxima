import { Button } from "@muxima/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@muxima/ui/components/dialog";
import { Input } from "@muxima/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@muxima/ui/components/select";
import { Plus, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { guestCompanionSchema } from "@/utils/guest-schemas";
import { COMPANION_STATUS_LABELS, toSelectItems } from "@/utils/status-helpers";
import {
	useAddCompanion,
	useRemoveCompanion,
	useUpdateCompanion,
} from "../-queries/guest-queries";
import type { GuestItem } from "../-types/guest.types";

export function CompanionManagerDialog({
	guest,
	onClose,
}: {
	guest: GuestItem;
	onClose: () => void;
}) {
	const addCompanion = useAddCompanion();
	const updateCompanion = useUpdateCompanion();
	const removeCompanion = useRemoveCompanion();
	const [newName, setNewName] = useState("");

	const companions = guest.companions ?? [];

	const handleAdd = () => {
		const result = guestCompanionSchema.safeParse({ name: newName });
		if (!result.success) {
			toast.error(result.error.issues[0].message);
			return;
		}
		addCompanion.mutate(
			{ guestId: guest.id, name: newName },
			{
				onSuccess: () => {
					toast.success("Acompanhante adicionado");
					setNewName("");
				},
				onError: (e) => toast.error(e.message),
			},
		);
	};

	const handleStatusChange = (companionId: string, status: string) => {
		updateCompanion.mutate(
			{
				id: companionId,
				status: status as "PENDING" | "CONFIRMED" | "DECLINED",
			},
			{
				onSuccess: () => toast.success("Estado atualizado"),
				onError: (e) => toast.error(e.message),
			},
		);
	};

	const handleRemove = (companionId: string) => {
		removeCompanion.mutate(
			{ id: companionId },
			{
				onSuccess: () => toast.success("Acompanhante removido"),
				onError: (e) => toast.error(e.message),
			},
		);
	};

	return (
		<Dialog open onOpenChange={() => onClose()}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Users className="h-4 w-4" />
						Acompanhantes
					</DialogTitle>
					<DialogDescription>
						Gerir acompanhantes de <strong>{guest.name}</strong>
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="flex gap-2">
						<Input
							placeholder="Nome do acompanhante"
							value={newName}
							onChange={(e) => setNewName(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									handleAdd();
								}
							}}
							disabled={addCompanion.isPending}
						/>
						<Button
							onClick={handleAdd}
							disabled={!newName.trim() || addCompanion.isPending}
							size="sm"
						>
							<Plus className="h-4 w-4" />
						</Button>
					</div>

					{companions.length === 0 ? (
						<p className="py-4 text-center text-muted-foreground text-sm">
							Nenhum acompanhante adicionado.
						</p>
					) : (
						<div className="space-y-2">
							{companions.map((companion) => (
								<div
									key={companion.id}
									className="flex items-center justify-between rounded-md border p-3"
								>
									<div className="flex items-center gap-3">
										<span className="text-sm">{companion.name}</span>
										<Select
											value={companion.status || "PENDING"}
											onValueChange={(v) =>
												handleStatusChange(companion.id, v as string)
											}
										>
											<SelectTrigger className="h-7 w-[120px] text-xs">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{toSelectItems(COMPANION_STATUS_LABELS).map((item) => (
													<SelectItem key={item.value} value={item.value}>
														{item.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
									<Button
										variant="ghost"
										size="icon-sm"
										className="h-7 text-destructive"
										onClick={() => handleRemove(companion.id)}
										disabled={removeCompanion.isPending}
									>
										<Trash2 className="h-3.5 w-3.5" />
									</Button>
								</div>
							))}
						</div>
					)}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={onClose}>
						Fechar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
