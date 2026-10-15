import { Button } from "@muxima/ui/components/button";
import { Users } from "lucide-react";
import { useEventLock } from "@/shared/hooks/use-event-lock";

/** Page title + primary action. */
export function MembersHeader({
	canAdd,
	onAdd,
}: {
	canAdd: boolean;
	onAdd: () => void;
}) {
	const { isEventLocked, lockMessage } = useEventLock();

	return (
		<div className="flex flex-wrap items-center justify-between gap-3">
			<div>
				<h1 className="font-semibold text-2xl">Membros do evento</h1>
			</div>
			<Button
				disabled={!canAdd || isEventLocked}
				title={!canAdd ? undefined : (lockMessage ?? undefined)}
				onClick={onAdd}
			>
				<Users className="mr-2 h-4 w-4" />
				Adicionar membro
			</Button>
		</div>
	);
}
