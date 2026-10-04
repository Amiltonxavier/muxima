import { Lock } from "lucide-react";
import { useEventLock } from "@/shared/hooks/use-event-lock";

/**
 * Global feedback for the operational lock (`EVENT_LOCKED`), rendered in the
 * private layout next to the countdown banner.
 *
 * It shows the single PT-PT message of the active reason (cancelled /
 * concluded / past the 5-day window) so the user understands why every
 * mutation button of the event is disabled. Event maintenance — editing the
 * event itself and changing its status — stays available.
 *
 * Never renders when there is no event in context or the event is mutable, so
 * no space is reserved for nothing.
 */
export function EventLockBanner() {
	const { isEventLocked, lockMessage } = useEventLock();

	if (!isEventLocked || !lockMessage) return null;

	return (
		<div
			role="status"
			data-testid="event-lock-banner"
			className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b bg-muted/40 px-4 py-2 lg:px-6"
		>
			<span className="flex items-center gap-2 text-foreground/90 text-sm">
				<Lock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
				{lockMessage}
			</span>
			<span className="text-muted-foreground text-xs">
				Editar o evento e alterar o seu estado continuam disponíveis.
			</span>
		</div>
	);
}
