import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@muxima/ui/components/select";
import { BUDGET_SOURCE_FILTER_OPTIONS } from "../-constants/budget.constants";
import type { BudgetSourceFilter as SourceFilter } from "../-types/budget.types";

export function BudgetSourceFilter({
	source,
	onSourceChange,
}: {
	source: SourceFilter;
	onSourceChange: (value: SourceFilter) => void;
}) {
	return (
		<div className="flex items-center gap-2">
			<Select
				value={source}
				onValueChange={(v) => {
					if (v) onSourceChange(v as SourceFilter);
				}}
			>
				<SelectTrigger className="w-48">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{BUDGET_SOURCE_FILTER_OPTIONS.map((item) => (
						<SelectItem key={item.value} value={item.value}>
							{item.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
