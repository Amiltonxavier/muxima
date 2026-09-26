import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

export type DedicationTypeFilter =
	| "WEDDING_VOW"
	| "ENGAGEMENT_VOW"
	| "DEDICATION";
export type DedicationStatusFilter =
	| "NOT_STARTED"
	| "DRAFT"
	| "IN_PROGRESS"
	| "READY";
/**
 * The API only accepts `PRIVATE` | `SHARED`; the `ALL` option the UI shows is
 * mapped to `undefined` before the request is built.
 */
export type DedicationVisibilityFilter = "ALL" | "PRIVATE" | "SHARED";

export interface DedicationFilters {
	search?: string;
	type?: DedicationTypeFilter;
	status?: DedicationStatusFilter;
	visibility?: DedicationVisibilityFilter;
}

export const dedicationKeys = {
	all: ["dedications"] as const,
	list: (eventId: string, params: Record<string, unknown>) =>
		[...dedicationKeys.all, "list", eventId, params] as const,
	detail: (eventId: string, id: string) =>
		[...dedicationKeys.all, "detail", eventId, id] as const,
	viewers: (eventId: string, id: string) =>
		[...dedicationKeys.all, "viewers", eventId, id] as const,
	history: (eventId: string, id: string) =>
		[...dedicationKeys.all, "history", eventId, id] as const,
};

export function useDedications(
	eventId: string,
	pagination: { page?: number; limit?: number } & DedicationFilters = {
		page: 1,
		limit: 20,
	},
) {
	const input = {
		eventId,
		page: pagination.page ?? 1,
		limit: pagination.limit ?? 20,
		search: pagination.search,
		type: pagination.type,
		status: pagination.status,
		visibility:
			pagination.visibility && pagination.visibility !== "ALL"
				? pagination.visibility
				: undefined,
	};
	return useQuery({
		...orpc.dedications.list.queryOptions({ input }),
		queryKey: dedicationKeys.list(eventId, input),
		enabled: !!eventId,
	});
}

/**
 * `get` records an `OPENED` audit entry as a side effect, so it is only ever
 * mounted for an explicit detail view — never prefetched from the list.
 */
export function useDedication(eventId: string, dedicationId: string | null) {
	return useQuery({
		...orpc.dedications.get.queryOptions({
			input: { eventId, dedicationId: dedicationId ?? "" },
		}),
		queryKey: dedicationKeys.detail(eventId, dedicationId ?? ""),
		enabled: !!eventId && !!dedicationId,
	});
}

export function useDedicationViewers(
	eventId: string,
	dedicationId: string | null,
) {
	return useQuery({
		...orpc.dedications.listViewers.queryOptions({
			input: { eventId, dedicationId: dedicationId ?? "" },
		}),
		queryKey: dedicationKeys.viewers(eventId, dedicationId ?? ""),
		enabled: !!eventId && !!dedicationId,
	});
}

export function useDedicationHistory(
	eventId: string,
	dedicationId: string | null,
) {
	return useQuery({
		...orpc.dedications.getHistory.queryOptions({
			input: { eventId, dedicationId: dedicationId ?? "" },
		}),
		queryKey: dedicationKeys.history(eventId, dedicationId ?? ""),
		enabled: !!eventId && !!dedicationId,
	});
}

export function useCreateDedication() {
	const queryClient = useQueryClient();
	return useMutation(
		orpc.dedications.create.mutationOptions({
			onSuccess: (_data, variables) => {
				queryClient.invalidateQueries({
					queryKey: [...dedicationKeys.all, "list", variables.eventId],
				});
			},
		}),
	);
}

export function useUpdateDedication() {
	const queryClient = useQueryClient();
	return useMutation(
		orpc.dedications.update.mutationOptions({
			onSuccess: (_data, variables) => {
				queryClient.invalidateQueries({ queryKey: dedicationKeys.all });
			},
		}),
	);
}

export function useSetDedicationVisibility() {
	const queryClient = useQueryClient();
	return useMutation(
		orpc.dedications.setVisibility.mutationOptions({
			onSuccess: (_data, variables) => {
				queryClient.invalidateQueries({ queryKey: dedicationKeys.all });
			},
		}),
	);
}

export function useAddDedicationViewer() {
	const queryClient = useQueryClient();
	return useMutation(
		orpc.dedications.addViewer.mutationOptions({
			onSuccess: (_data, _variables) => {
				queryClient.invalidateQueries({ queryKey: dedicationKeys.all });
			},
		}),
	);
}

export function useRemoveDedicationViewer() {
	const queryClient = useQueryClient();
	return useMutation(
		orpc.dedications.removeViewer.mutationOptions({
			onSuccess: (_data, _variables) => {
				queryClient.invalidateQueries({ queryKey: dedicationKeys.all });
			},
		}),
	);
}

export function useDeleteDedication() {
	const queryClient = useQueryClient();
	return useMutation(
		orpc.dedications.remove.mutationOptions({
			onSuccess: (_data, variables) => {
				queryClient.invalidateQueries({
					queryKey: [...dedicationKeys.all, "list", variables.eventId],
				});
			},
		}),
	);
}
