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
	SUPPLIER_CATEGORY_FILTER_OPTIONS,
	SUPPLIER_PAYMENT_STATUS_FILTER_OPTIONS,
} from "../-constants/suppliers.constants";
import type {
	SupplierCategoryFilter,
	SupplierPaymentStatusFilter,
} from "../-types/suppliers.types";

export function SupplierFilters({
	search,
	category,
	paymentStatus,
	onSearchChange,
	onCategoryChange,
	onPaymentStatusChange,
}: {
	search: string;
	category: SupplierCategoryFilter;
	paymentStatus: SupplierPaymentStatusFilter;
	onSearchChange: (value: string) => void;
	onCategoryChange: (value: SupplierCategoryFilter) => void;
	onPaymentStatusChange: (value: SupplierPaymentStatusFilter) => void;
}) {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<div className="relative min-w-[200px] max-w-sm flex-1">
				<Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					placeholder="Pesquisar por nome, email ou telefone"
					value={search}
					onChange={(e) => onSearchChange(e.target.value)}
					className="pl-9"
				/>
			</div>
			<Select
				value={category}
				onValueChange={(v) => {
					if (v) onCategoryChange(v as SupplierCategoryFilter);
				}}
			>
				<SelectTrigger className="w-48">
					<SelectValue placeholder="Categoria" />
				</SelectTrigger>
				<SelectContent>
					{SUPPLIER_CATEGORY_FILTER_OPTIONS.map((item) => (
						<SelectItem key={item.value} value={item.value}>
							{item.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<Select
				value={paymentStatus}
				onValueChange={(v) => {
					if (v) onPaymentStatusChange(v as SupplierPaymentStatusFilter);
				}}
			>
				<SelectTrigger className="w-44">
					<SelectValue placeholder="Pagamento" />
				</SelectTrigger>
				<SelectContent>
					{SUPPLIER_PAYMENT_STATUS_FILTER_OPTIONS.map((item) => (
						<SelectItem key={item.value} value={item.value}>
							{item.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
