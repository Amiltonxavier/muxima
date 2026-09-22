import type { PublicInvitation } from "@muxima/api/shared/types/entities";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { CalendarHeart, MapPin } from "lucide-react";
import { formatDate, formatTime } from "@/utils/format-date";

export function EventDetails({ invitation }: { invitation: PublicInvitation }) {
	const { event } = invitation;

	const location = [
		event.venueName,
		event.address,
		event.neighborhood,
		event.municipality,
		event.province,
	]
		.filter(Boolean)
		.join(", ");

	return (
		<Card>
			<CardHeader>
				<CardTitle>Detalhes do evento</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				{event.eventDate && (
					<div className="flex items-start gap-3">
						<CalendarHeart className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
						<div>
							<p className="text-sm font-medium">
								{formatDate(event.eventDate)}
								{event.startTime &&
									` às ${formatTime(`2000-01-01T${event.startTime}`)}`}
							</p>
							{event.endTime && (
								<p className="text-muted-foreground text-xs">
									Até às {formatTime(`2000-01-01T${event.endTime}`)}
								</p>
							)}
						</div>
					</div>
				)}

				{location && (
					<div className="flex items-start gap-3">
						<MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
						<p className="text-sm">{location}</p>
					</div>
				)}

				{event.description && (
					<p className="border-t pt-3 text-muted-foreground text-sm">
						{event.description}
					</p>
				)}
			</CardContent>
		</Card>
	);
}