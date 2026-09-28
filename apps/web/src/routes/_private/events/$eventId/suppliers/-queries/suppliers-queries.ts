import type {
	useSupplier,
	useSupplierStats,
	useSuppliers,
} from "@/shared/queries/supplier-queries";

export type {
	SupplierCategoryValue,
	SupplierFilters,
	SupplierPaymentStatusValue,
	SupplierStatusValue,
} from "@/shared/queries/supplier-queries";
export {
	useAddSupplierPayment,
	useChangeSupplierStatus,
	useCreateSupplier,
	useDeleteSupplier,
	useDeleteSupplierPayment,
	useSetSupplierInstallments,
	useSupplier,
	useSupplierCategorySchema,
	useSupplierStats,
	useSuppliers,
	useUpdateSupplier,
} from "@/shared/queries/supplier-queries";

/** A row of the suppliers list, as returned by the API with its money resolved. */
export type SupplierListItem = NonNullable<
	ReturnType<typeof useSuppliers>["data"]
>["data"][number];

/** The full supplier with its money, timeline and installment plan. */
export type SupplierDetails = NonNullable<
	ReturnType<typeof useSupplier>["data"]
>;

export type SupplierTimelineEntry = SupplierDetails["timeline"][number];

/** Aggregated money of every supplier of an event, computed by the API. */
export type SupplierStatsDto = NonNullable<
	ReturnType<typeof useSupplierStats>["data"]
>;
