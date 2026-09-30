import { getUserAccess, hasPermission, PERMISSIONS } from "@muxima/auth";
import db from "@muxima/db";
import type { Prisma } from "@muxima/db/prisma";
import { protectedProcedure } from "../index";
import { ForbiddenError } from "../shared/errors/app-error";
import { activityLogListInput } from "../shared/schemas/filters";
import { getPaginationMeta, parsePagination } from "../shared/utils/helpers";

/**
 * Activity history.
 *
 * Reads are own-history by default: with no `userId` the result set stays pinned
 * to the session's user for *every* role, including owners and admins. Reaching
 * another member's trail requires two things together — an explicit `userId`
 * from the caller, and the `activity.read.all` permission from the role system
 * (see `ROLE_PERMISSIONS` in `@muxima/auth`). Both are required, so the scope
 * cannot be widened by forgetting a filter, and the attempt is auditable.
 *
 * The decision is made here, on the server; the client only hides affordances.
 */
export const activityLogsRouter = {
	list: protectedProcedure
		.input(activityLogListInput)
		.route({
			method: "GET",
			summary: "List activity logs",
		})
		.handler(async ({ context, input }) => {
			const { page, limit, skip } = parsePagination(input);
			const callerId = context.session.user.id;

			// Default to the caller. Only an explicit, authorized target may differ.
			let targetUserId = callerId;

			if (input.userId && input.userId !== callerId) {
				const { permissions } = await getUserAccess(callerId);

				if (!hasPermission(permissions, PERMISSIONS.ACTIVITY_READ_ALL)) {
					throw new ForbiddenError(
						"Não tem permissão para consultar a atividade de outro utilizador",
					);
				}

				targetUserId = input.userId;
			}

			const filterConditions: Prisma.ActivityLogWhereInput[] = [
				{ userId: targetUserId },
			];

			if (input.action) {
				filterConditions.push({ action: input.action });
			}

			if (input.resource) {
				filterConditions.push({ resource: input.resource });
			}

			if (input.from || input.to) {
				filterConditions.push({
					createdAt: {
						...(input.from ? { gte: input.from } : {}),
						...(input.to ? { lte: input.to } : {}),
					},
				});
			}

			const where: Prisma.ActivityLogWhereInput = {
				AND: filterConditions,
			};

			// Paginated in the database: `skip`/`take` plus a matching `count`, so
			// the response is one page regardless of how long the trail gets.
			const [logs, total] = await Promise.all([
				db.activityLog.findMany({
					where,
					orderBy: { createdAt: "desc" },
					skip,
					take: limit,
				}),
				db.activityLog.count({ where }),
			]);

			return {
				data: logs,
				meta: getPaginationMeta(total, page, limit),
			};
		}),
};
