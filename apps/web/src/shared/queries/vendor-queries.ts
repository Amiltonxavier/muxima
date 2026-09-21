import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";
import type { PaginationParams } from "./task-queries";

export interface VendorFilters {
	search?: string;
	category?:
		| "VENUE"
		| "DECORATION"
		| "MUSIC"
		| "PHOTOGRAPHY"
		| "VIDEO"
		| "CATERING"
		| "CAKE"
		| "DRINKS"
		| "TRANSPORT"
		| "BEAUTY"
		| "SECURITY"
		| "ENTERTAINMENT"
		| "OTHER";
	status?:
		| "PROSPECT"
		| "CONTACTED"
		| "NEGOTIATING"
		| "CONTRACTED"
		| "COMPLETED"
		| "CANCELLED";
}

export const vendorKeys = {
	all: ["vendors"] as const,
	list: (eventId: string, params: Record<string, unknown>) =>
		[...vendorKeys.all, "list", eventId, params] as const,
	detail: (id: string) => [...vendorKeys.all, "detail", id] as const,
};

export function useVendors(
	eventId: string,
	pagination: PaginationParams & VendorFilters = { page: 1, limit: 20 },
) {
	const page = pagination.page ?? 1;
	const limit = pagination.limit ?? 20;
	const { search, category, status } = pagination;
	const input = { eventId, page, limit, search, category, status };
	return useQuery({
		...orpc.vendors.list.queryOptions({ input }),
		queryKey: vendorKeys.list(eventId, input),
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
					queryKey: [...vendorKeys.all, "list", data.eventId],
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
