import { Input } from "@muxima/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@muxima/ui/components/select";
import { Search } from "lucide-react";
import { INVENTORY_CATEGORY_LABELS } from "@/shared/utils/status-helpers";

interface InventoryFiltersProps {
	search: string;
	onSearchChange: (value: string) => void;
	categoryFilter: string;
	onCategoryFilterChange: (value: string) => void;
	stockFilter: string;
	onStockFilterChange: (value: string) => void;
}

export function InventoryFilters({
	search,
	onSearchChange,
	categoryFilter,
	onCategoryFilterChange,
	stockFilter,
	onStockFilterChange,
}: InventoryFiltersProps) {
	return (
		<div className="flex flex-wrap items-center gap-3">
			<div className="relative max-w-sm flex-1">
				<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					placeholder="Pesquisar item..."
					value={search}
					onChange={(e) => onSearchChange(e.target.value)}
					className="pl-9"
				/>
			</div>
			<Select
				value={categoryFilter}
				onValueChange={(v) => onCategoryFilterChange(v ?? "ALL")}
			>
				<SelectTrigger className="w-[160px]">
					<SelectValue placeholder="Categoria" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="ALL">Todas categorias</SelectItem>
					{Object.entries(INVENTORY_CATEGORY_LABELS).map(([k, l]) => (
						<SelectItem key={k} value={k}>
							{l}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<Select
				value={stockFilter}
				onValueChange={(v) => onStockFilterChange(v ?? "ALL")}
			>
				<SelectTrigger className="w-[160px]">
					<SelectValue placeholder="Stock" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="ALL">Todo stock</SelectItem>
					<SelectItem value="LOW">Stock baixo</SelectItem>
					<SelectItem value="OK">Stock parcial</SelectItem>
					<SelectItem value="FULL">Stock completo</SelectItem>
				</SelectContent>
			</Select>
		</div>
	);
}
