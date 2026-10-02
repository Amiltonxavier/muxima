import { generateInvitationQrCodePng } from "../../modules/invitations/qr-code";
import type { PublicInvitationLookup } from "../../shared/types/entities";
import type { ExportContext } from "../core/export-context";
import { formatDate, formatDateTime, formatTime } from "../core/format";
import type {
	ReportColumn,
	ReportDefinition,
	ReportRow,
	ReportSection,
} from "../core/report-definition";
import {
	labelEventType,
	labelGuestStatus,
	labelRsvpStatus,
} from "../core/report-labels";

/**
 * Public invitation report.
 *
 * Built from `PublicInvitationLookup` — the exact projection the public invite
 * page already receives. That is the guarantee that no administrative field can
 * leak: there is nothing else on this input to render.
 */

const GUEST_COLUMNS: ReportColumn[] = [
	{ header: "Convidado", key: "name", weight: 2.4 },
	{ header: "Estado", key: "status", weight: 1.2 },
	{ header: "Acompanhantes", key: "companions", weight: 2.4 },
];

const SCHEDULE_COLUMNS: ReportColumn[] = [
	{ header: "Início", key: "startAt", type: "datetime", weight: 1.4 },
	{ header: "Atividade", key: "title", weight: 2.4 },
	{ header: "Fim", key: "endAt", type: "datetime", weight: 1.4 },
	{ header: "Local", key: "location", weight: 1.6 },
	{ header: "Descrição", key: "description", weight: 2.4 },
];

export type BuildInvitationReportInput = {
	lookup: PublicInvitationLookup;
	schedule: {
		title: string;
		description: string | null;
		startAt: Date;
		endAt: Date | null;
		location: string | null;
	}[];
	/** Unused today; the public renderer needs no actor. Kept for the build signature. */
	context?: ExportContext;
};

/** Square PNG, sized to stay crisp in print and on a projected screen. */
const QR_SIZE = 120;

/**
 * The QR Code is drawn from the invitation's own public URL — the exact payload
 * the SVG on the web page encodes — so the printed code can never lead anywhere
 * else. `qrCode === null` means the invitation predates the QR feature and has
 * not been backfilled yet; the section is then omitted rather than faked.
 */
async function qrSection(invitation: {
	url: string | null;
	qrCode: string | null;
}): Promise<Extract<ReportSection, { kind: "image" }> | null> {
	if (!invitation.qrCode || !invitation.url) return null;

	try {
		return {
			kind: "image",
			title: "QR Code de acesso",
			image: {
				data: await generateInvitationQrCodePng(invitation.url),
				format: "png",
				width: QR_SIZE,
				height: QR_SIZE,
				caption: "Aponte a câmara para abrir o convite",
				alt: invitation.url,
			},
		};
	} catch {
		// A QR Code is a convenience; failing to rasterise one must not cost the
		// guest the rest of the invitation.
		return null;
	}
}

export async function buildInvitationReport({
	lookup,
	schedule,
}: BuildInvitationReportInput): Promise<ReportDefinition> {
	if (lookup.result !== "AVAILABLE") {
		// The caller only reaches this for AVAILABLE lookups; a defensive report
		// keeps the renderer total instead of throwing on an impossible state.
		return {
			title: "Convite",
			sections: [
				{
					kind: "paragraphs",
					paragraphs: ["Convite indisponível."],
				},
			],
		};
	}

	const invitation = lookup.invitation;
	const event = invitation.event;

	const guestRows: ReportRow[] = invitation.guests.map((guest) => ({
		name: guest.name,
		status: labelGuestStatus(guest.status),
		companions:
			guest.companions.map((companion) => companion.name).join(", ") || "—",
	}));

	const scheduleRows: ReportRow[] = schedule.map((item) => ({
		startAt: item.startAt,
		title: item.title,
		endAt: item.endAt,
		location: item.location ?? "—",
		description: item.description ?? "—",
	}));

	const qr = await qrSection(invitation);

	return {
		title: "Convite",
		subtitle: `${labelEventType(event.type)} · ${event.name}`,
		sections: [
			{
				kind: "pairs",
				title: "O evento",
				items: [
					{ label: "Casal / evento", value: event.name },
					{ label: "Tipo", value: labelEventType(event.type) },
					{ label: "Data", value: formatDate(event.eventDate) },
					{
						label: "Hora",
						value: `${formatTime(event.startTime)}${event.endTime ? ` – ${formatTime(event.endTime)}` : ""}`,
					},
					{ label: "Local", value: event.venueName ?? "—" },
					{
						label: "Endereço",
						value:
							[
								event.address,
								event.neighborhood,
								event.municipality,
								event.province,
							]
								.filter(Boolean)
								.join(", ") || "—",
					},
				],
			},
			{
				kind: "pairs",
				title: "Convidados",
				items: [
					{
						label: "Nomes",
						value:
							invitation.guests.map((guest) => guest.name).join(", ") || "—",
					},
					{
						label: "Acompanhantes",
						value:
							invitation.guests
								.flatMap((guest) => guest.companions)
								.map((companion) => companion.name)
								.join(", ") || "—",
					},
					{
						label: "Estado do convite",
						value: labelRsvpStatus(invitation.rsvpStatus),
					},
					{
						label: "Resposta",
						value: invitation.respondedAt
							? formatDateTime(invitation.respondedAt)
							: "Por responder",
					},
				],
			},
			{
				kind: "table",
				title: "Lista de convidados",
				sheetName: "Convidados",
				columns: GUEST_COLUMNS,
				rows: guestRows,
				emptyMessage: "Sem convidados associados.",
			},
			{
				kind: "table",
				title: "Programa do evento",
				sheetName: "Programa",
				columns: SCHEDULE_COLUMNS,
				rows: scheduleRows,
				emptyMessage: "O programa ainda não foi publicado.",
			},
			{
				kind: "paragraphs",
				title: "Notas",
				paragraphs: event.description ? [event.description] : [],
			},
			...(qr ? [qr] : []),
		],
	};
}
