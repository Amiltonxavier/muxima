import db from "@muxima/db";

import { getGuestAnalytics } from "../../modules/guests/analytics";
import type { ExportContext } from "../core/export-context";
import { formatNumber } from "../core/format";
import type {
	ReportColumn,
	ReportDefinition,
	ReportRow,
} from "../core/report-definition";
import {
	labelCompanionStatus,
	labelGuestStatus,
	labelGuestType,
	labelRsvpStatus,
} from "../core/report-labels";

/**
 * Guests report.
 *
 * Returns all guests and companions that belong to the event — pagination of the
 * UI never truncates the exported report. The backend decides the dataset.
 */

const GUEST_COLUMNS: ReportColumn[] = [
	{ header: "Nome", key: "name", weight: 2.4 },
	{ header: "Contacto", key: "contact", weight: 1.6 },
	{ header: "Grupo", key: "group", weight: 1 },
	{ header: "Tipo", key: "type", weight: 0.9 },
	{ header: "Estado", key: "status", weight: 0.9 },
	{
		header: "Acompanhantes autorizados",
		key: "companionsLimit",
		type: "number",
		align: "right",
		weight: 0.7,
	},
	{
		header: "Acompanhantes confirmados",
		key: "companionsConfirmed",
		type: "number",
		align: "right",
		weight: 0.7,
	},
	{ header: "RSVP", key: "rsvp", weight: 0.8 },
	{ header: "Criado em", key: "createdAt", type: "datetime", weight: 1.2 },
];

const COMPANION_COLUMNS: ReportColumn[] = [
	{ header: "Acompanhante", key: "name", weight: 2.2 },
	{ header: "Convidado", key: "guest", weight: 2 },
	{ header: "Estado", key: "status", weight: 1 },
	{ header: "Criado em", key: "createdAt", type: "datetime", weight: 1.2 },
];

export async function buildGuestsReport(
	eventId: string,
	_context: ExportContext,
): Promise<ReportDefinition> {
	const [analytics, guests] = await Promise.all([
		getGuestAnalytics(db, eventId),
		db.guest.findMany({
			where: { eventId },
			include: {
				companions: true,
				invitationGuests: {
					take: 1,
					orderBy: { invitation: { createdAt: "desc" } },
					select: {
						invitation: { select: { rsvpStatus: true } },
					},
				},
			},
			orderBy: { createdAt: "asc" },
		}),
	]);

	const guestRows: ReportRow[] = guests.map((guest) => {
		const invitation = guest.invitationGuests[0]?.invitation;
		const confirmedCompanions = guest.companions.filter(
			(c) => c.status === "CONFIRMED",
		).length;

		return {
			name: guest.name,
			contact: [guest.email, guest.phone].filter(Boolean).join(" • ") || "—",
			group: guest.group ?? "—",
			type: labelGuestType(guest.type),
			status: labelGuestStatus(guest.status),
			companionsLimit: guest.companionsLimit,
			companionsConfirmed: confirmedCompanions,
			rsvp: labelRsvpStatus(invitation?.rsvpStatus ?? "PENDING"),
			createdAt: guest.createdAt,
		};
	});

	const companionRows: ReportRow[] = guests
		.flatMap((guest) =>
			guest.companions.map((companion) => ({
				name: companion.name,
				guest: guest.name,
				status: labelCompanionStatus(companion.status),
				createdAt: companion.createdAt,
			})),
		)
		.sort((a, b) => {
			const aDate =
				a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
			const bDate =
				b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
			return aDate.getTime() - bDate.getTime();
		});

	const totalConfirmedPeople = analytics.totalConfirmedPeople;

	return {
		title: "Relatório de Convidados",
		subtitle:
			"Lista completa de convidados, acompanhantes e estado de confirmação",
		sections: [
			{
				kind: "kpis",
				title: "Resumo",
				items: [
					{
						label: "Total de convidados",
						value: formatNumber(analytics.totalGuests),
					},
					{ label: "Confirmados", value: formatNumber(analytics.confirmed) },
					{ label: "Pendentes", value: formatNumber(analytics.pending) },
					{ label: "Recusados", value: formatNumber(analytics.declined) },
					{
						label: "Acompanhantes (confirmados/total)",
						value: `${formatNumber(analytics.confirmedCompanions)} / ${formatNumber(analytics.totalCompanions)}`,
					},
					{
						label: "Pessoas confirmadas",
						value: formatNumber(totalConfirmedPeople),
					},
					{
						label: "Taxa de confirmação",
						value: `${formatNumber(analytics.confirmationRate)}%`,
					},
					{
						label: "Lotação",
						value:
							analytics.capacity > 0
								? `${formatNumber(totalConfirmedPeople)} / ${formatNumber(analytics.capacity)}`
								: "—",
					},
				],
			},
			{
				kind: "table",
				title: "Convidados",
				sheetName: "Convidados",
				columns: GUEST_COLUMNS,
				rows: guestRows,
				emptyMessage: "Nenhum convidado registado.",
			},
			{
				kind: "table",
				title: "Acompanhantes",
				sheetName: "Acompanhantes",
				columns: COMPANION_COLUMNS,
				rows: companionRows,
				emptyMessage: "Nenhum acompanhante registado.",
			},
		],
	};
}
