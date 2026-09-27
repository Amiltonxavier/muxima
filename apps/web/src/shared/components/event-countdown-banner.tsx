import { Badge } from "@muxima/ui/components/badge";
import NumberFlow from "@number-flow/react";
import { CalendarClock } from "lucide-react";
import { useEventBanner } from "@/shared/hooks/use-event-banner";
import { useEventCountdown } from "@/shared/hooks/use-event-countdown";
import { dateHelper } from "@/shared/utils/date-helper";
import {
	composeEventEndAt,
	composeEventStartAt,
	formatEventClock,
} from "@/shared/utils/event-date-time";

/**
 * Global countdown banner shown in the private layout (spec §8/§20/§22).
 *
 * Visual rules: enterprise, quiet, part of the design system. The countdown
 * is the highlight; no heavy cards, no loud colours, no shadows.
 *
 * Accessibility: the ticking countdown is aria-hidden; a static summary
 * ("começa em 5 dias / hoje às 15:00 / termina em 3h") is exposed to screen
 * readers and updated only when the coarse unit changes — never one
 * announcement per second (spec §21).
 */

function pad(value: number): string {
	return String(value).padStart(2, "0");
}

/** Coarse human summary used for the accessible label and the "close" copy. */
function humanSummary(countdown: {
	days: number;
	hours: number;
	minutes: number;
	seconds: number;
}): string {
	if (countdown.days > 1) {
		return `${countdown.days} dias`;
	}
	if (countdown.days === 1) {
		return "amanhã";
	}
	if (countdown.hours > 0) {
		return `hoje, em ${countdown.hours}h ${pad(countdown.minutes)}min`;
	}
	return `em ${countdown.minutes}min`;
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
	return (
		<span className="inline-flex items-baseline gap-1">
			<NumberFlow
				value={value}
				format={{ minimumIntegerDigits: label === "DIAS" ? 1 : 2 }}
				className="font-medium text-sm tabular-nums"
				aria-hidden="true"
			/>
			<span className="text-[11px] text-muted-foreground uppercase tracking-wide">
				{label}
			</span>
		</span>
	);
}

export function EventCountdownBanner() {
	const { mode, event, countdown } = useEventBanner();

	const target = countdown?.startAt ?? null;
	const remaining = useEventCountdown(mode === "COUNTDOWN" ? target : null);

	if (mode === "HIDDEN" || !event) {
		// Never reserve space when there is no content (spec §12).
		return null;
	}

	if (mode === "COUNTDOWN") {
		const startAt = countdown?.startAt ?? null;
		const isSameDay = startAt ? dateHelper.isToday(startAt) : false;
		const isTomorrow = startAt ? dateHelper.isTomorrow(startAt) : false;

		const lead = isSameDay
			? `O teu evento começa hoje às ${startAt ? formatEventClock(startAt) : ""}`
			: isTomorrow
				? "O teu evento começa amanhã"
				: "O teu evento começa em";

		const accessible = isSameDay
			? lead
			: isTomorrow
				? `${lead}, em ${remaining.hours}h ${pad(remaining.minutes)}min`
				: `${lead} ${humanSummary(remaining)}`;

		return (
			<div
				role="status"
				className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b bg-muted/30 px-4 py-2 lg:px-6"
			>
				<span className="flex items-center gap-2 text-foreground/90 text-sm">
					<CalendarClock
						className="h-4 w-4 text-muted-foreground"
						aria-hidden="true"
					/>
					{lead}
				</span>

				{/* Ticking part: hidden from screen readers (spec §21). */}
				<span
					className="flex items-center gap-3 text-sm tabular-nums"
					aria-hidden="true"
				>
					{remaining.days > 0 && (
						<CountdownUnit value={remaining.days} label="DIAS" />
					)}
					<CountdownUnit value={remaining.hours} label="HORAS" />
					<CountdownUnit value={remaining.minutes} label="MIN" />
					<CountdownUnit value={remaining.seconds} label="SEG" />
				</span>

				{/* Static, coarse-grained summary for assistive tech. */}
				<span className="sr-only">{accessible}</span>

				<Badge variant="outline" className="ml-auto hidden sm:inline-flex">
					{event.name}
				</Badge>
			</div>
		);
	}

	if (mode === "ONGOING") {
		const endAt = countdown?.endAt ?? composeEventEndAt(event);
		const startedAt = countdown?.startAt ?? composeEventStartAt(event);
		const endSummary =
			endAt && dateHelper.isToday(endAt)
				? `Termina às ${formatEventClock(endAt)}`
				: endAt
					? `Termina em ${dateHelper.formatShort(endAt)}`
					: null;

		return (
			<div
				role="status"
				className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b bg-muted/30 px-4 py-2 lg:px-6"
			>
				<span className="flex items-center gap-2 text-foreground/90 text-sm">
					<span
						className="inline-block h-2 w-2 rounded-full bg-amber-500"
						aria-hidden="true"
					/>
					O teu evento está a decorrer
				</span>
				{startedAt && (
					<span className="text-muted-foreground text-xs">
						Iniciado às {formatEventClock(startedAt)}
					</span>
				)}
				{endSummary && (
					<span className="text-muted-foreground text-xs">{endSummary}</span>
				)}
				<Badge variant="outline" className="ml-auto hidden sm:inline-flex">
					{event.name}
				</Badge>
			</div>
		);
	}

	// COMPLETED (spec §11): calm contextual message, no countdown.
	return (
		<div
			role="status"
			className="flex flex-wrap items-center gap-x-3 border-b bg-muted/30 px-4 py-2 lg:px-6"
		>
			<span className="text-muted-foreground text-sm">Evento concluído</span>
			<Badge variant="outline" className="ml-auto hidden sm:inline-flex">
				{event.name}
			</Badge>
		</div>
	);
}
