import type { LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { InviteOrnament } from "./invite-ornament";

export function InviteLoading() {
	return (
		<div className="flex flex-col items-center gap-6 py-20 text-center">
			<motion.span
				animate={{ opacity: [0.35, 1, 0.35] }}
				transition={{
					duration: 1.8,
					repeat: Number.POSITIVE_INFINITY,
					ease: "easeInOut",
				}}
				className="inline-block h-2.5 w-2.5 rotate-45 border border-[color:var(--ip-accent)]"
				aria-hidden="true"
			/>
			<p className="invite-serif text-[color:var(--ip-ink-soft)] text-lg italic">
				A preparar o convite...
			</p>
		</div>
	);
}

export function InviteFeedback({
	icon,
	title,
	description,
}: {
	icon: LucideIcon;
	title: string;
	description: ReactNode;
}) {
	const Icon = icon;

	return (
		<div className="flex w-full max-w-md flex-col items-center px-6 py-16 text-center">
			<span className="envelope-stamp flex h-16 w-16 rotate-45 items-center justify-center">
				<Icon
					className="h-6 w-6 -rotate-45 text-[color:var(--ip-accent)]"
					aria-hidden="true"
				/>
			</span>
			<h1 className="invite-serif mt-8 font-medium text-3xl text-[color:var(--ip-ink)]">
				{title}
			</h1>
			<p className="invite-serif mt-3 max-w-sm text-[16px] text-[color:var(--ip-ink-soft)] italic leading-relaxed">
				{description}
			</p>
			<InviteOrnament className="mt-8 w-full" />
			<p className="mt-8 text-[color:var(--ip-ink-soft)] text-sm">
				Se achas que isto é um erro, contacta o anfitrião do evento.
			</p>
		</div>
	);
}
