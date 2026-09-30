import type { CreateActivityLogInput } from "@muxima/db/activity-log";
import type { Context } from "../../context";

/**
 * Request-scoped values every activity log should carry.
 *
 * Pulled from the oRPC context in one place so individual routers never
 * re-derive the header names, and so a future transport that exposes more
 * request data only has to be taught here.
 */
export type ActivityRequestMeta = {
	ipAddress?: string;
	userAgent?: string;
};

export function getActivityRequestMeta(
	context: Pick<Context, "ip" | "userAgent">,
): ActivityRequestMeta {
	return {
		...(context.ip ? { ipAddress: context.ip } : {}),
		...(context.userAgent ? { userAgent: context.userAgent } : {}),
	};
}

/**
 * Build a log entry that already carries the caller's request metadata, so a
 * router only has to describe *what* happened.
 *
 * `Omit` on `userId` is deliberate: the acting user always comes from the
 * session, never from input, which removes the possibility of a caller writing
 * a log entry attributed to somebody else.
 */
export function buildActivityLog(
	context: Pick<Context, "ip" | "userAgent">,
	input: Omit<CreateActivityLogInput, "userId" | "ipAddress" | "userAgent"> & {
		userId: string;
	},
): CreateActivityLogInput {
	return {
		...input,
		...getActivityRequestMeta(context),
	};
}

/**
 * The "after" side of a field diff, read off the *saved* row but limited to the
 * fields the caller actually submitted.
 *
 * Diffing the raw input against the stored record looks simpler but is wrong for
 * any field whose representation changes on the way in: a submitted `eventDate`
 * is an ISO string while the stored one is a `Date`, so `Object.is` is always
 * false and every update would report a date change that never happened. Taking
 * the value from the saved row keeps both sides the same type.
 *
 * Restricting to submitted fields preserves the other half of the contract: a
 * field the edit did not touch must not appear in the trail at all.
 */
export function submittedValues<Saved extends Record<string, unknown>>(
	saved: Saved,
	submitted: Readonly<Record<string, unknown>>,
): Partial<Saved> {
	const result: Record<string, unknown> = {};

	for (const field of Object.keys(submitted)) {
		if (field in saved) {
			result[field] = saved[field];
		}
	}

	return result as Partial<Saved>;
}
