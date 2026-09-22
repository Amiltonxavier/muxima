import type { ViewInvitationTable } from "../../-types/guest.types";

export function InvitationTable({
	table,
}: {
	table: ViewInvitationTable | null;
}) {
	if (!table) {
		return null;
	}

	return (
		<section className="border-y py-4">
			<p className="text-muted-foreground text-xs">Mesa atribuída</p>
			<p className="mt-1 font-semibold text-sm">
				{String(table.name)}
				{table.number ? ` · ${String(table.number)}` : ""}
			</p>
			{table.location ? (
				<p className="mt-1 text-muted-foreground text-xs">
					{String(table.location)}
				</p>
			) : null}
		</section>
	);
}
