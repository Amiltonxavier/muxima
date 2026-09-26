import { Badge } from "@muxima/ui/components/badge";
import { Button } from "@muxima/ui/components/button";
import { Checkbox } from "@muxima/ui/components/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@muxima/ui/components/dialog";
import { Input } from "@muxima/ui/components/input";
import { Label } from "@muxima/ui/components/label";
import { EyeOff, Lock, Search, Unlock, UserMinus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
	useRemoveDedicationViewer,
	useSetDedicationVisibility,
} from "@/shared/queries/dedication-queries";
import type { ViewerMember } from "../-types/dedication.types";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	eventId: string;
	dedicationId: string;
	dedicationTitle: string;
	isLocked: boolean;
	/** Current grants, already resolved to member rows. */
	currentViewers: ViewerMember[];
	/** Active event members, excluding the author. */
	selectableMembers: ViewerMember[];
	isLoading?: boolean;
};

export function DedicationVisibilityDialog({
	open,
	onOpenChange,
	eventId,
	dedicationId,
	dedicationTitle,
	isLocked,
	currentViewers,
	selectableMembers,
	isLoading = false,
}: Props) {
	const setVisibility = useSetDedicationVisibility();
	const removeViewer = useRemoveDedicationViewer();

	const [unlocked, setUnlocked] = useState(!isLocked);
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [search, setSearch] = useState("");

	// Seed the selection from the grants that already exist, so saving without
	// touching anything is a no-op rather than a silent revoke.
	useEffect(() => {
		if (!open) return;
		setUnlocked(!isLocked);
		setSelectedIds(currentViewers.map((viewer) => viewer.id));
		setSearch("");
	}, [open, isLocked, currentViewers]);

	const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

	const filteredSelectable = useMemo(() => {
		const term = search.trim().toLowerCase();
		if (!term) return selectableMembers;
		return selectableMembers.filter(
			(member) =>
				member.name.toLowerCase().includes(term) ||
				member.email.toLowerCase().includes(term),
		);
	}, [selectableMembers, search]);

	const toggleMember = (id: string, checked: boolean) => {
		setSelectedIds((previous) =>
			checked
				? [...new Set([...previous, id])]
				: previous.filter((value) => value !== id),
		);
	};

	const handleSave = async () => {
		// Unlocking without at least one viewer is rejected by the backend, and
		// silently meaning "everyone in the event" would be a privacy bug.
		if (unlocked && selectedIds.length === 0) {
			toast.error(
				"Escolha pelo menos um membro para poder partilhar esta dedicatória",
			);
			return;
		}

		try {
			await setVisibility.mutateAsync({
				eventId,
				dedicationId,
				isLocked: !unlocked,
				viewerEventMemberIds: unlocked ? selectedIds : [],
			});
			toast.success(
				unlocked ? "Dedicatória partilhada" : "Dedicatória bloqueada",
			);
			onOpenChange(false);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Não foi possível guardar",
			);
		}
	};

	const handleRemoveViewer = async (viewerId: string) => {
		try {
			await removeViewer.mutateAsync({ eventId, dedicationId, viewerId });
			setSelectedIds((previous) =>
				previous.filter((value) => value !== viewerId),
			);
			toast.success("Acesso removido");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Não foi possível remover",
			);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>Partilhar “{dedicationTitle}”</DialogTitle>
					<DialogDescription>
						Escolha exactamente quem pode ler esta dedicatória. Ninguém mais do
						evento tem acesso.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="flex items-center justify-between gap-3 rounded-md border p-3">
						<div className="flex items-center gap-2">
							{unlocked ? (
								<Unlock className="h-4 w-4 text-blue-600" />
							) : (
								<Lock className="h-4 w-4 text-muted-foreground" />
							)}
							<div>
								<p className="font-medium text-sm">
									{unlocked ? "Partilhada" : "Privada"}
								</p>
								<p className="text-muted-foreground text-xs">
									{unlocked
										? "Os membros seleccionados podem ler."
										: "Apenas você tem acesso."}
								</p>
							</div>
						</div>
						<Checkbox
							id="dedication-unlocked"
							checked={unlocked}
							onCheckedChange={(checked) => {
								const next = checked === true;
								setUnlocked(next);
								// Re-locking drops everyone, matching the backend rule
								// that a locked dedication keeps no grants.
								if (!next) setSelectedIds([]);
							}}
							disabled={setVisibility.isPending}
							aria-label="Partilhar dedicatória"
						/>
					</div>

					{unlocked ? (
						<div className="space-y-3">
							<Label htmlFor="viewer-search">Membros com acesso</Label>
							<div className="relative">
								<Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									id="viewer-search"
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									placeholder="Pesquisar membros..."
									className="pl-9"
								/>
							</div>

							{currentViewers.length > 0 ? (
								<div className="space-y-2">
									<p className="text-muted-foreground text-xs">Acesso actual</p>
									{currentViewers.map((viewer) => (
										<div
											key={viewer.id}
											className="flex items-center justify-between gap-2 rounded-md border p-2"
										>
											<div className="min-w-0">
												<p className="truncate font-medium text-sm">
													{viewer.name}
												</p>
												<p className="truncate text-muted-foreground text-xs">
													{viewer.email}
												</p>
											</div>
											<div className="flex shrink-0 items-center gap-2">
												{viewer.lastOpenedAt ? (
													<Badge variant="secondary">Aberto</Badge>
												) : (
													<Badge
														variant="secondary"
														className="bg-amber-50 text-amber-700"
													>
														Por abrir
													</Badge>
												)}
												<Button
													type="button"
													variant="ghost"
													size="icon-sm"
													className="text-destructive"
													aria-label={`Remover acesso de ${viewer.name}`}
													disabled={removeViewer.isPending}
													onClick={() => handleRemoveViewer(viewer.id)}
												>
													<UserMinus className="h-4 w-4" />
												</Button>
											</div>
										</div>
									))}
								</div>
							) : null}

							<div className="max-h-56 space-y-1 overflow-y-auto">
								{filteredSelectable.length === 0 ? (
									<p className="py-2 text-center text-muted-foreground text-xs">
										Nenhum membro encontrado
									</p>
								) : (
									filteredSelectable.map((member) => (
										<label
											key={member.id}
											className="flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-muted"
										>
											<Checkbox
												checked={selectedSet.has(member.id)}
												onCheckedChange={(checked) =>
													toggleMember(member.id, checked === true)
												}
												disabled={setVisibility.isPending}
												aria-label={`Dar acesso a ${member.name}`}
											/>
											<div className="min-w-0 flex-1">
												<p className="truncate font-medium text-sm">
													{member.name}
												</p>
												<p className="truncate text-muted-foreground text-xs">
													{member.email}
												</p>
											</div>
											{!member.isActive ? (
												<Badge
													variant="secondary"
													className="bg-amber-50 text-amber-700"
												>
													Por activar
												</Badge>
											) : null}
										</label>
									))
								)}
							</div>

							{selectedIds.length === 0 ? (
								<p className="text-amber-700 text-xs">
									Selecione pelo menos um membro activo para desbloquear.
								</p>
							) : (
								<p className="text-muted-foreground text-xs">
									{selectedIds.length} membro
									{selectedIds.length === 1 ? "" : "s"} com acesso.
								</p>
							)}
						</div>
					) : (
						<p className="flex items-center gap-2 text-muted-foreground text-sm">
							<EyeOff className="h-4 w-4" />
							Esta dedicatória só é visível para si.
						</p>
					)}
				</div>

				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={setVisibility.isPending}
					>
						Cancelar
					</Button>
					<Button
						type="button"
						onClick={handleSave}
						disabled={setVisibility.isPending || isLoading}
					>
						{setVisibility.isPending ? "A guardar..." : "Guardar acesso"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
