import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/shared/utils/orpc";

export type VendorListParams = {
	eventId: string;
	page?: number;
	limit?: number;
	search?: string;
	category?: string;
	status?: string;
};

export const vendorKeys = {
	all: ["vendors"] as const,
	detail: (id: string) => [...vendorKeys.all, "detail", id] as const,
};

export function useVendors(params: VendorListParams) {
	return useQuery({
		...orpc.vendors.list.queryOptions({ input: params as never }),
		queryKey: [...vendorKeys.all, "list", params.eventId, params] as never,
		enabled: !!params.eventId,
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
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: vendorKeys.all });
			},
		}),
	);
}

export function useUpdateVendor() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.vendors.update.mutationOptions({
			onSuccess: () => {
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
