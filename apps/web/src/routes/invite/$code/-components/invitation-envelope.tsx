import type { PublicInvitation } from "@muxima/api/shared/types/entities";
import { ChevronDown } from "lucide-react";
import { motion } from "motion/react";
import {
	cardV,
	envelopeRoot,
	flapV,
	hintPulse,
} from "../-constants/invitation-motion";
import type { InvitationPhase } from "../-hooks/use-invitation-opening";
import {
	getDateParts,
	getRecipientInitials,
	getRecipientName,
} from "../-utils/invitation.utils";

export function InvitationEnvelope({
	invitation,
	phase,
	reduceMotion,
	onOpen,
}: {
	invitation: PublicInvitation;
	phase: InvitationPhase;
	reduceMotion: boolean;
	onOpen: () => void;
}) {
	const monogram = getRecipientInitials(invitation);
	const recipient = getRecipientName(invitation);
	const date = getDateParts(invitation.event.eventDate);

	const closed = phase === "closed";

	return (
		<div className="flex w-full max-w-[420px] flex-col items-center">
			<motion.button
				type="button"
				aria-label="Abrir o convite"
				aria-expanded={!closed}
				disabled={!closed}
				onClick={onOpen}
				initial={false}
				whileHover={closed ? { scale: 1.014, y: -4 } : undefined}
				whileTap={closed ? { scale: 0.982 } : undefined}
				transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
				className="envelope-focus cursor-pointer text-left"
			>
				<div className="w-[86vw] max-w-[400px] sm:w-[400px]">
					<div className="envelope">
						<motion.div
							className="envelope__scene"
							variants={envelopeRoot(reduceMotion)}
							animate={phase}
							initial={false}
						>
							<div className="envelope__inner" />

							<motion.div
								className="envelope__card"
								variants={cardV(reduceMotion)}
								animate={phase}
								initial={false}
								aria-hidden="true"
							>
								<motion.div className="flex h-full w-full flex-col items-center justify-center gap-1.5">
									{monogram && (
										<span className="invite-serif font-medium text-[color:var(--ip-accent)] text-lg">
											{monogram}
										</span>
									)}
									<span className="ornament-rule h-px w-14" />
									<span className="invite-serif text-[11px] text-[color:var(--ip-ink-soft)] italic">
										A nossa alegria será completa
									</span>
								</motion.div>
							</motion.div>

							<div className="envelope__front">
								<div className="absolute inset-x-[10%] top-[20%] bottom-[8%] flex flex-col items-center justify-between text-center text-[color:var(--ip-ink)]">
									{recipient ? (
										<span className="invite-serif max-w-full truncate text-[15px] text-[color:var(--ip-ink-soft)] italic">
											Para {recipient}
										</span>
									) : (
										<span className="invite-serif text-[15px] text-[color:var(--ip-ink-soft)] italic">
											És convidado(a)
										</span>
									)}

									<div className="flex flex-col items-center gap-2">
										{monogram && (
											<span className="envelope-stamp invite-serif flex h-16 w-16 rotate-45 items-center justify-center sm:h-[4.5rem] sm:w-[4.5rem]">
												<span className="-rotate-45 font-medium text-[22px] tracking-wide sm:text-2xl">
													{monogram}
												</span>
											</span>
										)}
										<span className="invite-sub-luxe font-medium text-[9px] text-[color:var(--ip-ink)] uppercase">
											Convite
										</span>
									</div>

									{date ? (
										<span className="invite-serif text-[13px] text-[color:var(--ip-accent)]">
											{date.dayLabel} · {date.month.substring(0, 3)} ·{" "}
											{date.year}
										</span>
									) : (
										<span aria-hidden="true" />
									)}
								</div>
							</div>

							<motion.div
								className="envelope__flap"
								variants={flapV(reduceMotion)}
								animate={phase}
								initial={false}
								aria-hidden="true"
							/>
						</motion.div>
					</div>
				</div>

				<motion.span
					variants={hintPulse(reduceMotion)}
					animate="idle"
					initial="idle"
					className="mt-6 flex flex-col items-center gap-1"
				>
					<span className="invite-sub-luxe font-medium text-[10px] text-[color:var(--ip-ink-soft)] uppercase">
						Abrir convite
					</span>
					<ChevronDown className="h-4 w-4 text-[color:var(--ip-accent)]" />
				</motion.span>
			</motion.button>
		</div>
	);
}
