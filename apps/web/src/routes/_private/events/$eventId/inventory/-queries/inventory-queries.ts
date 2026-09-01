import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/shared/utils/orpc";
import { toast } from "sonner";
import { parseErrorMessage } from "@/routes/_private/events/$eventId/inventory/-utils/parse-error-message";

export const inventoryKeys = {
	all: ["inventory"] as const,
	list: (eventId: string) => [...inventoryKeys.all, "list", eventId] as const,
	stats: (eventId: string) => [...inventoryKeys.all, "stats", eventId] as const,
	detail: (id: string) => [...inventoryKeys.all, "detail", id] as const,
};

interface InventoryListFilters {
	search?: string;
	category?: string;
	stockStatus?: "LOW" | "OK" | "FULL";
	page?: number;
	limit?: number;
}

export function useInventoryItems(eventId: string, filters?: InventoryListFilters) {
	return useQuery({
		...orpc.inventory.list.queryOptions({
			input: {
				eventId,
				...(filters?.search ? { search: filters.search } : {}),
				...(filters?.category && filters.category !== "ALL"
					? { category: filters.category as "DRINK" | "FOOD" | "CAKE" | "DECORATION" | "OTHER" }
					: {}),
				...(filters?.stockStatus && filters.stockStatus !== "ALL"
					? { stockStatus: filters.stockStatus as "LOW" | "OK" | "FULL" }
					: {}),
				...(filters?.page ? { page: filters.page } : {}),
				...(filters?.limit ? { limit: filters.limit } : {}),
			},
		}),
		queryKey: inventoryKeys.list(eventId),
		enabled: !!eventId,
	});
}

export function useInventoryStats(eventId: string) {
	return useQuery({
		...orpc.inventory.stats.queryOptions({ input: { eventId } }),
		queryKey: inventoryKeys.stats(eventId),
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
					queryKey: inventoryKeys.list(data.eventId),
				});
				queryClient.invalidateQueries({
					queryKey: inventoryKeys.stats(data.eventId),
				});

				toast.success("Item adicionado");
			},
			onError: (error) => toast.error(parseErrorMessage(error)),
		}),
	);
}

export function useUpdateInventoryItem() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.inventory.update.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: inventoryKeys.all,
				});

				toast.success("Item atualizado com sucesso.");
			},

			onError: (error) => {
				toast.error(parseErrorMessage(error));
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
				toast.success("Item eliminado");
			},
			onError: (error) => toast.error(parseErrorMessage(error)),
		}),
	);
}

export function useAddInventoryMovement() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.inventory.addMovement.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
				toast.success("Movimento registado");
			},
			onError: (error) => toast.error(parseErrorMessage(error)),
		}),
	);
}
