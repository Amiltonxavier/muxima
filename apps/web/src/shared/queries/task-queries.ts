import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/shared/utils/orpc";

export const taskKeys = {
	all: ["tasks"] as const,
	list: (eventId: string) => [...taskKeys.all, "list", eventId] as const,
	detail: (id: string) => [...taskKeys.all, "detail", id] as const,
	schedules: (eventId: string) =>
		[...taskKeys.all, "schedules", eventId] as const,
};

export function useTasks(eventId: string) {
	return useQuery({
		...orpc.tasks.list.queryOptions({ input: { eventId } }),
		queryKey: taskKeys.list(eventId),
		enabled: !!eventId,
	});
}

export function useTask(id: string) {
	return useQuery({
		...orpc.tasks.getById.queryOptions({ input: { id } }),
		queryKey: taskKeys.detail(id),
		enabled: !!id,
	});
}

export function useCreateTask() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.tasks.create.mutationOptions({
			onSuccess: (data) => {
				queryClient.invalidateQueries({
					queryKey: taskKeys.list(data.eventId),
				});
			},
		}),
	);
}

export function useUpdateTask() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.tasks.update.mutationOptions({
			onSuccess: (_data) => {
				queryClient.invalidateQueries({ queryKey: taskKeys.all });
			},
		}),
	);
}

export function useDeleteTask() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.tasks.delete.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: taskKeys.all });
			},
		}),
	);
}

export function useSchedules(eventId: string) {
	return useQuery({
		...orpc.tasks.getSchedules.queryOptions({ input: { eventId } }),
		queryKey: taskKeys.schedules(eventId),
		enabled: !!eventId,
	});
}

export function useCreateSchedule() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.tasks.createSchedule.mutationOptions({
			onSuccess: (data) => {
				queryClient.invalidateQueries({
					queryKey: taskKeys.schedules(data.eventId),
				});
			},
		}),
	);
}
