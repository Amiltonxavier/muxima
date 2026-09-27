import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";
import type { PaginationParams } from "./task-queries";

export type InventoryCategoryValue =
	| "DRINK"
	| "MATERIAL"
	| "EQUIPMENT"
	| "FURNITURE"
	| "LINEN"
	| "OTHER";

export interface InventoryFilters {
	search?: string;
	category?: InventoryCategoryValue;
	status?: "PENDING" | "IN_PROGRESS" | "COMPLETED";
}

const inventoryRootKey = ["inventory"] as const;

export const inventoryKeys = {
	all: inventoryRootKey,
	list: (eventId: string, params: Record<string, unknown>) =>
		[...inventoryRootKey, "list", eventId, params] as const,
	stats: (eventId: string) => [...inventoryRootKey, "stats", eventId] as const,
	detail: (id: string) => [...inventoryRootKey, "detail", id] as const,
	history: (id: string) => [...inventoryRootKey, "history", id] as const,
};

/**
 * List with backend-side filtering and pagination. The frontend only sends
 * parameters — filtering, sorting and aggregation happen on the backend.
 */
export function useInventoryItems(
	eventId: string,
	pagination: PaginationParams & InventoryFilters = { page: 1, limit: 20 },
) {
	const page = pagination.page ?? 1;
	const limit = pagination.limit ?? 20;
	const { search, category, status } = pagination;
	const input = { eventId, page, limit, search, category, status };
	return useQuery({
		...orpc.inventory.list.queryOptions({ input }),
		queryKey: inventoryKeys.list(eventId, input),
		enabled: !!eventId,
	});
}

export function useInventoryItem(id: string) {
	return useQuery({
		...orpc.inventory.getById.queryOptions({ input: { id } }),
		queryKey: inventoryKeys.detail(id),
		enabled: !!id,
	});
}

export function useInventoryStats(eventId: string) {
	return useQuery({
		...orpc.inventory.getStats.queryOptions({ input: { eventId } }),
		queryKey: inventoryKeys.stats(eventId),
		enabled: !!eventId,
	});
}

export function useInventoryHistory(inventoryItemId: string) {
	return useQuery({
		...orpc.inventory.getHistory.queryOptions({
			input: { inventoryItemId },
		}),
		queryKey: inventoryKeys.history(inventoryItemId),
		enabled: !!inventoryItemId,
	});
}

export function useCreateInventoryItem() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.inventory.create.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
			},
		}),
	);
}

export function useUpdateInventoryItem() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.inventory.update.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
			},
		}),
	);
}

export function useDeleteInventoryItem() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.inventory.delete.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
			},
		}),
	);
}

/**
 * Registers an entry of quantity. The backend enforces that the planned
 * quantity is never exceeded and returns the computed movement cost.
 */
export function useAddInventoryQuantity() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.inventory.addMovement.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
			},
		}),
	);
}
