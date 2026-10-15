import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@muxima/ui/components/select";
import {
	CHECKLIST_STATUS_FILTER_ALL,
	CHECKLIST_STATUS_FILTER_OPTIONS,
} from "../-constants/checklist.constants";
import type { ChecklistStatusValue } from "../-queries/checklist-queries";
import type { ChecklistStatusFilterValue } from "../-types/checklist.types";

export function ChecklistStatusFilter({
	statusFilter,
	onStatusChange,
}: {
	statusFilter: ChecklistStatusFilterValue;
	onStatusChange: (value: ChecklistStatusFilterValue) => void;
}) {
	return (
		<div className="flex items-center gap-2">
			<Select
				value={statusFilter ?? CHECKLIST_STATUS_FILTER_ALL}
				onValueChange={(v) =>
					onStatusChange(
						v === CHECKLIST_STATUS_FILTER_ALL
							? undefined
							: (v as ChecklistStatusValue),
					)
				}
			>
				<SelectTrigger className="w-48">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{CHECKLIST_STATUS_FILTER_OPTIONS.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
