export {
	useAddInventoryQuantity,
	useCreateInventoryItem,
	useDeleteInventoryItem,
	useInventoryCostliestItems,
	useInventoryHistory,
	useInventoryItem,
	useInventoryItems,
	useInventoryStats,
	useUpdateInventoryItem,
} from "@/shared/queries/inventory-queries";

import type { InventoryListItem } from "@muxima/api/shared/types/entities";
import type { useInventoryCostliestItems } from "@/shared/queries/inventory-queries";

export type { InventoryListItem };

/** One bar of the costliest-items chart, already ranked by the API. */
export type InventoryCostPoint = NonNullable<
	ReturnType<typeof useInventoryCostliestItems>["data"]
>[number];
