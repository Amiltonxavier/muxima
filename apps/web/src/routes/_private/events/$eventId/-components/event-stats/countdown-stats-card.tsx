import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { CalendarClock } from "lucide-react";
import { useEvent } from "@/shared/hooks/event-banner-queries";
import { dateHelper } from "@/shared/utils/date-helper";

/**
 * Days-until-the-event card. The phase (upcoming / today / past) is decided
 * from the event date the API returns; the frontend only formats the label.
 */
export function CountdownStatsCard({ eventId }: { eventId: string }) {
	const eventQuery = useEvent(eventId);
	const event = eventQuery.data;

	const eventDate = event?.eventDate
		? dateHelper.getDate(event.eventDate)
		: null;
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const target = eventDate ? new Date(eventDate) : null;
	if (target) target.setHours(0, 0, 0, 0);

	const diffDays = target
		? Math.round((target.getTime() - today.getTime()) / 86_400_000)
		: null;

	const label =
		diffDays === null
			? "Sem data definida"
			: diffDays > 1
				? `Faltam ${diffDays} dias`
				: diffDays === 1
					? "Falta 1 dia"
					: diffDays === 0
						? "É hoje"
						: "Evento realizado";

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-sm">
					<CalendarClock className="h-4 w-4" />
					Contagem decrescente
				</CardTitle>
			</CardHeader>

			<CardContent>
				<p className="font-semibold text-2xl">{label}</p>
				{eventDate && (
					<p className="mt-1 text-muted-foreground text-xs">
						{dateHelper.formatMedium(eventDate)}
					</p>
				)}
			</CardContent>
		</Card>
	);
}
