import { PERMISSIONS } from "@muxima/permissions";
import { requireEventPermission } from "../../shared/auth/authorization";
import { NotFoundError } from "../../shared/errors/app-error";
import { EVENT_CODES } from "../../shared/errors/codes";
import { syncEventLifecycle } from "./lifecycle";
import { type EventFilterParams, EventRepository } from "./repository";

/**
 * The REST surface of events.
 *
 * Authorization lives in `shared/auth/authorization.ts` and is expressed in
 * CAPABILITIES (`events.read` / `events.update` / `events.delete`), not in role
 * lists. That matters here specifically: this service used to hardcode
 * `["OWNER", "ADMIN"]` and `role === "OWNER"`, so the REST routes and the oRPC
 * routers could disagree about who may manage the team. Both now ask the same
 * guards and read the same `RolePermission` rows, so a change to the matrix
 * reaches both at once.
 */
export const EventService = {
	async create(
		userId: string,
		data: {
			name: string;
			type: "ENGAGEMENT" | "WEDDING";
			eventDate?: string;
			description?: string;
		},
	) {
		const event = await EventRepository.create({
			ownerId: userId,
			name: data.name,
			type: data.type,
			eventDate: data.eventDate ? new Date(data.eventDate) : undefined,
			description: data.description,
		});

		// Creating an event grants its creator `OWNER`. `MemberRepository.create`
		// resolves the `Role` row, so the membership's `roleId` points at a real
		// role and authorization never has to fall back to the enum.
		await (await import("../members/repository")).MemberRepository.create({
			eventId: event.id,
			userId,
			role: "OWNER",
			status: "ACTIVE",
		});

		return event;
	},

	async findById(id: string, userId: string) {
		const event = await EventRepository.findById(id);
		if (!event)
			throw new NotFoundError("Evento não encontrado", {
				code: EVENT_CODES.NOT_FOUND,
			});

		await requireEventPermission(userId, id, PERMISSIONS.EVENT_READ);

		// Lazy lifecycle sync (backend is the authority for status changes).
		const status = await syncEventLifecycle(event);
		return status === event.status ? event : { ...event, status };
	},

	async findByUserId(
		userId: string,
		pagination: { page: number; limit: number },
		filters?: EventFilterParams,
	) {
		const [data, total] = await Promise.all([
			EventRepository.findByUserId(userId, pagination, filters),
			EventRepository.countByUserId(userId, filters),
		]);
		return { data, total };
	},

	async update(
		id: string,
		userId: string,
		data: Partial<{
			name: string;
			eventDate: string;
			startTime: string;
			endTime: string;
			venueName: string;
			address: string;
			province: string;
			municipality: string;
			neighborhood: string;
			reference: string;
			capacity: number;
			limitGuestCapacity: boolean;
			description: string;
			status:
				| "DRAFT"
				| "PLANNING"
				| "CONFIRMED"
				| "ONGOING"
				| "COMPLETED"
				| "CANCELLED";
		}>,
	) {
		await requireEventPermission(userId, id, PERMISSIONS.EVENT_UPDATE);

		return EventRepository.update(id, {
			...data,
			eventDate: data.eventDate ? new Date(data.eventDate) : undefined,
		});
	},

	async delete(id: string, userId: string) {
		await requireEventPermission(userId, id, PERMISSIONS.EVENT_DELETE);

		return EventRepository.delete(id);
	},
};
