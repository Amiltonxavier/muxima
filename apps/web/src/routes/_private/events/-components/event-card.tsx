import { Badge } from "@muxima/ui/components/badge";
import { Button } from "@muxima/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { Link } from "@tanstack/react-router";
import {
	ArrowRight,
	Calendar,
	Check,
	Loader2,
	MapPin,
	Trash2,
	X,
} from "lucide-react";
import { StatusDot } from "@/shared/components/status-dot";
import { dateHelper } from "@/shared/utils/date-helper";
import { getDaysRemaining } from "@/utils/format-date";
import {
	getStatusLabel,
	getStatusTone,
	MEMBER_ROLE_LABELS,
} from "@/utils/status-helpers";
import type { EventListItem } from "../-types/events.types";

/** `DRAFT` is the status the API falls back to, mirrored from the card grid. */
const FALLBACK_STATUS = "DRAFT";

/**
 * One card in the grid.
 *
 * An event the viewer was invited to (but has not accepted) carries an
 * `invitation`: it is previewable but still guarded, so the card offers
 * Accept/Decline instead of a "Ver detalhes" link that would only reach a 403.
 */
export function EventCard({
	event,
	onDelete,
	onAccept,
	onDecline,
	invitePendingId,
}: {
	event: EventListItem;
	onDelete: (eventId: string) => void;
	onAccept?: (event: EventListItem) => void;
	onDecline?: (event: EventListItem) => void;
	/** Id of the invite whose accept/decline request is in flight. */
	invitePendingId?: string;
}) {
	// Over RPC a Date arrives as a string; `dateHelper` accepts both.
	const daysRemaining = event.eventDate
		? getDaysRemaining(event.eventDate)
		: null;
	const status = event.status || FALLBACK_STATUS;

	const invitation = event.invitation;
	const isInvite = invitation !== null;
	const pending = isInvite && invitation.id === invitePendingId;
	const roleLabel = invitation
		? (MEMBER_ROLE_LABELS[invitation.role] ?? invitation.role)
		: null;

	return (
		<Card className="rounded-none">
			<CardHeader className="pb-3">
				<div className="flex items-start justify-between gap-4">
					<div className="min-w-0 space-y-1">
						<CardTitle className="truncate text-base">{event.name}</CardTitle>

						<div className="flex items-center gap-1.5 text-muted-foreground text-xs">
							<Calendar className="h-3.5 w-3.5 shrink-0" />
							<span>
								{event.eventDate
									? dateHelper.formatShort(event.eventDate)
									: "Data não definida"}
							</span>
						</div>
					</div>

					{isInvite ? (
						<Badge className="shrink-0 bg-amber-50 text-amber-700">
							Convite pendente
						</Badge>
					) : (
						<StatusDot
							label={getStatusLabel(status, "event")}
							tone={getStatusTone(status)}
						/>
					)}
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

					{isInvite ? (
						<div className="text-muted-foreground">
							Convidámos-te como <strong>{roleLabel}</strong>. Aceita para
							entrar no evento.
						</div>
					) : (
						daysRemaining !== null && (
							<div className="text-muted-foreground">
								{daysRemaining > 0
									? `${daysRemaining} dias restantes`
									: daysRemaining === 0
										? "É hoje!"
										: "Evento realizado"}
							</div>
						)
					)}
				</div>

				{isInvite ? (
					<div className="flex items-center gap-2 border-t pt-3">
						<Button
							size="sm"
							className="flex-1"
							disabled={pending}
							onClick={() => onAccept?.(event)}
						>
							{pending ? (
								<Loader2 className="h-3.5 w-3.5 animate-spin" />
							) : (
								<Check className="h-3.5 w-3.5" />
							)}
							Aceitar
						</Button>
						<Button
							variant="outline"
							size="sm"
							className="flex-1"
							disabled={pending}
							onClick={() => onDecline?.(event)}
						>
							<X className="h-3.5 w-3.5" />
							Recusar
						</Button>
					</div>
				) : (
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
				)}
			</CardContent>
		</Card>
	);
}
