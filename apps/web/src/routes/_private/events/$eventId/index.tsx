import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useEvent } from "../-queries/event-queries";
import { EventPreparationAnalytics } from "./-components/analytics/event-preparation-analytics";
import { DeleteEvent } from "./-components/delete-event";
import { EditEventDialog } from "./-components/edit-event-dialog";
import { EventCharts } from "./-components/event-charts";
import { EventDetailSkeleton } from "./-components/event-detail-skeleton";
import { EventHeader } from "./-components/event-header";
import { EventInfoGrid } from "./-components/event-info/event-info-grid";
import { EventLocation } from "./-components/event-location";
import { EventMembers } from "./-components/event-members";
import { EventNotFound } from "./-components/event-not-found";
import { EventStats } from "./-components/event-stats";

export const Route = createFileRoute("/_private/events/$eventId/")({
	component: EventDetailPage,
});

function EventDetailPage() {
	const { eventId } = Route.useParams();

	const eventQuery = useEvent(eventId);

	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [showEditDialog, setShowEditDialog] = useState(false);

	if (eventQuery.isLoading) {
		return <EventDetailSkeleton />;
	}

	if (eventQuery.isError || !eventQuery.data) {
		return <EventNotFound />;
	}

	const event = eventQuery.data;
	const members = event.members ?? [];

	return (
		<div className="space-y-6">
			<EventHeader
				eventId={eventId}
				name={event.name}
				type={event.type}
				description={event.description}
				status={event.status}
				onEdit={() => setShowEditDialog(true)}
				onDelete={() => setShowDeleteDialog(true)}
			/>

			<EventInfoGrid event={event} />

			<EventLocation
				address={event.address}
				neighborhood={event.neighborhood}
				municipality={event.municipality}
				province={event.province}
				reference={event.reference}
			/>

			<EventStats eventId={eventId} />

			<EventCharts eventId={eventId} />

			<EventPreparationAnalytics eventId={eventId} />

			<EventMembers members={members} />

			{showEditDialog && (
				<EditEventDialog
					open={showEditDialog}
					onOpenChange={() => setShowEditDialog(false)}
					event={event}
					eventId={eventId}
				/>
			)}

			{showDeleteDialog && (
				<DeleteEvent
					open={showDeleteDialog}
					onOpenChange={() => setShowDeleteDialog(false)}
					eventName={event.name}
					eventId={eventId}
				/>
			)}
		</div>
	);
}
