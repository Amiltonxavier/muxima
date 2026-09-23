export {
	useAddInventoryQuantity,
	useCreateInventoryItem,
	useDeleteInventoryItem,
	useInventoryHistory,
	useInventoryItem,
	useInventoryItems,
	useInventoryStats,
	useUpdateInventoryItem,
} from "@/shared/queries/inventory-queries";

import type { InventoryListItem } from "@muxima/api/shared/types/entities";

export type { InventoryListItem };
