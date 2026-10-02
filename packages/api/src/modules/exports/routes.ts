import db from "@muxima/db";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
	type ExportFormat,
	ExportNotSupportedError,
	getReportName,
	isEventExportModule,
	sendExport,
} from "../../exports";
import type { ExportActor } from "../../exports/core";
import {
	ANONYMOUS_ACTOR,
	buildExportContext,
	loadEventInfo,
	toPublicEventInfo,
} from "../../exports/orchestration/export-context";
import { NotFoundError } from "../../shared/errors/app-error";
import { DedicationService } from "../dedication/service";
import { getPublicInvitation, getPublicSchedule } from "../invitations/service";

/**
 * Export routes.
 *
 * Three entry points, three authorization stories:
 *
 * - `/events/:eventId/exports/:module/:format` — private. Requires an active
 *   membership; the module list is a closed allowlist, so an unknown module is a
 *   404 rather than a pass-through to any builder.
 * - `/events/:eventId/dedications/:dedicationId/export/pdf` — private and
 *   scoped to one dedication. `DedicationService.getForExport` applies the same
 *   owner-or-viewer rule as reading one, so there is no global dedication export
 *   to leak through.
 * - `/public/invitations/:code/export/pdf` — public. No session required, and
 *   the report is built exclusively from the public lookup projection, which is
 *   structurally incapable of carrying private fields.
 */

const FORMATS: ExportFormat[] = ["pdf", "xlsx"];

function isFormat(value: string): value is ExportFormat {
	return FORMATS.includes(value as ExportFormat);
}

type SessionUser = { id: string; name?: string; email?: string | null };

/** `?inline=1` opens the file in the browser instead of downloading it. */
function wantsInline(request: FastifyRequest): boolean {
	const query = request.query as { inline?: unknown } | undefined;
	return query?.inline === "1" || query?.inline === "true";
}

function requireSessionUser(request: FastifyRequest): SessionUser | undefined {
	return request.session?.user as SessionUser | undefined;
}

/**
 * 401 unless the caller has an active membership in the event.
 *
 * The failure is a `NotFoundError` on purpose: a caller with no membership must
 * not be able to tell an existing event from a missing one, so the export route
 * answers exactly what the event route would.
 */
async function assertMember(userId: string, eventId: string): Promise<void> {
	const membership = await db.eventMember.findFirst({
		where: { eventId, userId, status: "ACTIVE" },
		select: { id: true },
	});
	if (!membership) {
		throw new NotFoundError("Evento não encontrado");
	}
}

function actorOf(user: SessionUser): ExportActor {
	return {
		id: user.id,
		name: user.name ?? "Utilizador",
		email: user.email ?? null,
	};
}

function notFound(reply: FastifyReply, message: string) {
	return reply.status(404).send({ error: { code: "NOT_FOUND", message } });
}

export async function exportRoutes(app: FastifyInstance) {
	// ── Private, per-event module exports ─────────────────────────

	app.get(
		"/api/v1/events/:eventId/exports/:module/:format",
		async (request, reply) => {
			const user = requireSessionUser(request);
			if (!user) {
				return reply.status(401).send({
					error: { code: "UNAUTHORIZED", message: "Unauthorized" },
				});
			}

			const { eventId, module, format } = request.params as {
				eventId: string;
				module: string;
				format: string;
			};

			if (!isEventExportModule(module) || !isFormat(format)) {
				return notFound(reply, "Relatório não disponível");
			}

			await assertMember(user.id, eventId);

			const event = await loadEventInfo(eventId);
			if (!event) {
				return notFound(reply, "Evento não encontrado");
			}

			const reportName = getReportName(module, format);
			if (!reportName) {
				return notFound(reply, "Relatório não disponível neste formato");
			}

			const context = buildExportContext({
				reportName,
				format,
				actor: actorOf(user),
				event,
			});

			try {
				return await sendExport(reply, module, format, { eventId }, context, {
					inline: wantsInline(request),
				});
			} catch (error) {
				if (error instanceof ExportNotSupportedError) {
					return notFound(reply, "Relatório não disponível neste formato");
				}
				throw error;
			}
		},
	);

	// ── Private, single dedication (PDF only) ─────────────────────

	app.get(
		"/api/v1/events/:eventId/dedications/:dedicationId/export/pdf",
		async (request, reply) => {
			const user = requireSessionUser(request);
			if (!user) {
				return reply.status(401).send({
					error: { code: "UNAUTHORIZED", message: "Unauthorized" },
				});
			}

			const { eventId, dedicationId } = request.params as {
				eventId: string;
				dedicationId: string;
			};

			// Same owner-or-viewer authorization as reading the dedication.
			// Throws Forbidden/NotFound before any report is built.
			const dedication = await DedicationService.getForExport(db, {
				eventId,
				dedicationId,
				userId: user.id,
			});

			const event = await loadEventInfo(eventId);
			const context = buildExportContext({
				reportName: "Dedicatória",
				format: "pdf",
				actor: actorOf(user),
				event,
			});

			return await sendExport(
				reply,
				"dedication",
				"pdf",
				{ dedication },
				context,
			);
		},
	);

	// ── Public invitation (PDF only) ──────────────────────────────

	app.get(
		"/api/public/invitations/:code/export/pdf",
		async (request, reply) => {
			const { code } = request.params as { code: string };

			const [lookup, scheduleLookup] = await Promise.all([
				getPublicInvitation(db, code),
				getPublicSchedule(db, code),
			]);

			// Unavailable codes stay indistinguishable from each other, so this
			// endpoint cannot be used to enumerate invitation codes.
			if (lookup.result !== "AVAILABLE") {
				return notFound(reply, "Convite não encontrado");
			}

			// Event info comes from the public projection, so the header and the
			// file name carry the event name without any extra query.
			const context = buildExportContext({
				reportName: "Convite",
				format: "pdf",
				actor: ANONYMOUS_ACTOR,
				event: toPublicEventInfo(lookup.invitation.event),
				anonymous: true,
			});

			return await sendExport(
				reply,
				"invitation",
				"pdf",
				{
					lookup,
					schedule:
						scheduleLookup.result === "AVAILABLE" ? scheduleLookup.items : [],
				},
				context,
				{ inline: wantsInline(request) },
			);
		},
	);
}
