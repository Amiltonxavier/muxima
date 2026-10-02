import type { PublicScheduleItem } from "@muxima/api/shared/types/entities";
import type { Variants } from "motion/react";
import { motion } from "motion/react";
import { dateHelper } from "@/shared/utils/date-helper";
import { InviteOrnament } from "./invite-ornament";

/**
 * Public programme timeline — read-only data from the dedicated public
 * schedule endpoint. Titles come from the real schedule; nothing is hardcoded.
 *
 * Visual: minimal, romantic, botanical. One continuous vertical line, generous
 * whitespace, sage-green accents only.
 */
export function InvitationSchedule({
	items,
	isLoading,
	isError,
	variants,
}: {
	items: PublicScheduleItem[];
	isLoading: boolean;
	isError: boolean;
	variants?: Variants;
}) {
	return (
		<motion.section
			variants={variants}
			className="relative flex flex-col px-6 pt-14 sm:px-10"
			aria-labelledby="invite-schedule-title"
		>
			{/* Botanical corner ornaments — decorative only */}
			<svg
				aria-hidden="true"
				className="pointer-events-none absolute -top-1 -left-2 h-16 w-16 text-[color:var(--ip-accent-soft)] opacity-45"
				viewBox="0 0 64 64"
				fill="none"
			>
				<path
					d="M62 2C40 6 18 18 10 40c-2 6-3 12-2 22"
					stroke="currentColor"
					strokeWidth="1"
					strokeLinecap="round"
				/>
				<path
					d="M50 10c-8 0-16 4-20 12M40 18c-6 2-11 8-12 14M56 20c-7-1-14 2-18 8"
					stroke="currentColor"
					strokeWidth="0.8"
					strokeLinecap="round"
				/>
			</svg>
			<svg
				aria-hidden="true"
				className="pointer-events-none absolute -right-2 bottom-24 h-16 w-16 rotate-180 text-[color:var(--ip-accent-soft)] opacity-45"
				viewBox="0 0 64 64"
				fill="none"
			>
				<path
					d="M62 2C40 6 18 18 10 40c-2 6-3 12-2 22"
					stroke="currentColor"
					strokeWidth="1"
					strokeLinecap="round"
				/>
				<path
					d="M50 10c-8 0-16 4-20 12M40 18c-6 2-11 8-12 14M56 20c-7-1-14 2-18 8"
					stroke="currentColor"
					strokeWidth="0.8"
					strokeLinecap="round"
				/>
			</svg>

			<p className="invite-luxe text-center font-medium text-[10px] text-[color:var(--ip-accent)] uppercase">
				programa
			</p>
			<h2
				id="invite-schedule-title"
				className="invite-serif mt-5 text-center font-medium text-[color:var(--ip-ink)] text-xl uppercase tracking-[0.18em] sm:text-2xl"
			>
				Programação
			</h2>

			<InviteOrnament className="mt-6 w-full" />

			{isLoading ? (
				<div className="mt-10 space-y-6" aria-busy="true">
					{[0, 1, 2].map((row) => (
						<div
							key={row}
							className="h-10 animate-pulse rounded bg-[color:var(--ip-paper-deep)]"
						/>
					))}
				</div>
			) : isError ? (
				<p className="invite-serif mt-10 text-center text-[15px] text-[color:var(--ip-ink-soft)] italic">
					Não foi possível carregar o programa.
				</p>
			) : items.length === 0 ? (
				<p className="invite-serif mt-10 text-center text-[15px] text-[color:var(--ip-ink-soft)] italic">
					O programa será partilhado em breve.
				</p>
			) : (
				<ol className="relative mt-10 space-y-8 pl-7">
					{/* continuous vertical line */}
					<span
						aria-hidden="true"
						className="absolute top-1 bottom-1 left-[3px] w-px bg-gradient-to-b from-[color:var(--ip-accent-soft)] via-[color:var(--ip-line)] to-transparent"
					/>
					{items.map((item) => (
						<li
							key={`${item.startAt.getTime()}-${item.title}`}
							className="relative"
						>
							<span
								aria-hidden="true"
								className="absolute top-[0.45rem] -left-7 h-[7px] w-[7px] rotate-45 border border-[color:var(--ip-accent)] bg-[color:var(--ip-paper)]"
							/>
							<p className="invite-luxe font-medium text-[10px] text-[color:var(--ip-accent)] uppercase">
								{dateHelper.formatTime(item.startAt)}
								{item.endAt && (
									<span className="text-[color:var(--ip-ink-soft)]">
										{" "}
										— {dateHelper.formatTime(item.endAt)}
									</span>
								)}
							</p>
							<h3 className="invite-serif mt-1 text-[17px] text-[color:var(--ip-ink)] leading-tight">
								{item.title}
							</h3>
							{item.description && (
								<p className="mt-1 text-[13px] text-[color:var(--ip-ink-soft)] leading-relaxed">
									{item.description}
								</p>
							)}
							{item.location && (
								<p className="mt-1 text-[11px] text-[color:var(--ip-ink-soft)] uppercase tracking-[0.14em]">
									{item.location}
								</p>
							)}
						</li>
					))}
				</ol>
			)}
		</motion.section>
	);
}
