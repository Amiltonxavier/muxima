import { Input } from "@muxima/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@muxima/ui/components/select";
import { Search } from "lucide-react";
import { EVENT_STATUS_LABELS } from "@/utils/status-helpers";
import { EVENT_TYPE_OPTIONS } from "../-constants/events.constants";
import type {
	EventStatusFilter,
	EventTypeFilter,
} from "../-types/events.types";

/**
 * Search + status + type. Every change resets the page to 1 — the parent owns
 * the query, this only reports intent.
 */
export function EventsFilters({
	search,
	status,
	type,
	onSearchChange,
	onStatusChange,
	onTypeChange,
}: {
	search: string;
	status: EventStatusFilter;
	type: EventTypeFilter;
	onSearchChange: (value: string) => void;
	onStatusChange: (value: EventStatusFilter) => void;
	onTypeChange: (value: EventTypeFilter) => void;
}) {
	return (
		<div className="flex flex-wrap items-center gap-3">
			<div className="relative min-w-[200px] max-w-sm flex-1">
				<Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					placeholder="Pesquisar eventos..."
					value={search}
					onChange={(e) => onSearchChange(e.target.value)}
					className="pl-9"
				/>
			</div>

			<Select
				value={status}
				onValueChange={(v) => {
					if (v) onStatusChange(v as EventStatusFilter);
				}}
			>
				<SelectTrigger className="w-[160px]">
					<SelectValue placeholder="Estado" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="ALL">Todos os estados</SelectItem>
					{Object.entries(EVENT_STATUS_LABELS).map(([value, label]) => (
						<SelectItem key={value} value={value}>
							{label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			<Select
				value={type}
				onValueChange={(v) => {
					if (v) onTypeChange(v as EventTypeFilter);
				}}
			>
				<SelectTrigger className="w-[160px]">
					<SelectValue placeholder="Tipo" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="ALL">Todos os tipos</SelectItem>
					{EVENT_TYPE_OPTIONS.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
