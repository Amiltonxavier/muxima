import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/shared/utils/orpc";

export type ScheduleListParams = {
	eventId: string;
	page?: number;
	limit?: number;
	search?: string;
	status?: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
};

export const scheduleKeys = {
	all: ["schedules"] as const,
	list: (params: ScheduleListParams) =>
		[...scheduleKeys.all, "list", params] as const,
};

export function useSchedules(params: ScheduleListParams) {
	return useQuery({
		...orpc.tasks.getSchedules.queryOptions({ input: params }),
		queryKey: scheduleKeys.list(params),
		enabled: !!params.eventId,
	});
}

export function useCreateSchedule() {
	const queryClient = useQueryClient();
	return useMutation(
		orpc.tasks.createSchedule.mutationOptions({
			onSuccess: () => {
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
