import { Mail, Phone, User } from "lucide-react";
import type { ViewInvitationGuest } from "../../-types/guest.types";

export function InvitationGuests({
	guests,
}: {
	guests: ViewInvitationGuest[];
}) {
	const firstGuest = guests.length > 0 ? guests[0]?.guest : undefined;

	return (
		<section>
			<div className="mb-3 flex items-center gap-2">
				<User className="h-4 w-4 text-muted-foreground" />
				<h3 className="font-semibold text-sm">
					{guests.length > 1 ? `Convidados (${guests.length})` : "Convidado"}
				</h3>
			</div>
			{guests.length > 0 ? (
				<div className="space-y-2">
					{guests.map((ig) => {
						const g = ig.guest;
						return (
							<div key={ig.id} className="border p-3">
								<p className="font-medium text-sm">{String(g?.name)}</p>
								{g?.email || g?.phone ? (
									<div className="mt-1 space-y-0.5 text-muted-foreground text-xs">
										{g?.phone ? (
											<p className="flex items-center gap-2">
												<Phone className="h-3.5 w-3.5" />
												{String(g.phone)}
											</p>
										) : null}
										{g?.email ? (
											<p className="flex items-center gap-2">
												<Mail className="h-3.5 w-3.5" />
												{String(g.email)}
											</p>
										) : null}
									</div>
								) : null}
							</div>
						);
					})}
				</div>
			) : (
				<p className="font-medium text-base">
					{String(firstGuest?.name || "")}
				</p>
			)}
		</section>
	);
}
