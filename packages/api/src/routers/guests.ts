import db from "@muxima/db";
import { z } from "zod";
import { protectedProcedure } from "../index";
import {
	getEventIdForResource,
	requireEventAccess,
} from "../shared/auth/event-access";

export const guestsRouter = {
	list: protectedProcedure
		.input(z.object({ eventId: z.string() }))
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);

			const guests = await db.guest.findMany({
				where: { eventId: input.eventId },
				include: {
					companions: true,
					tableGuests: {
						include: { table: true },
					},
				},
				orderBy: {
					createdAt: "desc",
				},
			});

			return guests;
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
					.enum(["PENDING", "CONFIRMED", "DECLINED", "WAITING"])
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
		.input(z.object({ eventId: z.string() }))
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);

			const tables = await db.table.findMany({
				where: { eventId: input.eventId, deletedAt: null },
				include: {
					tableGuests: {
						include: {
							guest: true,
						},
					},
				},
				orderBy: {
					number: "asc",
				},
			});

			return tables;
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

			const code = Math.random().toString(36).substring(2, 10).toUpperCase();

			const invitation = await db.guestInvitation.create({
				data: {
					eventId: input.eventId,
					code,
					status: "SENT",
					sentAt: new Date(),
					guests: {
						create: input.guestIds.map((guestId) => ({ guestId })),
					},
				},
				include: {
					guests: {
						include: { guest: true },
					},
				},
			});

			return invitation;
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

	getInvitationsByEvent: protectedProcedure
		.input(z.object({ eventId: z.string() }))
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);

			const invitations = await db.guestInvitation.findMany({
				where: { eventId: input.eventId },
				include: {
					guests: {
						include: {
							guest: true,
						},
					},
				},
				orderBy: { createdAt: "desc" },
			});

			return invitations;
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

			const guests = await db.guest.findMany({
				where: { eventId: input.eventId },
				include: {
					companions: true,
				},
			});

			const totalGuests = guests.length;
			const confirmed = guests.filter((g) => g.status === "CONFIRMED").length;
			const pending = guests.filter((g) => g.status === "PENDING").length;
			const declined = guests.filter((g) => g.status === "DECLINED").length;
			const waiting = guests.filter((g) => g.status === "WAITING").length;

			const totalCompanions = guests.reduce(
				(sum, g) => sum + g.companions.length,
				0,
			);
			const confirmedCompanions = guests.reduce(
				(sum, g) =>
					sum +
					g.companions.filter((c) => c.status === "CONFIRMED").length,
				0,
			);

			const totalConfirmedPeople = confirmed + confirmedCompanions;
			const capacity = event?.capacity ?? 0;
			const limitGuestCapacity = event?.limitGuestCapacity ?? false;

			return {
				totalGuests,
				confirmed,
				pending,
				declined,
				waiting,
				totalCompanions,
				confirmedCompanions,
				totalConfirmedPeople,
				capacity,
				limitGuestCapacity,
				atCapacity: capacity > 0 && totalConfirmedPeople >= capacity,
			};
		}),

	respondToInvitation: protectedProcedure
		.input(
			z.object({
				code: z.string(),
				response: z.enum(["CONFIRM", "DECLINE"]),
			}),
		)
		.handler(async ({ input }) => {
			const invitation = await db.guestInvitation.findUnique({
				where: { code: input.code },
				include: {
					guests: {
						include: { guest: true },
					},
				},
			});

			if (!invitation) {
				throw new Error("Convite não encontrado");
			}

			if (invitation.status === "EXPIRED") {
				throw new Error("Este convite expirou");
			}

			const guestStatus =
				input.response === "CONFIRM" ? "CONFIRMED" : "DECLINED";

			await db.guest.updateMany({
				where: {
					id: {
						in: invitation.guests.map((ig) => ig.guestId),
					},
				},
				data: { status: guestStatus },
			});

			const updated = await db.guestInvitation.update({
				where: { id: invitation.id },
				data: {
					status: "RESPONDED",
					respondedAt: new Date(),
					response: input.response,
				},
			});

			return updated;
		}),
};
