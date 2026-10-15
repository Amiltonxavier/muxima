import type {
	PublicInvitation,
	PublicScheduleItem,
} from "@muxima/api/shared/types/entities";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { InviteBook } from "../invite-book";

function makeInvitation(
	overrides: Partial<PublicInvitation> = {},
): PublicInvitation {
	return {
		code: "MUX-ABCD-EFGH",
		url: "https://muxima.ao/invite/MUX-ABCD-EFGH",
		qrCode: "<svg/>",
		canRespond: true,
		rsvpBlockedReason: null,
		response: null,
		respondedAt: null,
		guests: [],
		event: {
			id: "evt_1",
			name: "Casamento Ana & Carlos",
			type: "WEDDING",
			status: "CONFIRMED",
			eventDate: new Date(Date.now() + 86_400_000 * 30),
			startTime: "15:00",
			endTime: null,
			venueName: "Quinta do Mussulo",
			address: null,
			neighborhood: null,
			municipality: null,
			province: null,
			description: null,
			code: "EVT-CODE-01",
		},
		host: { name: "Ana" },
		...overrides,
	} as never;
}

const SCHEDULE: PublicScheduleItem[] = [
	{
		title: "Cerimónia",
		description: null,
		startAt: new Date("2026-12-18T16:00:00.000Z"),
		endAt: null,
		location: null,
	},
	{
		title: "Jantar",
		description: null,
		startAt: new Date("2026-12-18T20:00:00.000Z"),
		endAt: null,
		location: null,
	},
];

function renderBook(
	overrides: Partial<PublicInvitation> = {},
	options: { reduceMotion?: boolean } = {},
) {
	const onRespond = vi.fn();
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	const utils = render(
		<QueryClientProvider client={client}>
			<InviteBook
				invitation={makeInvitation(overrides)}
				reduceMotion={options.reduceMotion ?? false}
				isResponding={false}
				onRespond={onRespond}
				onShare={undefined}
				scheduleItems={SCHEDULE}
				scheduleLoading={false}
				scheduleError={false}
			/>
		</QueryClientProvider>,
	);
	return { onRespond, ...utils };
}

/**
 * The book renders the desktop spread and the mobile page side by side in the
 * DOM (which one is visible is decided by CSS media queries), so queries that
 * can match both trees must tolerate duplicates.
 */
it("keeps the invite sections before the QR on the left page", () => {
	const { container } = renderBook();
	const left = container.querySelector(
		".invite-book__page--left",
	) as HTMLElement;

	expect(within(left).getAllByText(/Confirma a tua presença/i).length).toBe(1);
	expect(within(left).getAllByText("Guarda este convite").length).toBe(1);
});

it("hides the countdown once RSVP is no longer possible", () => {
	renderBook({ canRespond: false, rsvpBlockedReason: "EVENT_FINISHED" });

	expect(
		screen.queryAllByLabelText("Contagem decrescente para o evento"),
	).toHaveLength(0);
});

it("keeps the countdown while the RSVP is responseable", () => {
	renderBook();

	expect(
		screen.getAllByLabelText("Contagem decrescente para o evento").length,
	).toBeGreaterThan(0);
});

it("renders the programme page with real schedule data", () => {
	const { container } = renderBook();
	const right = container.querySelector(
		".invite-book__page--right",
	) as HTMLElement;

	expect(
		within(right).getByRole("heading", { name: /Programação/i }),
	).toBeInTheDocument();
	expect(within(right).getByText("Cerimónia")).toBeInTheDocument();
	expect(within(right).getByText("Jantar")).toBeInTheDocument();
});

it("exposes accessible navigation between the two pages", async () => {
	const user = userEvent.setup();
	const { container } = renderBook({}, { reduceMotion: true });
	const mobile = container.querySelector(".invite-book__mobile") as HTMLElement;

	// Both pages are reachable through labelled buttons.
	expect(
		within(mobile).getByRole("button", { name: "Ir para Programa" }),
	).toBeInTheDocument();

	await user.click(
		within(mobile).getByRole("button", { name: "Ir para Programa" }),
	);

	expect(
		within(mobile).getByRole("button", { name: "Ir para Convite" }),
	).toBeInTheDocument();
});

it("flips to the programme and back on mobile", async () => {
	const user = userEvent.setup();
	const { container } = renderBook({}, { reduceMotion: true });
	const mobile = container.querySelector(".invite-book__mobile") as HTMLElement;

	await user.click(
		within(mobile).getByRole("button", { name: "Ir para Programa" }),
	);
	expect(
		within(mobile).getByRole("heading", { name: /Programação/i }),
	).toBeInTheDocument();

	await user.click(
		within(mobile).getByRole("button", { name: "Ir para Convite" }),
	);
	expect(
		within(mobile).getAllByText(/Confirma a tua presença/i).length,
	).toBeGreaterThan(0);
});

it("accepts an RSVP response through the left page", () => {
	const { onRespond } = renderBook();

	fireEvent.click(screen.getAllByText(/Confirmo a minha presença/i)[0]);
	expect(onRespond).toHaveBeenCalledWith("CONFIRM");
});
