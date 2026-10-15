import { Calendar, Clock, MapPin, Users } from "lucide-react";
import { dateHelper } from "@/shared/utils/date-helper";
import { EventBudgetPlannedCard } from "./event-budget-planned-card";
import { EventInfoItem } from "./event-info-item";

interface EventInfoGridProps {
	eventId: string;
	event: {
		eventDate?: string | Date | null;
		startTime?: string | null;
		endTime?: string | null;
		venueName?: string | null;
		capacity?: number | null;
	};
}

/**
 * Bento layout: the budget hero spans the whole left half (2 columns × 2 rows)
 * while the four factual items fill the right half in a 2×2 stack.
 */
export function EventInfoGrid({ eventId, event }: EventInfoGridProps) {
	const eventTime =
		event.startTime && event.endTime
			? `${event.startTime} — ${event.endTime}`
			: event.startTime || "Não definido";

	return (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			{/*<EventBudgetPlannedCard eventId={eventId} />*/}

			<EventInfoItem
				icon={Calendar}
				label="Data"
				value={
					event.eventDate
						? dateHelper.formatShort(event.eventDate)
						: "Não definida"
				}
			/>

			<EventInfoItem icon={Clock} label="Horário" value={eventTime} />

			<EventInfoItem
				icon={MapPin}
				label="Local"
				value={event.venueName || "Não definido"}
			/>

			<EventInfoItem
				icon={Users}
				label="Capacidade"
				value={event.capacity ? `${event.capacity} convidados` : "Não definida"}
			/>
		</div>
	);
}
