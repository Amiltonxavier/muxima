import type { PublicInvitation } from "@muxima/api/shared/types/entities";
import { Badge } from "@muxima/ui/components/badge";

export function InviteHeader({ invitation }: { invitation: PublicInvitation }) {
	return (
		<div className="relative overflow-hidden rounded-2xl bg-primary/10 p-6 text-center">
			<p className="text-primary font-semibold text-xs tracking-wide uppercase">
				És convidado(a)
			</p>
			<h1 className="mt-2 text-2xl font-semibold">{invitation.event.name}</h1>
			<p className="mt-2 text-muted-foreground text-sm">
				por {invitation.host.name}
			</p>
			<Badge variant="secondary" className="mt-3">
				{invitation.event.type === "WEDDING" ? "Casamento" : "Noivado"}
			</Badge>
		</div>
	);
}