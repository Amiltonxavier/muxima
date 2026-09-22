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
	GUEST_STATUS_FILTER_OPTIONS,
	GUEST_TYPE_FILTER_OPTIONS,
} from "../-constants/guest.constants";
import type { GuestStatusFilter, GuestTypeFilter } from "../-types/guest.types";

export function GuestsFilters({
	search,
	status,
	type,
	onSearchChange,
	onStatusChange,
	onTypeChange,
}: {
	search: string;
	status: GuestStatusFilter;
	type: GuestTypeFilter;
	onSearchChange: (value: string) => void;
	onStatusChange: (value: GuestStatusFilter) => void;
	onTypeChange: (value: GuestTypeFilter) => void;
}) {
	return (
		<div className="flex flex-wrap items-center gap-3">
			<div className="relative min-w-[200px] max-w-sm flex-1">
				<Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					placeholder="Pesquisar por nome, email ou telefone..."
					value={search}
					onChange={(e) => onSearchChange(e.target.value)}
					className="pl-9"
				/>
			</div>
			<Select
				value={status}
				onValueChange={(v) => {
					if (v) onStatusChange(v as GuestStatusFilter);
				}}
			>
				<SelectTrigger className="w-[160px]">
					<SelectValue placeholder="Estado" />
				</SelectTrigger>
				<SelectContent>
					{GUEST_STATUS_FILTER_OPTIONS.map((item) => (
						<SelectItem key={item.value} value={item.value}>
							{item.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<Select
				value={type}
				onValueChange={(v) => {
					if (v) onTypeChange(v as GuestTypeFilter);
				}}
			>
				<SelectTrigger className="w-[160px]">
					<SelectValue placeholder="Tipo" />
				</SelectTrigger>
				<SelectContent>
					{GUEST_TYPE_FILTER_OPTIONS.map((item) => (
						<SelectItem key={item.value} value={item.value}>
							{item.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
