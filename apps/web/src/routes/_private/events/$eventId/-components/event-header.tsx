// -components/event-header.tsx

import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@muxima/ui/components/button";

import { BackButton } from "@/shared/components/back-to";

import { UpdateEventStatus } from "./update-event-status";
import { EventTypeBadge } from "./event-type-badge";
import { EventType } from "@muxima/api/shared/types/entities";

interface EventHeaderProps {
	eventId: string;
	name: string;
	type: EventType
	description?: string | null;
	status: "DRAFT" | "PLANNING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
	onEdit: () => void;
	onDelete: () => void;
}

export function EventHeader({
	eventId,
	name,
	description,
	status,
	onEdit,
	type,
	onDelete,
}: EventHeaderProps) {
	return (
		<div className="flex items-start justify-between">
			<div className="space-y-1">
				<BackButton to="/events" label="Eventos" />

				<div className="flex items-center gap-3">
					<h1 className="font-semibold text-2xl">{name}</h1>
					<EventTypeBadge type={type} />

					<UpdateEventStatus
						eventId={eventId}
						status={status}
					/>
					
				</div>

				{description && (
					<p className="max-w-2xl text-muted-foreground text-sm">
						{description}
					</p>
				)}

			</div>

			<div className="flex gap-2">
				<Button variant="outline" size="sm" onClick={onEdit}>
					<Pencil className="mr-2 h-3.5 w-3.5" />
					Editar
				</Button>

				<Button variant="destructive" size="sm" onClick={onDelete}>
					<Trash2 className="mr-2 h-3.5 w-3.5" />
					Eliminar
				</Button>
			</div>
		</div>
	);
}