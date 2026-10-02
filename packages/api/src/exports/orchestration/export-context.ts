import db from "@muxima/db";

import type {
	ExportActor,
	ExportContext,
	ExportEventInfo,
	ExportFormat,
} from "../core";

/**
 * Builds the `ExportContext` a layout needs.
 *
 * Constructing the context is a single decision point: the event info is read
 * once, the generation instant is stamped once, and both the PDF and the XLSX
 * layout then read the exact same object — so a file's metadata block can never
 * disagree between formats.
 */

export const ANONYMOUS_ACTOR: ExportActor = {
	id: "anonymous",
	name: "Convidado",
	email: null,
};

export function toEventInfo(event: {
	id: string;
	name: string;
	type: string;
	status: string;
	eventDate: Date | null;
	startTime: string | null;
	endTime: string | null;
	venueName: string | null;
	address: string | null;
	municipality: string | null;
	province: string | null;
	capacity: number | null;
	currency: string;
}): ExportEventInfo {
	return {
		id: event.id,
		name: event.name,
		type: event.type,
		status: event.status,
		eventDate: event.eventDate,
		startTime: event.startTime,
		endTime: event.endTime,
		venueName: event.venueName,
		address: event.address,
		municipality: event.municipality,
		province: event.province,
		capacity: event.capacity,
		currency: event.currency,
	};
}

/**
 * Event header for a *public* export, derived from the public projection only.
 *
 * Written field by field on purpose: this is the security boundary for the
 * invitation PDF. Adding a field here means adding it to the public lookup
 * first — it can never be picked up by accident from an admin-shaped row.
 * `capacity` and `currency` are not public, so they stay empty; the invitation
 * report renders no money and no occupancy figures.
 */
export function toPublicEventInfo(event: {
	id: string;
	name: string;
	type: string;
	status: string;
	eventDate: Date | null;
	startTime: string | null;
	endTime: string | null;
	venueName: string | null;
	address: string | null;
	municipality: string | null;
	province: string | null;
}): ExportEventInfo {
	return {
		id: event.id,
		name: event.name,
		type: event.type,
		status: event.status,
		eventDate: event.eventDate,
		startTime: event.startTime,
		endTime: event.endTime,
		venueName: event.venueName,
		address: event.address,
		municipality: event.municipality,
		province: event.province,
		capacity: null,
		currency: "AOA",
	};
}

type ActorInput = { id: string; name: string; email?: string | null };

export function buildExportContext(input: {
	reportName: string;
	format: ExportFormat;
	actor: ActorInput;
	event?: ExportEventInfo | null;
	meta?: { label: string; value: string }[];
	anonymous?: boolean;
	generatedAt?: Date;
}): ExportContext {
	return {
		reportName: input.reportName,
		format: input.format,
		generatedAt: input.generatedAt ?? new Date(),
		actor: input.actor,
		event: input.event ?? null,
		meta: input.meta,
		anonymous: input.anonymous,
	};
}

/** Loads the event header used by both the metadata block and the file name. */
export async function loadEventInfo(
	eventId: string,
): Promise<ExportEventInfo | null> {
	const event = await db.event.findUnique({
		where: { id: eventId },
		select: {
			id: true,
			name: true,
			type: true,
			status: true,
			eventDate: true,
			startTime: true,
			endTime: true,
			venueName: true,
			address: true,
			municipality: true,
			province: true,
			capacity: true,
			currency: true,
		},
	});
	return event ? toEventInfo(event) : null;
}
