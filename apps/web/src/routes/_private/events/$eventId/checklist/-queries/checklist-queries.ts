import type {
	useChecklist,
	useChecklistStats,
} from "@/shared/queries/checklist-queries";

export {
	type ChecklistItemFilters,
	type ChecklistStatusValue,
	useChecklist,
	useChecklistStats,
	useCreateChecklistItem,
	useDeleteChecklistItem,
	useSyncChecklist,
	useUpdateChecklistItem,
} from "@/shared/queries/checklist-queries";

/** One checklist row, exactly as the API returns it (links included). */
export type ChecklistItem = NonNullable<
	ReturnType<typeof useChecklist>["data"]
>[number];

/** Aggregated counters rendered by the stats grid. */
export type ChecklistAnalytics = NonNullable<
	ReturnType<typeof useChecklistStats>["data"]
>;
