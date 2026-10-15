import { PERMISSIONS } from "@muxima/permissions";
import { Button } from "@muxima/ui/components/button";
import { Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { ExportMenu } from "@/shared/components/export-menu";
import { useEventCan } from "@/shared/hooks/use-can";
import { useEventLock } from "@/shared/hooks/use-event-lock";
import { useSyncChecklist } from "../-queries/checklist-queries";

/**
 * Cabeçalho do checklist. Sincronizar re-aplica as regras derivadas do lado da
 * API (estado vindo de fornecedores/inventário) — é a única escrita aqui, por
 * isso o componente detém a mutação e os toasts, como o diálogo no orçamento.
 */
export function ChecklistHeader({
	eventId,
	onNewItem,
}: {
	eventId: string;
	onNewItem: () => void;
}) {
	const { isEventLocked, lockMessage } = useEventLock();
	// Gating de UX: sem a permissão correspondente os controlos nem aparecem.
	// A API rejeita exatamente a mesma mutação — o frontend não é autoridade.
	const canCreate = useEventCan(eventId, PERMISSIONS.CHECKLIST_CREATE);
	const canUpdate = useEventCan(eventId, PERMISSIONS.CHECKLIST_UPDATE);

	const syncChecklist = useSyncChecklist();

	return (
		<div className="flex items-center justify-between gap-4">
			<div>
				<h1 className="font-semibold text-2xl">Checklist</h1>
				<p className="text-muted-foreground text-sm">
					Itens ligados a fornecedores ou inventário são atualizados
					automaticamente; os manuais são concluídos aqui.
				</p>
			</div>
			<div className="flex items-center gap-2">
				<ExportMenu eventId={eventId} module="checklist" />

				{canUpdate && (
					<Button
						variant="outline"
						title={isEventLocked ? (lockMessage ?? undefined) : undefined}
						onClick={() =>
							syncChecklist.mutate(
								{ eventId },
								{
									onSuccess: () => toast.success("Checklist sincronizado"),
								},
							)
						}
						disabled={syncChecklist.isPending || isEventLocked}
					>
						<RefreshCw
							className={`mr-2 h-4 w-4 ${syncChecklist.isPending ? "animate-spin" : ""}`}
						/>
						Sincronizar
					</Button>
				)}
				{canCreate && (
					<Button
						onClick={onNewItem}
						disabled={isEventLocked}
						title={lockMessage ?? undefined}
					>
						<Plus className="mr-2 h-4 w-4" />
						Novo item
					</Button>
				)}
			</div>
		</div>
	);
}
