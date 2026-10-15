import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { EventListItem } from "../../-types/events.types";
import { EventCard } from "../event-card";

/**
 * UX contract of a card carrying an invitation.
 *
 * Being invited is not being a member: the event is previewable but still
 * guarded by `/events/$eventId` (403 without an ACTIVE membership). Offering
 * "Ver detalhes" for it would only bounce the visitor, so the card swaps that
 * link for Aceitar / Recusar, and drops the delete action — it is not the
 * visitor's event to remove.
 */

vi.mock("@tanstack/react-router", () => ({
	// The real `Link` renders an anchor; this test only cares about the label
	// and the click wiring, so a plain button avoids the router entirely.
	Link: ({
		children,
		onClick,
	}: {
		children?: ReactNode;
		onClick?: () => void;
	}) => (
		<button type="button" onClick={onClick}>
			{children}
		</button>
	),
}));

const DAY_MS = 86_400_000;

function makeEvent(overrides: Record<string, unknown> = {}): EventListItem {
	return {
		id: "evt_1",
		name: "Casamento",
		type: "WEDDING",
		status: "CONFIRMED",
		eventDate: new Date(Date.now() + DAY_MS).toISOString(),
		venueName: "Casa do Povo",
		invitation: null,
		...overrides,
	} as unknown as EventListItem;
}

function renderCard(event: EventListItem, props: Record<string, unknown> = {}) {
	const onDelete = vi.fn();
	render(
		<EventCard
			event={event}
			onDelete={onDelete}
			{...(props as Partial<React.ComponentProps<typeof EventCard>>)}
		/>,
	);
	return onDelete;
}

describe("EventCard — plain event", () => {
	it("offers the details link and the delete action", () => {
		renderCard(makeEvent());

		expect(screen.getByText(/ver detalhes/i)).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Eliminar evento" }),
		).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /aceitar/i })).toBeNull();
	});

	it("deletes the event it owns", async () => {
		const onDelete = renderCard(makeEvent());
		await userEvent.click(
			screen.getByRole("button", { name: "Eliminar evento" }),
		);

		expect(onDelete).toHaveBeenCalledWith("evt_1");
	});
});

describe("EventCard — pending invitation", () => {
	const invited = makeEvent({
		invitation: { id: "eiv_1", role: "EDITOR" },
	});

	it("marks the card as a pending invite instead of a detail link", () => {
		renderCard(invited);

		expect(screen.getByText("Convite pendente")).toBeInTheDocument();
		expect(screen.queryByText(/ver detalhes/i)).toBeNull();
		// Not the visitor's event yet: there is nothing to remove.
		expect(
			screen.queryByRole("button", { name: "Eliminar evento" }),
		).toBeNull();
	});

	it("states the offered role", () => {
		renderCard(invited);

		expect(screen.getByText(/convidámos-te como/i)).toBeInTheDocument();
		expect(screen.getByText("Editor")).toBeInTheDocument();
	});

	it("accepts the invite with its own id", async () => {
		const onAccept = vi.fn();
		const onDecline = vi.fn();
		renderCard(invited, { onAccept, onDecline });

		await userEvent.click(screen.getByRole("button", { name: /aceitar/i }));

		expect(onAccept).toHaveBeenCalledTimes(1);
		expect(onAccept.mock.calls[0]?.[0]).toMatchObject({
			id: "evt_1",
			invitation: { id: "eiv_1" },
		});
		expect(onDecline).not.toHaveBeenCalled();
	});

	it("declines the invite with its own id", async () => {
		const onAccept = vi.fn();
		const onDecline = vi.fn();
		renderCard(invited, { onAccept, onDecline });

		await userEvent.click(screen.getByRole("button", { name: /recusar/i }));

		expect(onDecline).toHaveBeenCalledTimes(1);
		expect(onDecline.mock.calls[0]?.[0]).toMatchObject({
			invitation: { id: "eiv_1" },
		});
		expect(onAccept).not.toHaveBeenCalled();
	});

	it("disables both actions while its own invite is in flight", () => {
		renderCard(invited, {
			onAccept: vi.fn(),
			onDecline: vi.fn(),
			invitePendingId: "eiv_1",
		});

		expect(screen.getByRole("button", { name: /aceitar/i })).toBeDisabled();
		expect(screen.getByRole("button", { name: /recusar/i })).toBeDisabled();
	});

	it("leaves a different card's actions usable while one is in flight", () => {
		renderCard(invited, {
			onAccept: vi.fn(),
			onDecline: vi.fn(),
			invitePendingId: "eiv_99",
		});

		expect(screen.getByRole("button", { name: /aceitar/i })).toBeEnabled();
	});
});
