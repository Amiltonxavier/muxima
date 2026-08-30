import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

export const inventoryKeys = {
	all: ["inventory"] as const,
	list: (eventId: string) => [...inventoryKeys.all, "list", eventId] as const,
	detail: (id: string) => [...inventoryKeys.all, "detail", id] as const,
};

export function useInventoryItems(eventId: string) {
	return useQuery({
		...orpc.inventory.list.queryOptions({ input: { eventId } }),
		queryKey: inventoryKeys.list(eventId),
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
