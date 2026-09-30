import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

/**
 * Query keys for the activity trail.
 *
 * The list key includes the filters so that paging or filtering produces a
 * distinct cache entry — the server is the one paginating, and the key has to
 * describe the page it asked for.
 */
export const activityKeys = {
	all: ["activity-logs"] as const,
	list: (params: Record<string, unknown>) =>
		[...activityKeys.all, "list", params] as const,
};

export type ActivityLogsParams = {
	page?: number;
	limit?: number;
	action?: string;
	resource?: string;
	from?: string;
	to?: string;
};

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

/**
 * One page of the caller's activity history.
 *
 * The page/limit are forwarded to the server, which does the `skip`/`take` and
 * returns the matching total — nothing is fetched "all at once" and sliced here.
 */
export function useActivityLogs(params: ActivityLogsParams = {}) {
	const input = {
		page: params.page ?? DEFAULT_PAGE,
		limit: params.limit ?? DEFAULT_LIMIT,
		...(params.action ? { action: params.action } : {}),
		...(params.resource ? { resource: params.resource } : {}),
		...(params.from ? { from: params.from } : {}),
		...(params.to ? { to: params.to } : {}),
	};

	return useQuery({
		...orpc.activityLogs.list.queryOptions({ input }),
		queryKey: activityKeys.list(input),
	});
}
