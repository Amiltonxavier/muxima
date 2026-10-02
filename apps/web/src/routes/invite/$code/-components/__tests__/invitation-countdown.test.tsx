import type { PublicInvitation } from "@muxima/api/shared/types/entities";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InvitationCountdown } from "../invitation-countdown";

function makeInvitation(
	eventDate: string | null,
): PublicInvitation["event"] & { code: string } {
	return {
		id: "evt_1",
		name: "Casamento Ana & Carlos",
		type: "WEDDING",
		status: "CONFIRMED",
		eventDate: eventDate ? new Date(eventDate) : null,
		startTime: "15:00",
		endTime: "02:00",
		venueName: "Quinta do Mussulo",
		address: null,
		neighborhood: null,
		municipality: null,
		province: null,
		description: null,
		code: "MUX-ABCD-EFGH",
	} as never;
}

describe("InvitationCountdown", () => {
	it("renders day/hour/minute/second labels while the event is ahead", () => {
		const future = new Date(Date.now() + 3 * 86_400_000 + 7_200_000);
		render(
			<InvitationCountdown
				invitation={{ event: makeInvitation(future.toISOString()) } as never}
			/>,
		);

		expect(
			screen.getByLabelText("Contagem decrescente para o evento"),
		).toBeInTheDocument();
		for (const label of ["dias", "horas", "min", "seg"]) {
			expect(screen.getAllByText(label).length).toBeGreaterThan(0);
		}
	});

	it("renders nothing when the event has no date", () => {
		const { container } = render(
			<InvitationCountdown
				invitation={{ event: makeInvitation(null) } as never}
			/>,
		);

		expect(container).toBeEmptyDOMElement();
	});

	it("renders nothing once the target has passed", () => {
		const past = new Date(Date.now() - 86_400_000);
		const { container } = render(
			<InvitationCountdown
				invitation={{ event: makeInvitation(past.toISOString()) } as never}
			/>,
		);

		expect(container).toBeEmptyDOMElement();
	});
});
