import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

export function InviteAtmosphere({
	children,
	footer,
}: {
	children: ReactNode;
	footer?: ReactNode;
}) {
	return (
		<MotionConfig reducedMotion="user">
			<main
				className="invite-scene flex h-svh flex-col items-center overflow-hidden px-4 py-6 sm:py-8"
				style={{ WebkitTapHighlightColor: "transparent" }}
			>
				<div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center">
					{children}
				</div>

				{footer ?? (
					<p className="invite-serif shrink-0 pt-4 text-center text-[13px] text-[color:var(--ip-ink-soft)] italic">
						Com carinho, através da Muxima
					</p>
				)}
			</main>
		</MotionConfig>
	);
}
