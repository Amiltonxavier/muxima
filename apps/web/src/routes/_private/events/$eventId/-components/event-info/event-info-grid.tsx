import { Calendar, Clock, MapPin, Users } from "lucide-react";
import { dateHelper } from "@/shared/utils/date-helper";
import { EventInfoItem } from "./event-info-item";

interface EventInfoGridProps {
	event: {
		eventDate?: string | Date | null;
		startTime?: string | null;
		endTime?: string | null;
		venueName?: string | null;
		capacity?: number | null;
	};
}

export function EventInfoGrid({ event }: EventInfoGridProps) {
	const eventTime =
		event.startTime && event.endTime
			? `${event.startTime} — ${event.endTime}`
			: event.startTime || "Não definido";

	return (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<EventInfoItem
				icon={Calendar}
				label="Data"
				value={
					event.eventDate
						? dateHelper.formatShort(String(event.eventDate))
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
