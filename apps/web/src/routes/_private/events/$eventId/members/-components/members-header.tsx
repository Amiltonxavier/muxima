import { Button } from "@muxima/ui/components/button";
import { Users } from "lucide-react";

/** Page title + primary action. */
export function MembersHeader({
	memberCount,
	canAdd,
	onAdd,
}: {
	memberCount: number;
	canAdd: boolean;
	onAdd: () => void;
}) {
	return (
		<div className="flex flex-wrap items-center justify-between gap-3">
			<div>
				<h1 className="font-semibold text-2xl">Membros do evento</h1>
				<p className="text-muted-foreground text-sm">
					{memberCount > 0
						? `${memberCount} pessoa(s) com acesso a este evento`
						: "Gere a equipa do evento"}
				</p>
			</div>
			<Button disabled={!canAdd} onClick={onAdd}>
				<Users className="mr-2 h-4 w-4" />
				Adicionar membro
			</Button>
		</div>
	);
}
