import db from "@muxima/db";
import { buildChanges, createActivityLog } from "@muxima/db/activity-log";
import type { Prisma } from "@muxima/db/prisma";
import { PERMISSIONS } from "@muxima/permissions";
import { z } from "zod";
import { protectedProcedure } from "../index";
import { syncEventLifecycle } from "../modules/events/lifecycle";
import { notifyEventMilestone } from "../modules/events/proximity-notifier";
import {
	assertMaxGuestsPerInvitationIsRespected,
	MAX_MAX_GUESTS_PER_INVITATION,
	MIN_MAX_GUESTS_PER_INVITATION,
} from "../modules/invitations/capacity";
import { MemberRepository } from "../modules/members/repository";
import {
	buildActivityLog,
	submittedValues,
} from "../shared/activity/activity-context";
import {
	getEventPermissions,
	getEventRole,
	requireEventPermission,
} from "../shared/auth/authorization";
import { NotFoundError, ValidationError } from "../shared/errors/app-error";
import { EVENT_CODES } from "../shared/errors/codes";
import { eventListInput } from "../shared/schemas/filters";
import { getPaginationMeta, parsePagination } from "../shared/utils/helpers";
import { validateTimeString } from "../shared/validation/angola";

/**
 * Horário de parede obrigatório ("HH:mm"), reutilizando o validador já existente
 * em `shared/validation/angola`. `field` só personaliza a mensagem de erro.
 */
function eventTimeSchema(field: "início" | "fim") {
	const required = `O horário de ${field} é obrigatório`;

	return z
		.string({ error: required })
		.min(1, required)
		.refine((v) => validateTimeString(v) === null, {
			message: "Formato de hora inválido. Use HH:mm.",
		});
}

