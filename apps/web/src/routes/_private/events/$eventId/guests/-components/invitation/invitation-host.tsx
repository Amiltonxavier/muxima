import { Mail, User } from "lucide-react";
import type { ViewInvitationEvent } from "../../-types/guest.types";

export function InvitationHost({
	owner,
}: {
	owner: ViewInvitationEvent["owner"];
}) {
	if (!owner) {
		return null;
	}

	return (
		<section>
			<div className="mb-3 flex items-center gap-2">
				<User className="h-4 w-4 text-muted-foreground" />
				<h3 className="font-semibold text-sm">Anfitrião</h3>
			</div>
			<p className="font-medium text-sm">{String(owner.name || owner.email)}</p>
			{owner.email ? (
				<p className="mt-1 flex items-center gap-2 text-muted-foreground text-xs">
					<Mail className="h-3.5 w-3.5" />
					{String(owner.email)}
				</p>
			) : null}
		</section>
	);
}
