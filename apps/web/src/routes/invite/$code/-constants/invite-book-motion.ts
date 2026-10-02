import type { Variants } from "motion/react";
import { clampForReduced } from "../-constants/invitation-motion";

export type InvitePageId = "invite" | "schedule";

export const INVITE_PAGE_LABELS: Record<InvitePageId, string> = {
	invite: "Convite",
	schedule: "Programa",
};

export const pageFlipVariants = (reduced: boolean): Variants => ({
	invite: {
		x: "0%",
		opacity: 1,
		transition: {
			duration: clampForReduced(reduced, 0.38),
			ease: [0.22, 1, 0.36, 1],
		},
	},
	schedule: {
		x: reduced ? "0%" : "-18%",
		opacity: reduced ? 0 : 0.25,
		transition: {
			duration: clampForReduced(reduced, 0.38),
			ease: [0.22, 1, 0.36, 1],
		},
	},
});

export const scheduleFlipVariants = (reduced: boolean): Variants => ({
	invite: {
		x: reduced ? "0%" : "18%",
		opacity: reduced ? 0 : 0.25,
		transition: {
			duration: clampForReduced(reduced, 0.38),
			ease: [0.22, 1, 0.36, 1],
		},
	},
	schedule: {
		x: "0%",
		opacity: 1,
		transition: {
			duration: clampForReduced(reduced, 0.38),
			ease: [0.22, 1, 0.36, 1],
		},
	},
});
