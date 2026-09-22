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
				className="invite-scene flex min-h-svh flex-col items-center overflow-x-hidden px-4 py-8 sm:py-12"
				style={{ WebkitTapHighlightColor: "transparent" }}
			>
				<div className="flex w-full flex-1 flex-col items-center justify-center">
					{children}
				</div>

				{footer ?? (
					<p className="invite-serif mt-10 pb-2 text-center text-[13px] text-[color:var(--ip-ink-soft)] italic">
						Com carinho, através da Muxima
					</p>
				)}
			</main>
		</MotionConfig>
	);
}
