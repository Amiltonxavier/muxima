import type { PublicInvitation } from "@muxima/api/shared/types/entities";
import { Badge } from "@muxima/ui/components/badge";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { User } from "lucide-react";
import { GUEST_STATUS_LABELS } from "@/utils/status-helpers";

export function GuestList({ invitation }: { invitation: PublicInvitation }) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Convidados</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{invitation.guests.map((guest) => {
					const companionNames = guest.companions
						.map((companion) => companion.name)
						.join(", ");

					return (
						<div
							key={guest.id}
							className="flex items-start justify-between gap-3"
						>
							<div>
								<p className="text-sm font-medium">{guest.name}</p>
								{companionNames && (
									<p className="mt-0.5 flex items-center gap-1 text-muted-foreground text-xs">
										<User className="h-3 w-3" />
										{companionNames}
									</p>
								)}
							</div>
							<Badge variant="outline">
								{GUEST_STATUS_LABELS[guest.status] ?? guest.status}
							</Badge>
						</div>
					);
				})}
			</CardContent>
		</Card>
	);
}