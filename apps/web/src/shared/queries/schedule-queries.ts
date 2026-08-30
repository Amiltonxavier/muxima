import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

export const scheduleKeys = {
	all: ["schedules"] as const,
	list: (eventId: string) => [...scheduleKeys.all, "list", eventId] as const,
};

export function useSchedules(eventId: string) {
	return useQuery({
		...orpc.tasks.getSchedules.queryOptions({ input: { eventId } }),
		queryKey: scheduleKeys.list(eventId),
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
