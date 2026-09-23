import type {
	InventoryCategory,
	InventoryStatus,
} from "@muxima/api/shared/types/entities";
import type { InventoryListItem } from "../-queries/inventory-queries";

export type InventoryItem = InventoryListItem;

export type InventoryStatusFilter = "ALL" | InventoryStatus;
export type InventoryCategoryFilter = "ALL" | InventoryCategory;

export type InventoryFormValues = {
	name: string;
	category: InventoryCategory;
	unit: InventoryListItem["unit"];
	plannedQuantity: number;
	venueQuantity: number;
	unitPrice: number;
	notes: string;
};
