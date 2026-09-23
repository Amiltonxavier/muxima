import { Input } from "@muxima/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@muxima/ui/components/select";
import { Search } from "lucide-react";
import {
	INVENTORY_CATEGORY_FILTER_OPTIONS,
	INVENTORY_STATUS_FILTER_OPTIONS,
} from "../-constants/inventory.constants";
import type {
	InventoryCategoryFilter,
	InventoryStatusFilter,
} from "../-types/inventory.types";

export function InventoryFilters({
	search,
	status,
	category,
	onSearchChange,
	onStatusChange,
	onCategoryChange,
}: {
	search: string;
	status: InventoryStatusFilter;
	category: InventoryCategoryFilter;
	onSearchChange: (value: string) => void;
	onStatusChange: (value: InventoryStatusFilter) => void;
	onCategoryChange: (value: InventoryCategoryFilter) => void;
}) {
	return (
		<div className="flex flex-wrap items-center gap-3">
			<div className="relative min-w-[200px] max-w-sm flex-1">
				<Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					placeholder="Pesquisar por produto ou notas..."
					value={search}
					onChange={(e) => onSearchChange(e.target.value)}
					className="pl-9"
				/>
			</div>
			<Select
				value={status}
				onValueChange={(v) => {
					if (v) onStatusChange(v as InventoryStatusFilter);
				}}
			>
				<SelectTrigger className="w-[160px]">
					<SelectValue placeholder="Estado" />
				</SelectTrigger>
				<SelectContent>
					{INVENTORY_STATUS_FILTER_OPTIONS.map((item) => (
						<SelectItem key={item.value} value={item.value}>
							{item.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<Select
				value={category}
				onValueChange={(v) => {
					if (v) onCategoryChange(v as InventoryCategoryFilter);
				}}
			>
				<SelectTrigger className="w-[180px]">
					<SelectValue placeholder="Categoria" />
				</SelectTrigger>
				<SelectContent>
					{INVENTORY_CATEGORY_FILTER_OPTIONS.map((item) => (
						<SelectItem key={item.value} value={item.value}>
							{item.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
