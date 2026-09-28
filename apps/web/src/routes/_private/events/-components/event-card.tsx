import { Badge } from "@muxima/ui/components/badge";
import { Button } from "@muxima/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Calendar, MapPin, Trash2 } from "lucide-react";
import { StatusDot } from "@/shared/components/status-dot";
import { dateHelper } from "@/shared/utils/date-helper";
import { getDaysRemaining } from "@/utils/format-date";
import { getStatusLabel, getStatusTone } from "@/utils/status-helpers";
import type { EventListItem } from "../-types/events.types";

/** `DRAFT` is the status the API falls back to, mirrored from the card grid. */
const FALLBACK_STATUS = "DRAFT";

export function EventCard({
	event,
	onDelete,
}: {
	event: EventListItem;
	onDelete: (eventId: string) => void;
}) {
	// Over RPC a Date arrives as a string; `dateHelper` accepts both.
	const eventDate = event.eventDate ? String(event.eventDate) : null;
	const daysRemaining = eventDate ? getDaysRemaining(eventDate) : null;
	const status = event.status || FALLBACK_STATUS;

	return (
		<Card className="rounded-none">
			<CardHeader className="pb-3">
				<div className="flex items-start justify-between gap-4">
					<div className="min-w-0 space-y-1">
						<CardTitle className="truncate text-base">{event.name}</CardTitle>

						<div className="flex items-center gap-1.5 text-muted-foreground text-xs">
							<Calendar className="h-3.5 w-3.5 shrink-0" />
							<span>
								{eventDate
									? dateHelper.formatShort(eventDate)
									: "Data não definida"}
							</span>
						</div>
					</div>

					<StatusDot
						label={getStatusLabel(status, "event")}
						tone={getStatusTone(status)}
					/>
				</div>
			</CardHeader>

			<CardContent className="space-y-4">
				<div className="space-y-2 text-xs">
					<div className="flex items-center gap-1.5 text-muted-foreground">
						<MapPin className="h-3.5 w-3.5 shrink-0" />
						<span className="truncate">
							{event.venueName || "Local não definido"}
						</span>
					</div>

					{daysRemaining !== null && (
						<div className="text-muted-foreground">
							{daysRemaining > 0
								? `${daysRemaining} dias restantes`
								: daysRemaining === 0
									? "É hoje!"
									: "Evento realizado"}
						</div>
					)}
				</div>

				<div className="flex items-center justify-between border-t pt-3">
					<Button
						variant="ghost"
						size="sm"
						className="h-8 px-2"
						render={
							<Link
								to="/events/$eventId"
								params={{ eventId: String(event.id) }}
							/>
						}
					>
						Ver detalhes
						<ArrowRight size={4} />
					</Button>

					<Button
						variant="ghost"
						size="icon-sm"
						className="text-destructive"
						title="Eliminar evento"
						aria-label="Eliminar evento"
						onClick={() => onDelete(event.id)}
					>
						<Trash2 className="h-3.5 w-3.5" />
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
