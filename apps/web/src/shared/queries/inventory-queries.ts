import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";
import type { PaginationParams } from "./task-queries";

export interface InventoryFilters {
	search?: string;
	category?: "DRINK" | "FOOD" | "CAKE" | "DECORATION" | "OTHER";
	vendorId?: string;
}

export const inventoryKeys = {
	all: ["inventory"] as const,
	list: (eventId: string, params: Record<string, unknown>) =>
		[...inventoryKeys.all, "list", eventId, params] as const,
	detail: (id: string) => [...inventoryKeys.all, "detail", id] as const,
};

export function useInventoryItems(
	eventId: string,
	pagination: PaginationParams & InventoryFilters = { page: 1, limit: 20 },
) {
	const page = pagination.page ?? 1;
	const limit = pagination.limit ?? 20;
	const { search, category, vendorId } = pagination;
	const input = { eventId, page, limit, search, category, vendorId };
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

export function useCreateInventoryItem() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.inventory.create.mutationOptions({
			onSuccess: (data) => {
				queryClient.invalidateQueries({
					queryKey: [...inventoryKeys.all, "list", data.eventId],
				});
			},
		}),
	);
}

export function useUpdateInventoryItem() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.inventory.update.mutationOptions({
			onSuccess: (_data) => {
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

export function useAddInventoryMovement() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.inventory.addMovement.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
			},
		}),
	);
}

export function useInventoryStats(eventId: string) {
	return useQuery({
		...orpc.inventory.getStats.queryOptions({ input: { eventId } }),
		queryKey: [...inventoryKeys.all, "stats", eventId],
		enabled: !!eventId,
	});
}
