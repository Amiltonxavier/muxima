import { PERMISSIONS } from "@muxima/permissions";
import { Button } from "@muxima/ui/components/button";
import { Pencil } from "lucide-react";
import { ExportMenu } from "@/shared/components/export-menu";
import { useEventCan } from "@/shared/hooks/use-can";
import { useEventLock } from "@/shared/hooks/use-event-lock";

export function BudgetHeader({
	eventId,
	hasBudget,
	onEditTarget,
}: {
	eventId: string;
	hasBudget: boolean;
	onEditTarget: () => void;
}) {
	const { isEventLocked, lockMessage } = useEventLock();
	// A meta é um campo do orçamento (`budget.update`) — sem a permissão o
	// botão nem aparece; a API rejeita a mesma mutação de qualquer forma.
	const canUpdate = useEventCan(eventId, PERMISSIONS.BUDGET_UPDATE);

	return (
		<div className="flex items-center justify-between gap-4">
			<div>
				<h1 className="font-semibold text-2xl">Orçamento</h1>
				<p className="text-muted-foreground text-sm">
					Os totais são calculados a partir do inventário e dos fornecedores.
					Aqui só define a meta.
				</p>
			</div>
			<div className="flex gap-2">
				<ExportMenu eventId={eventId} module="budget" />

				{canUpdate && (
					<Button
						variant={hasBudget ? "outline" : "default"}
						onClick={onEditTarget}
						disabled={isEventLocked}
						title={lockMessage ?? undefined}
					>
						<Pencil className="mr-2 h-4 w-4" />
						{hasBudget ? "Editar meta" : "Definir meta"}
					</Button>
				)}
			</div>
		</div>
	);
}
