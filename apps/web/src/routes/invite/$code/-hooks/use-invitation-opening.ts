import { useReducedMotion } from "motion/react";
import { useCallback, useMemo, useState } from "react";

export type InvitationPhase = "closed" | "opening" | "open";

const FLAP_AND_CARD_MS = 640;

export function useInvitationOpening() {
	const reduced = useReducedMotion();
	const [phase, setPhase] = useState<InvitationPhase>("closed");

	const open = useCallback(() => {
		if (reduced) {
			setPhase("open");
			return;
		}
		setPhase("opening");
		window.setTimeout(() => setPhase("open"), FLAP_AND_CARD_MS);
	}, [reduced]);

	return useMemo(
		() => ({
			phase,
			reduceMotion: Boolean(reduced),
			open,
		}),
		[phase, reduced, open],
	);
}
