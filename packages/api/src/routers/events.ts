import db from "@muxima/db";
import type { Prisma } from "@muxima/db/prisma";
import { z } from "zod";
import { protectedProcedure } from "../index";
import { syncEventLifecycle } from "../modules/events/lifecycle";
import { notifyEventMilestone } from "../modules/events/proximity-notifier";
import { eventListInput } from "../shared/schemas/filters";
import { getPaginationMeta, parsePagination } from "../shared/utils/helpers";

export const eventsRouter = {
	list: protectedProcedure
		.input(eventListInput)
		.handler(async ({ context, input }) => {
			const { page, limit, skip } = parsePagination(input);
			const membershipWhere: Prisma.EventWhereInput = {
				members: {
					some: {
						userId: context.session.user.id,
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
				throw new Error("Evento não encontrado");
			}

			const isMember = event.members.some(
				(member) => member.userId === context.session.user.id,
			);

			if (!isMember) {
				throw new Error("Não tem permissão para aceder a este evento");
			}

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
				startTime: z.string().optional(),
				endTime: z.string().optional(),
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

			await db.eventMember.create({
				data: {
					eventId: event.id,
					userId: context.session.user.id,
					role: "OWNER",
					status: "ACTIVE",
					joinedAt: new Date(),
				},
			});

			if (input.budgetAmount) {
				await db.budget.create({
					data: {
						eventId: event.id,
						plannedAmount: input.budgetAmount,
					},
				});
			}

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
				startTime: z.string().optional(),
				endTime: z.string().optional(),
				venueName: z.string().optional(),
				address: z.string().optional(),
				province: z.string().optional(),
				municipality: z.string().optional(),
				neighborhood: z.string().optional(),
				reference: z.string().optional(),
				capacity: z.number().int().positive().optional(),
				limitGuestCapacity: z.boolean().optional(),
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
				throw new Error("Evento não encontrado");
			}

			const isMember = event.members.some(
				(member) =>
					member.userId === context.session.user.id &&
					["OWNER", "ADMIN"].includes(member.role),
			);

			if (!isMember) {
				throw new Error("Não tem permissão para editar este evento");
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
					description: input.description,
					status: input.status,
				},
			});

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
				throw new Error("Evento não encontrado");
			}

			const isOwner = event.members.some(
				(member) =>
					member.userId === context.session.user.id && member.role === "OWNER",
			);

			if (!isOwner) {
				throw new Error("Apenas o proprietário pode eliminar o evento");
			}

			await db.event.delete({
				where: { id: input.id },
			});

			return { success: true };
		}),
};
