import db from "@muxima/db";
import type { Prisma } from "@muxima/db/prisma";
import { z } from "zod";
import { protectedProcedure } from "../index";
import {
	createInvitation as createGuestInvitation,
	respondToInvitation as respondToGuestInvitation,
} from "../modules/invitations/service";
import {
	getEventIdForResource,
	requireEventAccess,
} from "../shared/auth/event-access";
import {
	guestListInput,
	tableListInput,
} from "../shared/schemas/filters";
import { getPaginationMeta, parsePagination } from "../shared/utils/helpers";

export const guestsRouter = {
	list: protectedProcedure
		.input(z.object({ eventId: z.string() }).merge(guestListInput))
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);
			const { page, limit, skip } = parsePagination(input);

			const filterConditions: Prisma.GuestWhereInput[] = [
				{ eventId: input.eventId },
			];

			if (input.search) {
				filterConditions.push({
					OR: [
						{ name: { contains: input.search, mode: "insensitive" } },
						{ email: { contains: input.search, mode: "insensitive" } },
						{ phone: { contains: input.search, mode: "insensitive" } },
					],
				});
			}

			if (input.status) {
				filterConditions.push({ status: input.status });
			}

			if (input.type) {
				filterConditions.push({ type: input.type });
			}

			const where: Prisma.GuestWhereInput = {
				AND: filterConditions,
			};

			const [guests, total] = await Promise.all([
				db.guest.findMany({
					where,
					include: {
						companions: true,
						tableGuests: { include: { table: true } },
					},
					orderBy: { createdAt: "desc" },
					skip,
					take: limit,
				}),
				db.guest.count({ where }),
			]);

			return { data: guests, meta: getPaginationMeta(total, page, limit) };
		}),

	getById: protectedProcedure
		.input(z.object({ id: z.string() }))
		.handler(async ({ context, input }) => {
			const guest = await db.guest.findUnique({
				where: { id: input.id },
				include: {
					companions: true,
					tableGuests: {
						include: { table: true },
					},
					invitationGuests: {
						include: { invitation: true },
					},
				},
			});

			if (!guest) {
				throw new Error("Convidado não encontrado");
			}

			await requireEventAccess(context.session.user.id, guest.eventId);

			return guest;
		}),

	create: protectedProcedure
		.input(
			z.object({
				eventId: z.string(),
				name: z.string().min(1),
				phone: z.string().optional(),
				email: z.string().email().optional().or(z.literal("")),
				group: z.string().optional(),
				type: z
					.enum(["FAMILY", "FRIEND", "COLLEAGUE", "VIP", "OTHER"])
					.optional(),
				companionsLimit: z.number().int().min(0).optional().default(0),
				notes: z.string().optional(),
				tableId: z.string().optional(),
				companions: z
					.array(
						z.object({
							name: z.string().min(1),
						}),
					)
					.optional(),
			}),
		)
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);

			const guest = await db.guest.create({
				data: {
					eventId: input.eventId,
					name: input.name,
					phone: input.phone,
					email: input.email || null,
					group: input.group,
					type: input.type || "FAMILY",
					companionsLimit: input.companionsLimit,
					notes: input.notes,
				},
			});

			if (input.tableId) {
				await db.tableGuest.create({
					data: {
						tableId: input.tableId,
						guestId: guest.id,
					},
				});
			}

			if (input.companions && input.companions.length > 0) {
				await db.guestCompanion.createMany({
					data: input.companions.map((c) => ({
						guestId: guest.id,
						name: c.name,
						status: "PENDING",
					})),
				});
			}

			return guest;
		}),

	update: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				name: z.string().min(1).optional(),
				phone: z.string().optional(),
				email: z.string().email().optional().or(z.literal("")),
				group: z.string().optional(),
				type: z
					.enum(["FAMILY", "FRIEND", "COLLEAGUE", "VIP", "OTHER"])
					.optional(),
				companionsLimit: z.number().int().min(0).optional(),
				notes: z.string().optional(),
				status: z
					.enum([
						"PENDING",
						"CONFIRMED",
						"DECLINED",
						"WAITING",
						"MAYBE",
						"CANCELLED",
					])
					.optional(),
			}),
		)
		.handler(async ({ context, input }) => {
			const eventId = await getEventIdForResource("guest", input.id);
			if (eventId) {
				await requireEventAccess(context.session.user.id, eventId);
			}

			const guest = await db.guest.update({
				where: { id: input.id },
				data: {
					name: input.name,
					phone: input.phone,
					email: input.email || null,
					group: input.group,
					type: input.type,
					companionsLimit: input.companionsLimit,
					notes: input.notes,
					status: input.status,
				},
			});

			return guest;
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.handler(async ({ context, input }) => {
			const eventId = await getEventIdForResource("guest", input.id);
			if (eventId) {
				await requireEventAccess(context.session.user.id, eventId);
			}

			await db.guest.delete({
				where: { id: input.id },
			});

			return { success: true };
		}),

	addCompanion: protectedProcedure
		.input(
			z.object({
				guestId: z.string(),
				name: z.string().min(1),
				status: z.enum(["PENDING", "CONFIRMED", "DECLINED"]).optional(),
			}),
		)
		.handler(async ({ context, input }) => {
			const eventId = await getEventIdForResource("guest", input.guestId);
			if (eventId) {
				await requireEventAccess(context.session.user.id, eventId);
			}

			const companion = await db.guestCompanion.create({
				data: {
					guestId: input.guestId,
					name: input.name,
					status: input.status || "PENDING",
				},
			});

			return companion;
		}),

	removeCompanion: protectedProcedure
		.input(z.object({ id: z.string() }))
		.handler(async ({ context, input }) => {
			const companion = await db.guestCompanion.findUnique({
				where: { id: input.id },
				include: { guest: { select: { eventId: true } } },
			});
			if (companion) {
				await requireEventAccess(
					context.session.user.id,
					companion.guest.eventId,
				);
			}

			await db.guestCompanion.delete({
				where: { id: input.id },
			});

			return { success: true };
		}),

	getTables: protectedProcedure
		.input(z.object({ eventId: z.string() }).merge(tableListInput))
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);
			const { page, limit, skip } = parsePagination(input);

			const filterConditions: Prisma.TableWhereInput[] = [
				{ eventId: input.eventId, deletedAt: null },
			];

			if (input.search) {
				filterConditions.push({
					OR: [
						{ name: { contains: input.search, mode: "insensitive" } },
						{ location: { contains: input.search, mode: "insensitive" } },
						{ notes: { contains: input.search, mode: "insensitive" } },
					],
				});
			}

			const where: Prisma.TableWhereInput = {
				AND: filterConditions,
			};

			const [tables, total] = await Promise.all([
				db.table.findMany({
					where,
					include: {
						tableGuests: { include: { guest: true } },
					},
					orderBy: { number: "asc" },
					skip,
					take: limit,
				}),
				db.table.count({ where }),
			]);

			return { data: tables, meta: getPaginationMeta(total, page, limit) };
		}),

	createTable: protectedProcedure
		.input(
			z.object({
				eventId: z.string(),
				name: z.string().min(1),
				number: z.number().int().positive().optional(),
				capacity: z.number().int().positive(),
				location: z.string().optional(),
				notes: z.string().optional(),
			}),
		)
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);

			const table = await db.table.create({
				data: {
					eventId: input.eventId,
					name: input.name,
					number: input.number,
					capacity: input.capacity,
					location: input.location,
					notes: input.notes,
				},
			});

			return table;
		}),

	updateTable: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				name: z.string().min(1).optional(),
				number: z.number().int().positive().optional(),
				capacity: z.number().int().positive().optional(),
				location: z.string().optional(),
				notes: z.string().optional(),
			}),
		)
		.handler(async ({ context, input }) => {
			const table = await db.table.findUnique({
				where: { id: input.id },
				select: { eventId: true },
			});
			if (table) {
				await requireEventAccess(context.session.user.id, table.eventId);
			}

			const updated = await db.table.update({
				where: { id: input.id },
				data: {
					name: input.name,
					number: input.number,
					capacity: input.capacity,
					location: input.location,
					notes: input.notes,
				},
			});

			return updated;
		}),

	deleteTable: protectedProcedure
		.input(z.object({ id: z.string() }))
		.handler(async ({ context, input }) => {
			const table = await db.table.findUnique({
				where: { id: input.id },
				select: { eventId: true },
			});
			if (table) {
				await requireEventAccess(context.session.user.id, table.eventId);
			}

			// Soft delete: set deletedAt, remove all guest assignments
			await db.tableGuest.deleteMany({
				where: { tableId: input.id },
			});
			await db.table.update({
				where: { id: input.id },
				data: { deletedAt: new Date() },
			});

			return { success: true };
		}),

	assignGuestToTable: protectedProcedure
		.input(
			z.object({
				tableId: z.string(),
				guestId: z.string(),
			}),
		)
		.handler(async ({ input }) => {
			const existing = await db.tableGuest.findFirst({
				where: {
					tableId: input.tableId,
					guestId: input.guestId,
				},
			});

			if (existing) {
				throw new Error("Convidado já está associado a esta mesa");
			}

			const tableGuest = await db.tableGuest.create({
				data: {
					tableId: input.tableId,
					guestId: input.guestId,
				},
			});

			return tableGuest;
		}),

	removeGuestFromTable: protectedProcedure
		.input(z.object({ id: z.string() }))
		.handler(async ({ input }) => {
			await db.tableGuest.delete({
				where: { id: input.id },
			});

			return { success: true };
		}),

	createInvitation: protectedProcedure
		.input(
			z.object({
				guestIds: z.array(z.string()).min(1),
				eventId: z.string(),
			}),
		)
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);
			return createGuestInvitation(db, {
				eventId: input.eventId,
				guestIds: input.guestIds,
			});
		}),

	getInvitation: protectedProcedure
		.input(z.object({ guestId: z.string() }))
		.handler(async ({ context, input }) => {
			try {
				const invitationGuest = await db.invitationGuest.findFirst({
					where: { guestId: input.guestId },
					include: {
						invitation: {
							include: {
								event: {
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
										neighborhood: true,
										municipality: true,
										province: true,
										owner: {
											select: {
												id: true,
												name: true,
												email: true,
											},
										},
									},
								},
								guests: {
									include: {
										guest: {
											include: {
												tableGuests: {
													include: { table: true },
												},
											},
										},
									},
								},
							},
						},
					},
				});

				if (!invitationGuest) {
					throw new Error("Convite não encontrado");
				}

				await requireEventAccess(
					context.session.user.id,
					invitationGuest.invitation.eventId,
				);

				return invitationGuest.invitation;
			} catch (error) {
				console.error("getInvitation error:", error);
				throw error;
			}
		}),

	updateCompanion: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				name: z.string().min(1).optional(),
				status: z.enum(["PENDING", "CONFIRMED", "DECLINED"]).optional(),
			}),
		)
		.handler(async ({ context, input }) => {
			const companion = await db.guestCompanion.findUnique({
				where: { id: input.id },
				include: { guest: { select: { eventId: true } } },
			});
			if (companion) {
				await requireEventAccess(
					context.session.user.id,
					companion.guest.eventId,
				);
			}

			const updated = await db.guestCompanion.update({
				where: { id: input.id },
				data: {
					name: input.name,
					status: input.status,
				},
			});

			return updated;
		}),

	getGuestStats: protectedProcedure
		.input(z.object({ eventId: z.string() }))
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);

			const event = await db.event.findUnique({
				where: { id: input.eventId },
				select: { capacity: true, limitGuestCapacity: true },
			});

			const [totalGuests, confirmed, pending, declined, waiting, maybe, cancelled] =
				await Promise.all([
					db.guest.count({ where: { eventId: input.eventId } }),
					db.guest.count({
						where: { eventId: input.eventId, status: "CONFIRMED" },
					}),
					db.guest.count({
						where: { eventId: input.eventId, status: "PENDING" },
					}),
					db.guest.count({
						where: { eventId: input.eventId, status: "DECLINED" },
					}),
					db.guest.count({
						where: { eventId: input.eventId, status: "WAITING" },
					}),
					db.guest.count({
						where: { eventId: input.eventId, status: "MAYBE" },
					}),
					db.guest.count({
						where: { eventId: input.eventId, status: "CANCELLED" },
					}),
				]);

			const totalCompanions = await db.guestCompanion.count({
				where: { guest: { eventId: input.eventId } },
			});

			const confirmedCompanions = await db.guestCompanion.count({
				where: { guest: { eventId: input.eventId }, status: "CONFIRMED" },
			});

			const totalConfirmedPeople = confirmed + confirmedCompanions;
			const capacity = event?.capacity ?? 0;
			const limitGuestCapacity = event?.limitGuestCapacity ?? false;
			const confirmationRate =
				totalGuests > 0
					? Math.round((confirmed / totalGuests) * 100)
					: 0;

			return {
				totalGuests,
				confirmed,
				pending,
				declined,
				waiting,
				maybe,
				cancelled,
				totalCompanions,
				confirmedCompanions,
				totalConfirmedPeople,
				confirmationRate,
				capacity,
				limitGuestCapacity,
				atCapacity: capacity > 0 && totalConfirmedPeople >= capacity,
			};
		}),

	respondToInvitation: protectedProcedure
		.input(
			z.object({
				code: z.string(),
				response: z.enum(["CONFIRM", "DECLINE", "MAYBE"]),
			}),
		)
		.handler(async ({ input }) => {
			return respondToGuestInvitation(db, input.code, input.response);
		}),

	getTableStats: protectedProcedure
		.input(z.object({ eventId: z.string() }))
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);

			const [total, totalCapacity, totalOccupied] = await Promise.all([
				db.table.count({
					where: { eventId: input.eventId, deletedAt: null },
				}),
				db.table.aggregate({
					where: { eventId: input.eventId, deletedAt: null },
					_sum: { capacity: true },
				}),
				db.tableGuest.count({
					where: { table: { eventId: input.eventId, deletedAt: null } },
				}),
			]);

			const capacity = totalCapacity._sum.capacity ?? 0;
			const available = capacity - totalOccupied;

			return {
				total,
				totalCapacity: capacity,
				totalOccupied,
				available: available > 0 ? available : 0,
			};
		}),
};
