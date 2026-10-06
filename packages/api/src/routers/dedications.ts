import db from "@muxima/db";
import { PERMISSIONS } from "@muxima/permissions";
import { z } from "zod";
import { protectedProcedure } from "../index";
import {
	addDedicationViewerSchema,
	createDedicationSchema,
	setDedicationVisibilitySchema,
	updateDedicationSchema,
} from "../modules/dedication/schemas";
import { DedicationService } from "../modules/dedication/service";
import {
	requireEventPermission,
	requireEventPermissionMutable,
} from "../shared/auth/authorization";

import { dedicationListInput } from "../shared/schemas/filters";
import { getPaginationMeta, parsePagination } from "../shared/utils/helpers";

const eventIdInput = z.object({ eventId: z.string().min(1) });
const dedicationInput = z.object({
	eventId: z.string().min(1),
	dedicationId: z.string().min(1),
});

/**
 * Every procedure is `protectedProcedure` (authentication), then asserts
 * event membership, then dedication ownership/viewer grant. Nothing about the
 * authorization decision is delegated to the client.
 */
export const dedicationsRouter = {
	list: protectedProcedure
		.input(eventIdInput.merge(dedicationListInput))
		.handler(async ({ context, input }) => {
			await requireEventPermission(
				context.session.user.id,
				input.eventId,
				PERMISSIONS.DEDICATION_READ,
			);

			const { page, limit } = parsePagination(input);
			const result = await DedicationService.list(db, {
				eventId: input.eventId,
				userId: context.session.user.id,
				pagination: { page, limit },
				filters: {
					search: input.search,
					type: input.type,
					status: input.status,
					visibility: input.visibility,
				},
			});

			return {
				data: result.data,
				meta: getPaginationMeta(result.total, page, limit),
			};
		}),

	getStats: protectedProcedure
		.input(eventIdInput)
		.handler(async ({ context, input }) => {
			await requireEventPermission(
				context.session.user.id,
				input.eventId,
				PERMISSIONS.DEDICATION_READ,
			);

			return DedicationService.getStats(db, {
				eventId: input.eventId,
				userId: context.session.user.id,
			});
		}),

	/** Reading a dedication records the last open (and the OPENED audit entry). */
	get: protectedProcedure
		.input(dedicationInput)
		.handler(async ({ context, input }) => {
			await requireEventPermission(
				context.session.user.id,
				input.eventId,
				PERMISSIONS.DEDICATION_READ,
			);

			return DedicationService.get(db, {
				eventId: input.eventId,
				dedicationId: input.dedicationId,
				userId: context.session.user.id,
			});
		}),

	create: protectedProcedure
		.input(createDedicationSchema.extend({ eventId: z.string().min(1) }))
		.handler(async ({ context, input }) => {
			await requireEventPermissionMutable(
				context.session.user.id,
				input.eventId,
				PERMISSIONS.DEDICATION_CREATE,
			);
			return DedicationService.create(db, {
				eventId: input.eventId,
				userId: context.session.user.id,
				input,
			});
		}),

	update: protectedProcedure
		.input(
			updateDedicationSchema.extend({
				eventId: z.string().min(1),
				dedicationId: z.string().min(1),
			}),
		)
		.handler(async ({ context, input }) => {
			await requireEventPermissionMutable(
				context.session.user.id,
				input.eventId,
				PERMISSIONS.DEDICATION_UPDATE,
			);
			return DedicationService.update(db, {
				eventId: input.eventId,
				dedicationId: input.dedicationId,
				userId: context.session.user.id,
				input,
			});
		}),

	setVisibility: protectedProcedure
		.input(
			setDedicationVisibilitySchema.extend({
				eventId: z.string().min(1),
				dedicationId: z.string().min(1),
			}),
		)
		.handler(async ({ context, input }) => {
			await requireEventPermissionMutable(
				context.session.user.id,
				input.eventId,
				PERMISSIONS.DEDICATION_SHARE,
			);
			return DedicationService.setVisibility(db, {
				eventId: input.eventId,
				dedicationId: input.dedicationId,
				userId: context.session.user.id,
				input,
			});
		}),

	listViewers: protectedProcedure
		.input(dedicationInput)
		.handler(async ({ context, input }) => {
			await requireEventPermission(
				context.session.user.id,
				input.eventId,
				PERMISSIONS.DEDICATION_READ,
			);

			return DedicationService.listViewers(db, {
				eventId: input.eventId,
				dedicationId: input.dedicationId,
				userId: context.session.user.id,
			});
		}),

	addViewer: protectedProcedure
		.input(
			addDedicationViewerSchema.extend({
				eventId: z.string().min(1),
				dedicationId: z.string().min(1),
			}),
		)
		.handler(async ({ context, input }) => {
			await requireEventPermissionMutable(
				context.session.user.id,
				input.eventId,
				PERMISSIONS.DEDICATION_SHARE,
			);
			return DedicationService.addViewer(db, {
				eventId: input.eventId,
				dedicationId: input.dedicationId,
				userId: context.session.user.id,
				input,
			});
		}),

	removeViewer: protectedProcedure
		.input(dedicationInput.extend({ viewerId: z.string().min(1) }))
		.handler(async ({ context, input }) => {
			await requireEventPermissionMutable(
				context.session.user.id,
				input.eventId,
				PERMISSIONS.DEDICATION_SHARE,
			);
			return DedicationService.removeViewer(db, {
				eventId: input.eventId,
				dedicationId: input.dedicationId,
				viewerId: input.viewerId,
				userId: context.session.user.id,
			});
		}),

	remove: protectedProcedure
		.input(dedicationInput)
		.handler(async ({ context, input }) => {
			await requireEventPermissionMutable(
				context.session.user.id,
				input.eventId,
				PERMISSIONS.DEDICATION_DELETE,
			);
			return DedicationService.remove(db, {
				eventId: input.eventId,
				dedicationId: input.dedicationId,
				userId: context.session.user.id,
			});
		}),

	getHistory: protectedProcedure
		.input(dedicationInput)
		.handler(async ({ context, input }) => {
			await requireEventPermission(
				context.session.user.id,
				input.eventId,
				PERMISSIONS.DEDICATION_READ,
			);

			return DedicationService.getHistory(db, {
				eventId: input.eventId,
				dedicationId: input.dedicationId,
				userId: context.session.user.id,
			});
		}),
};
