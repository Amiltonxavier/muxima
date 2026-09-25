import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@muxima/ui/components/select";
import { EVENT_STATUS_LABELS, getStatusColor } from "@/utils/status-helpers";
import { useUpdateEvent } from "../../-queries/event-queries";

const EVENT_STATUSES = [
	"DRAFT",
	"PLANNING",
	"CONFIRMED",
	"COMPLETED",
	"CANCELLED",
] as const;

type EventStatus = (typeof EVENT_STATUSES)[number];

interface UpdateEventStatusProps {
	eventId: string;
	status: EventStatus;
}

export function UpdateEventStatus({ eventId, status }: UpdateEventStatusProps) {
	const { mutateAsync } = useUpdateEvent();

	const handleUpdateStatusEvent = async (newStatus: string | null) => {
		if (!newStatus || newStatus === status) {
			return;
		}

		if (!EVENT_STATUSES.includes(newStatus as EventStatus)) {
			return;
		}

		await mutateAsync({
			id: eventId,
			status: newStatus as EventStatus,
		});
	};

	return (
		<Select
			items={Object.entries(EVENT_STATUS_LABELS).map(([value, label]) => ({
				value,
				label,
			}))}
			value={status}
			onValueChange={handleUpdateStatusEvent}
		>
			<SelectTrigger
				className={`h-auto w-auto cursor-pointer border-0 bg-transparent p-0 px-2.5 py-1.5 shadow-none ring-0 hover:bg-black/5 ${getStatusColor(status)}`}
			>
				<SelectValue />
			</SelectTrigger>

			<SelectContent>
				{Object.entries(EVENT_STATUS_LABELS).map(([key, label]) => (
					<SelectItem key={key} value={key}>
						{label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
