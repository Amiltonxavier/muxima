import type {
	PublicInvitation,
	PublicScheduleItem,
} from "@muxima/api/shared/types/entities";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useMemo, useState } from "react";
import { revealContainer, revealItem } from "../-constants/invitation-motion";
import {
	INVITE_PAGE_LABELS,
	type InvitePageId,
	pageFlipVariants,
	scheduleFlipVariants,
} from "../-constants/invite-book-motion";
import { InvitePageLeft } from "./invite-page";
import { SchedulePageRight } from "./schedule-page";

function PageNavButton({
	target,
	active,
	direction,
	reduced,
	onNavigate,
}: {
	target: InvitePageId;
	active: boolean;
	direction: "left" | "right";
	reduced: boolean;
	onNavigate: (page: InvitePageId) => void;
}) {
	const Icon = direction === "left" ? ArrowLeft : ArrowRight;

	return (
		<button
			type="button"
			onClick={() => onNavigate(target)}
			aria-label={`Ir para ${INVITE_PAGE_LABELS[target]}`}
			className="invite-luxe invite-book__nav-btn"
		>
			<motion.span
				aria-hidden="true"
				className="inline-flex"
				whileTap={reduced ? undefined : { x: direction === "left" ? -2 : 2 }}
			>
				<Icon className="h-3 w-3" />
			</motion.span>
			{INVITE_PAGE_LABELS[target]}
			<span className="sr-only">{active ? " (página atual)" : ""}</span>
		</button>
	);
}

/**
 * The open invitation book. On wide screens it renders as two facing pages —
 * the invite on the left, the programme on the right — inside a viewport-bound
 * container (no body scroll; each page scrolls its own content when needed).
 * On narrow screens it becomes a single page with a flip between the two.
 */
export function InviteBook({
	invitation,
	reduceMotion,
	isResponding,
	onRespond,
	onShare,
	scheduleItems,
	scheduleLoading,
	scheduleError,
}: {
	invitation: PublicInvitation;
	reduceMotion: boolean;
	isResponding: boolean;
	onRespond: (response: "CONFIRM" | "DECLINE" | "MAYBE") => void;
	onShare?: () => void;
	scheduleItems: PublicScheduleItem[];
	scheduleLoading: boolean;
	scheduleError: boolean;
}) {
	const [page, setPage] = useState<InvitePageId>("invite");
	const container = revealContainer(reduceMotion);
	const item = revealItem(reduceMotion);

	const goToSchedule = useCallback(() => setPage("schedule"), []);
	const goToInvite = useCallback(() => setPage("invite"), []);

	const shared = useMemo(
		() => ({ invitation, isResponding, onRespond, onShare, variants: item }),
		[invitation, isResponding, onRespond, onShare, item],
	);

	const mobileNav = (target: InvitePageId, direction: "left" | "right") => (
		<div className="invite-book__mobile-nav">
			<PageNavButton
				target={target}
				active={page === target}
				direction={direction}
				reduced={reduceMotion}
				onNavigate={target === "schedule" ? goToSchedule : goToInvite}
			/>
		</div>
	);

	return (
		<div className="invite-book" data-page={page}>
			{/* Desktop / tablet: two facing pages */}
			<motion.article
				initial="hidden"
				animate="show"
				variants={container}
				className="invite-book__spread"
			>
				<InvitePageLeft
					{...shared}
					isResponding={shared.isResponding}
					navigation={
						<div className="invite-book__desktop-nav invite-book__desktop-nav--right">
							<PageNavButton
								target="schedule"
								active={page === "schedule"}
								direction="right"
								reduced={reduceMotion}
								onNavigate={goToSchedule}
							/>
						</div>
					}
				/>
				<div className="invite-book__spine" aria-hidden="true" />
				<SchedulePageRight
					invitation={shared.invitation}
					scheduleItems={scheduleItems}
					scheduleLoading={scheduleLoading}
					scheduleError={scheduleError}
					variants={item}
					navigation={
						<div className="invite-book__desktop-nav invite-book__desktop-nav--left">
							<PageNavButton
								target="invite"
								active={page === "invite"}
								direction="left"
								reduced={reduceMotion}
								onNavigate={goToInvite}
							/>
						</div>
					}
				/>
			</motion.article>

			{/* Mobile: single page with a flip between the two pages */}
			<div className="invite-book__mobile">
				<AnimatePresence mode="wait" initial={false}>
					{page === "invite" ? (
						<motion.div
							key="mobile-invite"
							initial={reduceMotion ? undefined : "invite"}
							animate="invite"
							exit={reduceMotion ? undefined : "schedule"}
							variants={pageFlipVariants(reduceMotion)}
						>
							<InvitePageLeft
								{...shared}
								isResponding={shared.isResponding}
								navigation={mobileNav("schedule", "right")}
							/>
						</motion.div>
					) : (
						<motion.div
							key="mobile-schedule"
							initial={reduceMotion ? undefined : "invite"}
							animate="schedule"
							exit={reduceMotion ? undefined : "invite"}
							variants={scheduleFlipVariants(reduceMotion)}
						>
							<SchedulePageRight
								invitation={shared.invitation}
								scheduleItems={scheduleItems}
								scheduleLoading={scheduleLoading}
								scheduleError={scheduleError}
								variants={item}
								navigation={mobileNav("invite", "left")}
							/>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</div>
	);
}
