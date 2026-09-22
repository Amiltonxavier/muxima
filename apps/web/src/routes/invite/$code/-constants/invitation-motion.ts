import type { Variants } from "motion/react";

export const EASE_LUXE = [0.22, 1, 0.36, 1] as const;

export function clampForReduced(reduced: boolean, duration: number): number {
	return reduced ? 0 : duration;
}

export const revealContainer = (reduced: boolean): Variants => ({
	hidden: {},
	show: {
		transition: {
			staggerChildren: reduced ? 0 : 0.09,
			delayChildren: reduced ? 0 : 0.12,
		},
	},
});

export const revealItem = (reduced: boolean): Variants => ({
	hidden: { opacity: 0, y: reduced ? 0 : 16 },
	show: {
		opacity: 1,
		y: 0,
		transition: {
			duration: clampForReduced(reduced, 0.65),
			ease: EASE_LUXE,
		},
	},
});

export const envelopeRoot = (reduced: boolean): Variants => ({
	closed: {
		scale: 1,
		y: 0,
		opacity: 1,
		transition: { duration: clampForReduced(reduced, 0.2) },
	},
	opening: {
		scale: reduced ? 1 : 0.985,
		y: 0,
		transition: { duration: clampForReduced(reduced, 0.14) },
	},
	open: {
		scale: reduced ? 1 : 0.94,
		y: reduced ? 0 : 18,
		opacity: 0,
		transition: {
			duration: clampForReduced(reduced, 0.42),
			delay: 0.45,
			ease: EASE_LUXE,
		},
	},
});

export const flapV = (reduced: boolean): Variants => ({
	closed: { rotateX: 0, transition: { duration: 0 } },
	opening: {
		rotateX: reduced ? 0 : -170,
		transition: {
			duration: clampForReduced(reduced, 0.52),
			ease: [0.45, 0.03, 0.3, 1],
		},
	},
	open: {
		rotateX: reduced ? 0 : -182,
		transition: { duration: reduced ? 0 : 0.28, ease: [0.3, 0.4, 0.4, 1] },
	},
});

export const cardV = (reduced: boolean): Variants => ({
	closed: { y: "0%", opacity: 1, rotateX: 0 },
	opening: {
		y: reduced ? "0%" : "-34%",
		rotateX: 0,
		opacity: 1,
		transition: {
			duration: clampForReduced(reduced, 0.5),
			ease: EASE_LUXE,
		},
	},
	open: {
		y: reduced ? "0%" : "-58%",
		rotateX: reduced ? 0 : 4,
		scale: reduced ? 1 : 1.06,
		transition: { duration: clampForReduced(reduced, 0.4), ease: EASE_LUXE },
	},
});

export const hintPulse = (reduced: boolean): Variants => ({
	idle: {
		y: 0,
		opacity: 0.75,
		transition: reduced
			? { duration: 0 }
			: {
					repeat: Number.POSITIVE_INFINITY,
					duration: 2,
					ease: "easeInOut",
					repeatType: "reverse",
				},
	},
});
