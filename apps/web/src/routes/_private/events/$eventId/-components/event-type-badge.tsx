// -components/event-type-card.tsx

import type { EventType } from "@muxima/api/shared/types/entities";

import { Badge } from "@muxima/ui/components/badge";

interface EventTypeCardProps {
	type: EventType;
}

const TYPE_LABELS: Record<EventType, string> = {
	WEDDING: "Casamento",
	ENGAGEMENT: "Noivado",
	BIRTHDAY: "Aniversário",
	CONFERENCE: "Conferência",
	WORKSHOP: "Workshop",
	GRADUATION: "Formatura",
	DINNER: "Jantar",
	CORPORATE: "Evento",
	BABY_SHOWER: "Chá de bebé",
	CEREMONY: "Celebração",
	PARTY: "Festa",
};

export function EventTypeBadge({ type }: EventTypeCardProps) {
	return (
		<Badge
			variant="secondary"
			className="inline-flex items-center gap-1.5 px-2.5 py-1"
		>
			<span>{TYPE_LABELS[type] ?? type}</span>
		</Badge>
	);
}