export const eventsRouter = {
	list: protectedProcedure
		.input(eventListInput)
		.handler(async ({ context, input }) => {
			const { page, limit, skip } = parsePagination(input);
			const membershipWhere: Prisma.EventWhereInput = {
				members: {
					some: {
						userId: context.session.user.id,
						status: "ACTIVE",
					},
				},
			};

			const filterConditions: Prisma.EventWhereInput[] = [];

			if (input.search) {
				filterConditions.push({
					OR: [
						{ name: { contains: input.search, mode: "insensitive" } },
						{ venueName: { contains: input.search, mode: "insensitive" } },
						{ description: { contains: input.search, mode: "insensitive" } },
					],
				});
			}

			if (input.status) {
				filterConditions.push({ status: input.status });
			}

			if (input.type) {
				filterConditions.push({ type: input.type });
			}

			const where: Prisma.EventWhereInput = {
				AND: [membershipWhere, ...filterConditions],
			};

			const [events, total] = await Promise.all([
				db.event.findMany({
					where,
					include: {
						members: true,
						budget: true,
					},
					orderBy: { createdAt: "desc" },
					skip,
					take: limit,
				}),
				db.event.count({ where }),
			]);

			// Lazy lifecycle sync for the page of events being returned.
			const syncedEvents = await Promise.all(
				events.map(async (event) => {
					const status = await syncEventLifecycle(event);
					return status === event.status ? event : { ...event, status };
				}),
			);

			return {
				data: syncedEvents,
				meta: getPaginationMeta(total, page, limit),
			};
		}),

	getById: protectedProcedure
		.input(z.object({ id: z.string() }))
		.handler(async ({ context, input }) => {
			const event = await db.event.findUnique({
				where: { id: input.id },
				include: {
					members: {
						include: {
							user: true,
						},
					},
					budget: true,
				},
			});

			if (!event) {
				throw new NotFoundError("Evento não encontrado", {
					code: EVENT_CODES.NOT_FOUND,
				});
			}

			await requireEventPermission(
				context.session.user.id,
				input.id,
				PERMISSIONS.EVENT_READ,
			);

			// Lazy lifecycle sync: derive CONFIRMED→ONGOING→COMPLETED from the
			// calendar and persist the transition when the stored status lags
			// behind. The backend is the only authority for status changes.
			const status = await syncEventLifecycle(event);

			// Proximity notification milestone (idempotent, cheap on reads).
			try {
				await notifyEventMilestone(event);
			} catch {
				// Notifications must never break event reads.
			}

			return status === event.status ? event : { ...event, status };
		}),

	/**
	 * The caller's access to ONE event: their role there and the capabilities
	 * that role grants.
	 *
	 * The session payload carries the union of every membership, which is the
	 * right answer for account-level surfaces but the WRONG one for an action
	 * inside an event: someone who owns one event and is only a VIEWER in this
	 * one would see `events.delete` offered and get a 403 on click. The UI
	 * therefore asks about the event it is currently showing.
	 *
	 * Returns no role and no permissions for a non-member rather than throwing,
	 * so a client can render the "no access" state instead of an error boundary.
	 */
	getMyAccess: protectedProcedure
		.input(z.object({ id: z.string() }))
		.handler(async ({ context, input }) => {
			const role = await getEventRole(context.session.user.id, input.id);
			if (!role) return { role: null, permissions: [] };

			return {
				role,
				permissions: await getEventPermissions(
					context.session.user.id,
					input.id,
				),
			};
		}),

	create: protectedProcedure
		.input(
			z.object({
				name: z.string().min(1),
				type: z.enum(["ENGAGEMENT", "WEDDING"]),
				eventDate: z
					.string()
					.optional()
					.refine(
						(v) => {
							if (!v) return true;
							const d = new Date(v);
							d.setHours(0, 0, 0, 0);
							const today = new Date();
							today.setHours(0, 0, 0, 0);
							return d >= today;
						},
						{ message: "A data do evento não pode ser no passado" },
					),
				startTime: eventTimeSchema("início"),
				endTime: eventTimeSchema("fim"),
				venueName: z.string().optional(),
				address: z.string().optional(),
				province: z.string().optional(),
				municipality: z.string().optional(),
				neighborhood: z.string().optional(),
				reference: z.string().optional(),
				capacity: z.number().int().positive().optional(),
				currency: z.string().default("AOA"),
				description: z.string().optional(),
				budgetAmount: z.number().positive().optional(),
			}),
		)
		.handler(async ({ context, input }) => {
			// Horário coerente: ambos são obrigatórios e o fim tem de ser
			// estritamente posterior ao início ("HH:mm" compara-se como string).
			if (input.endTime <= input.startTime) {
				throw new ValidationError(
					"O horário de fim deve ser posterior ao horário de início",
				);
			}

			const event = await db.event.create({
				data: {
					ownerId: context.session.user.id,
					name: input.name,
					type: input.type,
					eventDate: input.eventDate ? new Date(input.eventDate) : null,
					startTime: input.startTime,
					endTime: input.endTime,
					venueName: input.venueName,
					address: input.address,
					province: input.province,
					municipality: input.municipality,
					neighborhood: input.neighborhood,
					reference: input.reference,
					capacity: input.capacity,
					currency: input.currency,
					description: input.description,
				},
			});

			// Goes through the repository so the `roleId` FK is resolved from
			// the `Role` table: authorization reads `roleId` first, and a
			// membership written without it would only resolve by fallback.
			await MemberRepository.create({
				eventId: event.id,
				userId: context.session.user.id,
				role: "OWNER",
				status: "ACTIVE",
			});

			if (input.budgetAmount) {
				await db.budget.create({
					data: {
						eventId: event.id,
						plannedAmount: input.budgetAmount,
					},
				});
			}

			await createActivityLog(
				buildActivityLog(context, {
					userId: context.session.user.id,
					action: "EVENT_CREATED",
					resource: "EVENT",
					resourceId: event.id,
					eventId: event.id,
					description: `Evento "${event.name}" criado`,
					metadata: { name: event.name, status: event.status },
				}),
			);

			return event;
		}),

	update: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				name: z.string().min(1).optional(),
				eventDate: z
					.string()
					.optional()
					.refine(
						(v) => {
							if (!v) return true;
							const d = new Date(v);
							d.setHours(0, 0, 0, 0);
							const today = new Date();
							today.setHours(0, 0, 0, 0);
							return d >= today;
						},
						{ message: "A data do evento não pode ser no passado" },
					),
				startTime: z
					.string()
					.optional()
					.refine((v) => !v || validateTimeString(v) === null, {
						message: "Formato de hora inválido. Use HH:mm.",
					}),
				endTime: z
					.string()
					.optional()
					.refine((v) => !v || validateTimeString(v) === null, {
						message: "Formato de hora inválido. Use HH:mm.",
					}),
				venueName: z.string().optional(),
				address: z.string().optional(),
				province: z.string().optional(),
				municipality: z.string().optional(),
				neighborhood: z.string().optional(),
				reference: z.string().optional(),
				capacity: z.number().int().positive().optional(),
				limitGuestCapacity: z.boolean().optional(),
				// People (guests + companions) allowed per invitation. The default
				// (2) lives in the database; lowering it is validated against the
				// existing invitations before anything is written.
				maxGuestsPerInvitation: z
					.number()
					.int()
					.min(MIN_MAX_GUESTS_PER_INVITATION)
					.max(MAX_MAX_GUESTS_PER_INVITATION)
					.optional(),
				description: z.string().optional(),
				status: z
					.enum([
						"DRAFT",
						"PLANNING",
						"CONFIRMED",
						"ONGOING",
						"COMPLETED",
						"CANCELLED",
					])
					.optional(),
			}),
		)
		.handler(async ({ context, input }) => {
			const event = await db.event.findUnique({
				where: { id: input.id },
				include: {
					members: true,
				},
			});

			if (!event) {
				throw new NotFoundError("Evento não encontrado", {
					code: EVENT_CODES.NOT_FOUND,
				});
			}

			await requireEventPermission(
				context.session.user.id,
				input.id,
				PERMISSIONS.EVENT_UPDATE,
			);

			// Horário efectivo: campos não enviados mantêm o valor guardado.
			const effectiveStartTime = input.startTime ?? event.startTime;
			const effectiveEndTime = input.endTime ?? event.endTime;

			// Lowering the invitation capacity may invalidate existing data:
			// nothing is deleted or rewritten silently — the change is rejected
			// with the exact invitations that must be corrected first.
			if (
				input.maxGuestsPerInvitation !== undefined &&
				input.maxGuestsPerInvitation !== event.maxGuestsPerInvitation
			) {
				await assertMaxGuestsPerInvitationIsRespected(
					db,
					input.id,
					input.maxGuestsPerInvitation,
				);
			}

			// Horário coerente: quando ambos presentes, o fim tem de ser
			// estritamente posterior ao início ("HH:mm" compara-se como string).
			if (
				effectiveStartTime &&
				effectiveEndTime &&
				effectiveEndTime <= effectiveStartTime
			) {
				throw new ValidationError(
					"O horário de fim deve ser posterior ao horário de início",
				);
			}

			const updatedEvent = await db.event.update({
				where: { id: input.id },
				data: {
					name: input.name,
					eventDate: input.eventDate ? new Date(input.eventDate) : undefined,
					startTime: input.startTime,
					endTime: input.endTime,
					venueName: input.venueName,
					address: input.address,
					province: input.province,
					municipality: input.municipality,
					neighborhood: input.neighborhood,
					reference: input.reference,
					capacity: input.capacity,
					limitGuestCapacity: input.limitGuestCapacity,
					maxGuestsPerInvitation: input.maxGuestsPerInvitation,
					description: input.description,
					status: input.status,
				},
			});

			await createActivityLog(
				buildActivityLog(context, {
					userId: context.session.user.id,
					action: "EVENT_UPDATED",
					resource: "EVENT",
					resourceId: event.id,
					eventId: event.id,
					description: `Evento "${updatedEvent.name}" atualizado`,
					metadata: {
						name: updatedEvent.name,
						changes: buildChanges(event, submittedValues(updatedEvent, input), [
							"name",
							"status",
							"eventDate",
							"startTime",
							"endTime",
							"venueName",
							"capacity",
							"maxGuestsPerInvitation",
						]),
					},
				}),
			);

			return updatedEvent;
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.handler(async ({ context, input }) => {
			const event = await db.event.findUnique({
				where: { id: input.id },
				include: {
					members: true,
				},
			});

			if (!event) {
				throw new NotFoundError("Evento não encontrado", {
					code: EVENT_CODES.NOT_FOUND,
				});
			}

			await requireEventPermission(
				context.session.user.id,
				input.id,
				PERMISSIONS.EVENT_DELETE,
			);

			await db.event.delete({
				where: { id: input.id },
			});

			await createActivityLog(
				buildActivityLog(context, {
					userId: context.session.user.id,
					action: "EVENT_DELETED",
					resource: "EVENT",
					resourceId: event.id,
					// The event row is gone, so `eventId` is deliberately left unset:
					// the FK cascades and would delete this log along with it.
					description: `Evento "${event.name}" eliminado`,
					metadata: { name: event.name, status: event.status },
				}),
			);

			return { success: true };
		}),
};
