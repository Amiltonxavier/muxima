import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";
import type { PaginationParams } from "./task-queries";

export type SupplierCategoryValue =
	| "VENUE"
	| "DECORATION"
	| "FLORIST"
	| "CATERING"
	| "CAKE"
	| "SWEETS_AND_SAVOURIES"
	| "PHOTOGRAPHER"
	| "VIDEOGRAPHER"
	| "DJ"
	| "BAND"
	| "MUSIC"
	| "ENTERTAINMENT"
	| "TRANSPORT"
	| "BEAUTY"
	| "BRIDE_ATTIRE"
	| "GROOM_ATTIRE"
	| "RINGS"
	| "WEDDING_PLANNER"
	| "OFFICIANT"
	| "FAVOURS"
	| "ACCOMMODATION"
	| "SECURITY"
	| "OTHER";

export type SupplierStatusValue =
	| "PROSPECT"
	| "CONTACTED"
	| "NEGOTIATING"
	| "CONFIRMED"
	| "COMPLETED"
	| "CANCELLED";

export type SupplierPaymentStatusValue =
	| "PENDING"
	| "PAID"
	| "INSTALLMENTS"
	| "OVERDUE"
	| "CANCELLED";

export interface SupplierFilters {
	search?: string;
	category?: SupplierCategoryValue;
	status?: SupplierStatusValue;
	paymentStatus?: SupplierPaymentStatusValue;
}

const supplierRootKey = ["suppliers"] as const;

export const supplierKeys = {
	all: supplierRootKey,
	list: (eventId: string, params: Record<string, unknown>) =>
		[...supplierRootKey, "list", eventId, params] as const,
	detail: (id: string) => [...supplierRootKey, "detail", id] as const,
	stats: (eventId: string) => [...supplierRootKey, "stats", eventId] as const,
	categories: [...supplierRootKey, "categories"] as const,
};

/**
 * The per-category dynamic fields are defined by the API, not duplicated here:
 * the same spec drives the form rendering and the API validation.
 */
export function useSupplierCategorySchema() {
	return useQuery({
		...orpc.suppliers.getCategorySchema.queryOptions(),
		queryKey: supplierKeys.categories,
	});
}

export function useSuppliers(
	eventId: string,
	pagination: PaginationParams & SupplierFilters = { page: 1, limit: 20 },
) {
	const page = pagination.page ?? 1;
	const limit = pagination.limit ?? 20;
	const { search, category, status, paymentStatus } = pagination;
	const input = {
		eventId,
		page,
		limit,
		search,
		category,
		status,
		paymentStatus,
	};
	return useQuery({
		...orpc.suppliers.list.queryOptions({ input }),
		queryKey: supplierKeys.list(eventId, input),
		enabled: !!eventId,
	});
}

export function useSupplier(id: string) {
	return useQuery({
		...orpc.suppliers.getById.queryOptions({ input: { id } }),
		queryKey: supplierKeys.detail(id),
		enabled: !!id,
	});
}

export function useCreateSupplier() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.suppliers.create.mutationOptions({
			onSuccess: (data) => {
				queryClient.invalidateQueries({
					queryKey: supplierKeys.list(data.eventId, {}),
				});
			},
		}),
	);
}

export function useUpdateSupplier() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.suppliers.update.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: supplierKeys.all });
			},
		}),
	);
}

export function useDeleteSupplier() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.suppliers.delete.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: supplierKeys.all });
			},
		}),
	);
}

/**
 * A payment changes the money of a supplier, which is also an input of the
 * budget and of the checklist, so both are invalidated with the supplier.
 */
export function useAddSupplierPayment() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.suppliers.addPayment.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: supplierKeys.all });
			},
		}),
	);
}

export function useDeleteSupplierPayment() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.suppliers.deletePayment.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: supplierKeys.all });
			},
		}),
	);
}

/** Replaces the whole installment plan of a supplier. */
export function useSetSupplierInstallments() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.suppliers.setInstallments.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: supplierKeys.all });
			},
		}),
	);
}

export function useUpdateSupplierInstallment() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.suppliers.updateInstallment.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: supplierKeys.all });
			},
		}),
	);
}

export function useDeleteSupplierInstallment() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.suppliers.deleteInstallment.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: supplierKeys.all });
			},
		}),
	);
}

export function useSupplierStats(eventId: string) {
	return useQuery({
		...orpc.suppliers.getStats.queryOptions({ input: { eventId } }),
		queryKey: supplierKeys.stats(eventId),
		enabled: !!eventId,
	});
}
