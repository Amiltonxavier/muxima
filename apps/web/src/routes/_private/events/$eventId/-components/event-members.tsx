// -components/event-members.tsx

import { Badge } from "@muxima/ui/components/badge";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { Users } from "lucide-react";

import { initials } from "@/shared/utils/string";
import { getStatusLabel } from "@/utils/status-helpers";

interface EventMember {
	id: string;
	status: string;
	role: string;
	user: {
		name?: string | null;
	};
}

interface EventMembersProps {
	members: EventMember[];
}

export function EventMembers({ members }: EventMembersProps) {
	if (members.length === 0) {
		return null;
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-sm">
					<Users className="h-4 w-4" />
					Equipa ({members.length})
				</CardTitle>
			</CardHeader>

			<CardContent>
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{members.map((member) => (
						<div key={member.id} className="flex items-center gap-3 border p-3">
							{member.user.name && (
								<div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted font-medium text-xs">
									{initials(member.user.name)}
								</div>
							)}

							<div className="min-w-0 flex-1">
								<p className="truncate font-medium text-sm">
									{member.user.name ? String(member.user.name) : "Utilizador"}
								</p>

								<p className="text-muted-foreground text-xs">
									{getStatusLabel(member.role, "role")}
								</p>
							</div>

							<Badge
								className={
									member.status === "ACTIVE"
										? "bg-green-50 text-green-700"
										: "bg-amber-50 text-amber-700"
								}
							>
								{member.status === "ACTIVE" ? "Ativo" : "Pendente"}
							</Badge>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
