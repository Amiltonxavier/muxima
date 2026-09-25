// -components/event-type-card.tsx

import { Gift } from "lucide-react";

import {
	Card,
	CardContent,
} from "@muxima/ui/components/card";
import { Badge } from "@muxima/ui/components/badge";

interface EventTypeCardProps {
	type: "WEDDING" | "ENGAGEMENT";
}

export function EventTypeBadge({ type }: EventTypeCardProps) {
	return (
		<Badge variant="secondary" className="inline-flex items-center gap-1.5 px-2.5 py-1" >
			<span> {type === "WEDDING" ? "Casamento" : "Noivado"}
			</span>
		</Badge>
	);
}