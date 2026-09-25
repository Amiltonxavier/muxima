import { Badge } from "@muxima/ui/components/badge";
import { Button } from "@muxima/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { Link } from "@tanstack/react-router";
import { Calendar, MapPin } from "lucide-react";
import { dateHelper } from "@/shared/utils/date-helper";
import { getStatusColor, getStatusLabel } from "@/utils/status-helpers";

interface EventCardProps {
	event: Record<string, unknown>;
}

export function EventCard({ event }: EventCardProps) {
	return (
		<Card
			key={event.id as string}
			className="transition-shadow hover:shadow-md"
		>
			<CardHeader>
				<div className="flex items-start justify-between">
					<div className="space-y-1">
						<CardTitle>{event.name as string}</CardTitle>
						<Badge variant="outline" className="mt-1">
							{event.type === "WEDDING" ? "Casamento" : "Noivado"}
						</Badge>
					</div>
					<Badge
						className={getStatusColor((event.status as string) || "DRAFT")}
					>
						{getStatusLabel((event.status as string) || "DRAFT", "event")}
					</Badge>
				</div>
			</CardHeader>
			<CardContent>
				<div className="space-y-3">
					<div className="flex items-center gap-2 text-muted-foreground text-xs">
						<Calendar className="h-3 w-3" />
						<span>
							{/*event.eventDate
                                                        ? formatDate(event.eventDate as string)
                                                        : "Sem data"*/}
						</span>
					</div>
					{Boolean(event.venueName) && (
						<div className="flex items-center gap-2 text-muted-foreground text-xs">
							<MapPin className="h-3 w-3" />
							<span>{String(event.venueName || "")}</span>
						</div>
					)}

					<div className="text-muted-foreground text-xs">
						{dateHelper.formatRelativeToNow(event.eventDate as string)}
					</div>

					<div className="pt-2">
						<Button
							className="w-full"
							render={
								<Link
									to="/events/$eventId"
									params={{ eventId: String(event.id) }}
								/>
							}
						>
							Gerir evento →
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
