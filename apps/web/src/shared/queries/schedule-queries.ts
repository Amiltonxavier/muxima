import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";
import type { PaginationParams, ScheduleFilters } from "./task-queries";

export const scheduleKeys = {
	all: ["schedules"] as const,
	list: (eventId: string, params: Record<string, unknown>) =>
		[...scheduleKeys.all, "list", eventId, params] as const,
};

export function useSchedules(
	eventId: string,
	pagination: PaginationParams & ScheduleFilters = { page: 1, limit: 20 },
) {
	const page = pagination.page ?? 1;
	const limit = pagination.limit ?? 20;
	const { search, status } = pagination;
	const input = { eventId, page, limit, search, status };
	return useQuery({
		...orpc.tasks.getSchedules.queryOptions({ input }),
		queryKey: scheduleKeys.list(eventId, input),
		enabled: !!eventId,
	});
}

export function useCreateSchedule() {
	const queryClient = useQueryClient();
	return useMutation(
		orpc.tasks.createSchedule.mutationOptions({
			onSuccess: (_data) => {
				queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
			},
		}),
	);
}

export function useDeleteSchedule() {
	const queryClient = useQueryClient();
	return useMutation(
		orpc.tasks.deleteSchedule.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
			},
		}),
	);
}

export function useUpdateSchedule() {
	const queryClient = useQueryClient();
	return useMutation(
		orpc.tasks.updateSchedule.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
			},
		}),
	);
}
