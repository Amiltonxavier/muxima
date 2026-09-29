import { Button } from "@muxima/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@muxima/ui/components/dialog";
import { Label } from "@muxima/ui/components/label";
import { Textarea } from "@muxima/ui/components/textarea";
import { ShieldAlert } from "lucide-react";
import { useState } from "react";

/**
 * Explicit confirmation for an irreversible action.
 *
 * The API requires `confirm: true` on the wire; the checkbox here is what turns
 * that literal into a real, deliberate user decision.
 */
export function BlockAccountDialog({
	open,
	onClose,
	onConfirm,
	isBlocking,
}: {
	open: boolean;
	onClose: () => void;
	onConfirm: (reason?: string) => void;
	isBlocking: boolean;
}) {
	const [confirmed, setConfirmed] = useState(false);
	const [reason, setReason] = useState("");

	const handleOpenChange = (next: boolean) => {
		if (!next) {
			setConfirmed(false);
			setReason("");
		}
		onClose();
	};

	const handleConfirm = () => {
		if (!confirmed) return;
		onConfirm(reason.trim() || undefined);
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<ShieldAlert className="h-5 w-5 text-destructive" />
						Bloquear a conta
					</DialogTitle>
					<DialogDescription>
						Esta ação é irreversível a partir da própria conta.
					</DialogDescription>
				</DialogHeader>

				<ul className="space-y-1.5 text-sm">
					<li className="flex gap-2">
						<span aria-hidden>•</span>
						<span>Serras a sessão em todos os dispositivos, agora.</span>
					</li>
					<li className="flex gap-2">
						<span aria-hidden>•</span>
						<span>Impedes novos inícios de sessão com este email e senha.</span>
					</li>
					<li className="flex gap-2">
						<span aria-hidden>•</span>
						<span>Manténs os eventos, convidados e ficheiros.</span>
					</li>
				</ul>

				<div className="space-y-2">
					<Label htmlFor="block-reason">Motivo (opcional)</Label>
					<Textarea
						id="block-reason"
						rows={2}
						maxLength={280}
						placeholder="Ajuda a tua equipa a perceber o motivo."
						value={reason}
						onChange={(e) => setReason(e.target.value)}
						disabled={isBlocking}
					/>
				</div>

				<label className="flex cursor-pointer items-start gap-2 text-sm">
					<input
						type="checkbox"
						checked={confirmed}
						onChange={(e) => setConfirmed(e.target.checked)}
						disabled={isBlocking}
						className="mt-0.5 h-4 w-4 rounded border-input"
					/>
					<span>
						Compreendo que vou perder o acesso a esta conta e que só a
						administração poderá desbloquear.
					</span>
				</label>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => handleOpenChange(false)}
						disabled={isBlocking}
					>
						Cancelar
					</Button>
					<Button
						variant="destructive"
						disabled={!confirmed || isBlocking}
						onClick={handleConfirm}
					>
						{isBlocking ? "A bloquear..." : "Bloquear a conta"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
