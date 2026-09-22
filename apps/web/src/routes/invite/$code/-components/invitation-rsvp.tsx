import type { PublicInvitation } from "@muxima/api/shared/types/entities";
import { Check, Share2 } from "lucide-react";
import type { Variants } from "motion/react";
import { motion } from "motion/react";
import { dateHelper } from "@/shared/utils/date-helper";
import { RSVP_OPTIONS } from "../-constants/invitation.constants";
import { InviteOrnament } from "./invite-ornament";

export function InvitationRsvp({
	invitation,
	isResponding,
	onRespond,
	onShare,
	variants,
}: {
	invitation: PublicInvitation;
	isResponding: boolean;
	onRespond: (response: "CONFIRM" | "DECLINE" | "MAYBE") => void;
	onShare?: () => void;
	variants: Variants;
}) {
	const { canRespond, response, respondedAt } = invitation;
	const respondedLabel =
		response === "CONFIRM"
			? "Confirmei a minha presença"
			: response === "MAYBE"
				? "Fico por confirmar"
				: "Não vou conseguir ir";

	const activeClass =
		"bg-[color:var(--ip-accent)] text-[color:var(--ip-paper)]";

	return (
		<motion.section
			variants={variants}
			className="flex flex-col items-center px-6 pt-14 pb-12 text-center sm:px-10 sm:pb-16"
		>
			<InviteOrnament className="w-full" />

			{canRespond ? (
				<>
					<h2 className="invite-luxe mt-10 font-medium text-[10px] text-[color:var(--ip-ink)] uppercase">
						Confirma a tua presença
					</h2>
					<p className="invite-serif mt-2 text-[14px] text-[color:var(--ip-ink-soft)] italic">
						A tua resposta faz toda a diferença para nós.
					</p>

					<ul className="mt-8 w-full divide-y divide-[color:var(--ip-line)] border-[color:var(--ip-line)] border-y">
						{RSVP_OPTIONS.map((option) => {
							const selected = response === option.value;
							const Icon = option.icon;

							return (
								<li key={option.value}>
									<button
										type="button"
										disabled={isResponding}
										aria-pressed={selected}
										onClick={() =>
											onRespond(option.value as "CONFIRM" | "DECLINE" | "MAYBE")
										}
										className={`group flex w-full items-center gap-4 py-4 text-left transition-colors duration-200 disabled:cursor-wait ${
											selected
												? activeClass
												: "hover:bg-[rgba(168,135,63,0.08)]"
										}`}
									>
										<span
											className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
												selected
													? "border-[color:var(--ip-paper)]"
													: "border-[color:var(--ip-line)]"
											}`}
										>
											<Icon className="h-3.5 w-3.5" />
										</span>
										<span className="min-w-0 flex-1">
											<span className="invite-serif block font-medium text-[17px] leading-tight">
												{option.label}
											</span>
											<span
												className={`mt-0.5 block text-[12px] ${
													selected
														? "text-[color:rgba(255,253,248,0.9)]"
														: "text-[color:var(--ip-ink-soft)]"
												}`}
											>
												{option.description}
											</span>
										</span>
										{selected && (
											<span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[color:var(--ip-paper)] text-[color:var(--ip-accent)]">
												<Check className="h-3 w-3" />
											</span>
										)}
									</button>
								</li>
							);
						})}
					</ul>
				</>
			) : (
				<div className="mt-10 w-full rounded-lg border border-[color:var(--ip-line)] px-6 py-6 text-center">
					<p className="invite-serif text-[15px] text-[color:var(--ip-ink-soft)] italic">
						Já não é possível alterar a resposta a este convite.
					</p>
				</div>
			)}

			{response && (
				<p className="mt-6 text-[12px] text-[color:var(--ip-ink-soft)]">
					{respondedLabel}
					{respondedAt && ` · ${dateHelper.formatMedium(respondedAt)}`}
				</p>
			)}

			{onShare && (
				<button
					type="button"
					onClick={onShare}
					className="mt-8 flex items-center gap-2 text-[11px] text-[color:var(--ip-accent)] uppercase tracking-[0.2em] transition-opacity hover:opacity-70"
				>
					<Share2 className="h-3.5 w-3.5" />
					Partilhar
				</button>
			)}
		</motion.section>
	);
}
