import db from "@muxima/db";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ExportActor } from "../../../exports/core/export-context";
import { buildInvitationPdf } from "../../../exports/invitation";
import { buildExportContext } from "../../../exports/orchestration/export-context";
import { contentDisposition } from "../../../exports/orchestration/export-service";
import {
	publicInvitationExportLimiter,
	rateLimitKey,
} from "../../../shared/auth/rate-limit";
import { NotFoundError } from "../../../shared/errors/app-error";
import { INVITATION_CODES } from "../../../shared/errors/codes";
import { getPublicInvitation, getPublicSchedule } from "../service";

const ANONYMOUS_ACTOR: ExportActor = {
	id: "anonymous",
	name: "Anónimo",
	email: null,
};

/** `?inline=1` opens the file in the browser instead of downloading it. */
function wantsInline(request: FastifyRequest): boolean {
	const query = request.query as { inline?: unknown } | undefined;
	return query?.inline === "1" || query?.inline === "true";
}

function notFound(message: string): NotFoundError {
	return new NotFoundError(message, { code: INVITATION_CODES.NOT_FOUND });
}

export async function invitationPublicRoutes(app: FastifyInstance) {
	app.get(
		"/api/public/invitations/:code/export/pdf",
		async (request, reply) => {
			const { code } = request.params as { code: string };

			// F-18: public, unauthenticated PDF render, so the budget is tight
			// and keyed per endpoint + IP (not per code, which a scanner could
			// rotate to bypass the limit).
			publicInvitationExportLimiter.check(
				rateLimitKey({
					endpoint: "public.invitations.export.pdf",
					method: request.method,
					ip: request.ip,
				}),
			);

			const [lookup, scheduleLookup] = await Promise.all([
				getPublicInvitation(db, code),
				getPublicSchedule(db, code),
			]);

			if (lookup.result !== "AVAILABLE") {
				throw notFound("Convite não encontrado");
			}

			const context = buildExportContext({
				reportName: "Convite",
				format: "pdf",
				actor: ANONYMOUS_ACTOR,
				event: {
					id: lookup.invitation.event.id,
					name: lookup.invitation.event.name,
					type: lookup.invitation.event.type,
					status: lookup.invitation.event.status,
					eventDate: lookup.invitation.event.eventDate,
					startTime: lookup.invitation.event.startTime,
					endTime: lookup.invitation.event.endTime,
					venueName: lookup.invitation.event.venueName,
					address: lookup.invitation.event.address,
					municipality: lookup.invitation.event.municipality,
					province: lookup.invitation.event.province,

					capacity: null,
					currency: "AOA",
				},
				anonymous: true,
			});

			const pdf = await buildInvitationPdf({
				lookup,
				schedule:
					scheduleLookup.result === "AVAILABLE" ? scheduleLookup.items : [],
				generatedAt: context.generatedAt,
			});

			return reply
				.header("Content-Type", "application/pdf")
				.header(
					"Content-Disposition",
					contentDisposition("muxima-convite.pdf", wantsInline(request)),
				)
				.header("Content-Length", pdf.length)
				.header("Cache-Control", "no-store")
				.send(pdf);
		},
	);
}
