import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

export const vendorKeys = {
	all: ["vendors"] as const,
	list: (eventId: string) => [...vendorKeys.all, "list", eventId] as const,
	detail: (id: string) => [...vendorKeys.all, "detail", id] as const,
};

export function useVendors(eventId: string) {
	return useQuery({
		...orpc.vendors.list.queryOptions({ input: { eventId } }),
		queryKey: vendorKeys.list(eventId),
		enabled: !!eventId,
	});
}

export function useVendor(id: string) {
	return useQuery({
		...orpc.vendors.getById.queryOptions({ input: { id } }),
		queryKey: vendorKeys.detail(id),
		enabled: !!id,
	});
}

export function useCreateVendor() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.vendors.create.mutationOptions({
			onSuccess: (data) => {
				queryClient.invalidateQueries({
					queryKey: vendorKeys.list(data.eventId),
				});
			},
		}),
	);
}

export function useUpdateVendor() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.vendors.update.mutationOptions({
			onSuccess: (_data) => {
				queryClient.invalidateQueries({ queryKey: vendorKeys.all });
			},
		}),
	);
}

export function useDeleteVendor() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.vendors.delete.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: vendorKeys.all });
			},
		}),
	);
}
