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
	DEDICATION_STATUS_LABELS,
	DEDICATION_TYPE_LABELS,
	DEDICATION_VISIBILITY_LABELS,
} from "@/utils/status-helpers";
import type {
	DedicationStatusFilter,
	DedicationTypeFilter,
	DedicationVisibilityFilter,
} from "../-types/dedication.types";

type Props = {
	search: string;
	type: DedicationTypeFilter;
	status: DedicationStatusFilter;
	visibility: DedicationVisibilityFilter;
	onSearchChange: (value: string) => void;
	onTypeChange: (value: DedicationTypeFilter) => void;
	onStatusChange: (value: DedicationStatusFilter) => void;
	onVisibilityChange: (value: DedicationVisibilityFilter) => void;
};

export function DedicationsFilters({
	search,
	type,
	status,
	visibility,
	onSearchChange,
	onTypeChange,
	onStatusChange,
	onVisibilityChange,
}: Props) {
	return (
		<div className="flex flex-wrap items-center gap-3">
			<div className="relative min-w-[200px] max-w-sm flex-1">
				<Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					placeholder="Pesquisar dedicatórias..."
					value={search}
					onChange={(e) => onSearchChange(e.target.value)}
					className="pl-9"
				/>
			</div>

			<Select
				value={type}
				onValueChange={(v) => {
					if (v) onTypeChange(v as DedicationTypeFilter);
				}}
			>
				<SelectTrigger className="w-[180px]">
					<SelectValue placeholder="Tipo" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="ALL">Todos os tipos</SelectItem>
					{Object.entries(DEDICATION_TYPE_LABELS).map(([value, label]) => (
						<SelectItem key={value} value={value}>
							{label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			<Select
				value={status}
				onValueChange={(v) => {
					if (v) onStatusChange(v as DedicationStatusFilter);
				}}
			>
				<SelectTrigger className="w-[160px]">
					<SelectValue placeholder="Estado" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="ALL">Todos os estados</SelectItem>
					{Object.entries(DEDICATION_STATUS_LABELS).map(([value, label]) => (
						<SelectItem key={value} value={value}>
							{label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
