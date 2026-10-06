import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * UX contracts of this header:
 *  1. the operational lock — on a locked event the mutation buttons stay
 *     visible but disabled, carrying the PT-PT reason as feedback;
 *  2. authorization — without `guests.create` the create button is not drawn
 *     at all (hidden ≠ disabled). The backend re-validates both independently.
 */

const hoisted = vi.hoisted(() => ({
	eventId: "evt_lock",
	/** Flip per describe-block to exercise both authorization answers. */
	canCreate: true,
}));

vi.mock("@tanstack/react-router", () => ({
	useParams: () => ({ eventId: hoisted.eventId }),
}));

// The real hook would query `events.getMyAccess`; the header only needs the
// boolean, and the hook's own behaviour is covered by `use-can` consumers.
vi.mock("@/shared/hooks/use-can", () => ({
	useEventCan: () => hoisted.canCreate,
}));

// Not relevant for this assertion and pulls in the export machinery.
vi.mock("@/shared/components/export-menu", () => ({
	ExportMenu: () => null,
}));

import { GuestsHeader } from "../guests-header";

const DAY_MS = 86_400_000;

function makeEvent(overrides: Record<string, unknown> = {}) {
	return {
		id: "evt_lock",
		name: "Casamento",
		type: "WEDDING",
		status: "CONFIRMED",
		eventDate: new Date(Date.now() + DAY_MS).toISOString(),
		startTime: "18:00",
		endTime: "23:00",
		maxGuestsPerInvitation: 2,
		...overrides,
	};
}

function renderHeader(event: Record<string, unknown>, onAddGuest = vi.fn()) {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	client.setQueryData(["events", "detail", "evt_lock"], event);

	function Wrapper({ children }: { children: ReactNode }) {
		return (
			<QueryClientProvider client={client}>{children}</QueryClientProvider>
		);
	}

	render(
		<Wrapper>
			<GuestsHeader eventId="evt_lock" onAddGuest={onAddGuest} />
		</Wrapper>,
	);

	return onAddGuest;
}

describe("GuestsHeader — event lock", () => {
	beforeEach(() => {
		hoisted.eventId = "evt_lock";
		hoisted.canCreate = true;
	});

	it("disables the create button with the PT-PT reason when CANCELLED", async () => {
		const onAddGuest = renderHeader(makeEvent({ status: "CANCELLED" }));
		const button = screen.getByRole("button", { name: /adicionar convidado/i });

		expect(button).toBeDisabled();
		expect(button).toHaveAttribute(
			"title",
			"Este evento foi cancelado e não permite alterações.",
		);

		await userEvent.click(button);
		expect(onAddGuest).not.toHaveBeenCalled();
	});

	it("disables the create button when the event is past the 5-day window", () => {
		const at = new Date(Date.now() - 6 * 86_400_000);
		const pad = (value: number) => String(value).padStart(2, "0");

		renderHeader(
			makeEvent({
				status: "CONFIRMED",
				eventDate: at.toISOString(),
				startTime: `${pad(at.getHours())}:${pad(at.getMinutes())}`,
			}),
		);

		expect(
			screen.getByRole("button", { name: /adicionar convidado/i }),
		).toBeDisabled();
	});

	it("keeps the create button usable for a future event", async () => {
		const onAddGuest = renderHeader(makeEvent());
		const button = screen.getByRole("button", { name: /adicionar convidado/i });

		expect(button).toBeEnabled();

		await userEvent.click(button);
		expect(onAddGuest).toHaveBeenCalledTimes(1);
	});

	it("keeps the create button usable while the event is inside the 5-day window", () => {
		const at = new Date(Date.now() - 2 * 86_400_000);
		const pad = (value: number) => String(value).padStart(2, "0");

		renderHeader(
			makeEvent({
				status: "COMPLETED",
				eventDate: at.toISOString(),
				startTime: `${pad(at.getHours())}:${pad(at.getMinutes())}`,
			}),
		);

		expect(
			screen.getByRole("button", { name: /adicionar convidado/i }),
		).toBeEnabled();
	});
});

describe("GuestsHeader — authorization", () => {
	beforeEach(() => {
		hoisted.eventId = "evt_lock";
	});

	it("hides the create button entirely without guests.create", () => {
		hoisted.canCreate = false;
		renderHeader(makeEvent());

		// Hidden, not disabled: the action is not the caller's to attempt.
		expect(
			screen.queryByRole("button", { name: /adicionar convidado/i }),
		).toBeNull();
	});

	it("shows the create button when guests.create is held", () => {
		hoisted.canCreate = true;
		renderHeader(makeEvent());

		expect(
			screen.getByRole("button", { name: /adicionar convidado/i }),
		).toBeInTheDocument();
	});
});
