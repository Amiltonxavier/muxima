import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

export interface PaginationParams {
	page?: number;
	limit?: number;
}

export interface TaskFilters {
	search?: string;
	status?: "TODO" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
	category?:
		| "FINANCE"
		| "VENUE"
		| "GUESTS"
		| "FOOD"
		| "DRINKS"
		| "DECORATION"
		| "CEREMONY"
		| "DOCUMENTS"
		| "CLOTHING"
		| "TRANSPORT"
		| "OTHER";
	priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
}

export interface ScheduleFilters {
	search?: string;
	status?: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
}

export const taskKeys = {
	all: ["tasks"] as const,
	list: (eventId: string, params: Record<string, unknown>) =>
		[...taskKeys.all, "list", eventId, params] as const,
	detail: (id: string) => [...taskKeys.all, "detail", id] as const,
	schedules: (eventId: string, params: Record<string, unknown>) =>
		[...taskKeys.all, "schedules", eventId, params] as const,
};

export function useTasks(
	eventId: string,
	pagination: PaginationParams & TaskFilters = { page: 1, limit: 20 },
) {
	const page = pagination.page ?? 1;
	const limit = pagination.limit ?? 20;
	const { search, status, category, priority } = pagination;
	const input = { eventId, page, limit, search, status, category, priority };
	return useQuery({
		...orpc.tasks.list.queryOptions({ input }),
		queryKey: taskKeys.list(eventId, input),
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
					queryKey: [...taskKeys.all, "list", data.eventId],
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
		queryKey: taskKeys.schedules(eventId, input),
		enabled: !!eventId,
	});
}

export function useCreateSchedule() {
	const queryClient = useQueryClient();
	return useMutation(
		orpc.tasks.createSchedule.mutationOptions({
			onSuccess: (data) => {
				queryClient.invalidateQueries({
					queryKey: [...taskKeys.all, "schedules", data.eventId],
				});
			},
		}),
	);
}
