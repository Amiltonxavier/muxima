import { Calendar, Clock, MapPin } from "lucide-react";
import { formatDate } from "@/utils/format-date";
import type { ViewInvitationEvent } from "../../-types/guest.types";

export function InvitationEventDetails({
	event,
}: {
	event: ViewInvitationEvent;
}) {
	return (
		<section>
			<h3 className="mb-3 font-semibold text-sm">Informações do evento</h3>
			<div className="divide-y border-y">
				{event.eventDate && (
					<div className="flex items-center justify-between py-3">
						<div className="flex items-center gap-2.5">
							<Calendar className="h-4 w-4 text-muted-foreground" />
							<span className="text-muted-foreground text-sm">Data</span>
						</div>
						<span className="font-medium text-sm">
							{formatDate(String(event.eventDate))}
						</span>
					</div>
				)}
				{(event.startTime || event.endTime) && (
					<div className="flex items-center justify-between py-3">
						<div className="flex items-center gap-2.5">
							<Clock className="h-4 w-4 text-muted-foreground" />
							<span className="text-muted-foreground text-sm">Horário</span>
						</div>
						<span className="font-medium text-sm">
							{event.startTime ? String(event.startTime) : "—"}
							{event.endTime ? ` — ${String(event.endTime)}` : ""}
						</span>
					</div>
				)}
				{event.venueName && (
					<div className="flex items-start justify-between gap-4 py-3">
						<div className="flex items-start gap-2.5">
							<MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
							<div>
								<p className="text-muted-foreground text-sm">Local</p>
								<p className="mt-0.5 font-medium text-sm">
									{String(event.venueName)}
								</p>
							</div>
						</div>
						{event.address && (
							<p className="max-w-[220px] text-right text-muted-foreground text-xs leading-relaxed">
								{String(event.address)}
								{event.neighborhood ? `, ${String(event.neighborhood)}` : ""}
								{event.municipality ? ` — ${String(event.municipality)}` : ""}
								{event.province ? `, ${String(event.province)}` : ""}
							</p>
						)}
					</div>
				)}
			</div>
		</section>
	);
}
