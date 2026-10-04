import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@muxima/ui/components/select";
import { Users } from "lucide-react";
import { toast } from "sonner";
import {
	useEvent,
	useUpdateEvent,
} from "@/routes/_private/events/-queries/event-queries";

/**
 * "Máximo de pessoas por convite" — the event-level capacity of a single
 * invitation (guest + companions), backed by `Event.maxGuestsPerInvitation`
 * (database default: 2).
 *
 * - The frontend only offers valid values; the backend re-validates the range
 *   and refuses a reduction that would leave existing invitations invalid
 *   (`409 INVITATION_CAPACITY_REACHED`), never deleting data silently.
 * - It is an attribute of the event itself, so it stays editable even when the
 *   event is operationally locked (same family as "editar evento").
 * - Failures are surfaced by the global mutation error handler (PT-PT).
 */
const CAPACITY_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const DEFAULT_CAPACITY = 2;

export function InvitationCapacitySetting({ eventId }: { eventId: string }) {
	const eventQuery = useEvent(eventId);
	const updateEvent = useUpdateEvent();

	const value = eventQuery.data?.maxGuestsPerInvitation ?? DEFAULT_CAPACITY;
	const isSaving = updateEvent.isPending;

	const handleChange = (raw: string) => {
		const next = Number(raw);
		if (!Number.isFinite(next) || next === value) return;

		updateEvent.mutate(
			{ id: eventId, maxGuestsPerInvitation: next },
			{
				onSuccess: () =>
					toast.success(
						`Máximo de pessoas por convite: ${next} ${next === 1 ? "pessoa" : "pessoas"}.`,
					),
			},
		);
	};

	return (
		<div
			className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/50 px-3 py-2"
			data-testid="invitation-capacity-setting"
		>
			<div className="flex max-w-2xl flex-col gap-0.5">
				<span className="flex items-center gap-2 font-medium text-sm">
					<Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
					Máximo de pessoas por convite
				</span>
				<span className="text-muted-foreground text-xs">
					Cada convite pode incluir no máximo este número de pessoas (convidado
					+ acompanhantes). Se reduzir o limite, os convites que já tenham mais
					pessoas terão de ser corrigidos primeiro — nada é eliminado
					automaticamente.
				</span>
			</div>

			<Select
				value={String(value)}
				onValueChange={handleChange}
				disabled={isSaving}
			>
				<SelectTrigger
					className="w-40"
					aria-label="Máximo de pessoas por convite"
				>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{CAPACITY_OPTIONS.map((option) => (
						<SelectItem key={option} value={String(option)}>
							{option} {option === 1 ? "pessoa" : "pessoas"}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
