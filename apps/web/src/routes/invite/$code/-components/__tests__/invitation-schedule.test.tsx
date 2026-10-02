import type { PublicScheduleItem } from "@muxima/api/shared/types/entities";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InvitationSchedule } from "../invitation-schedule";

const ITEMS: PublicScheduleItem[] = [
	{
		title: "Receção de boas-vindas",
		description: "Cocktail de boas-vindas",
		startAt: new Date("2026-12-20T16:00:00.000Z"),
		endAt: new Date("2026-12-20T17:00:00.000Z"),
		location: "Entrada do salão",
	},
	{
		title: "Jantar",
		description: null,
		startAt: new Date("2026-12-20T18:00:00.000Z"),
		endAt: null,
		location: null,
	},
];

describe("InvitationSchedule", () => {
	it("renders the header and every schedule entry", () => {
		render(
			<InvitationSchedule items={ITEMS} isLoading={false} isError={false} />,
		);

		expect(screen.getByText("Programação")).toBeInTheDocument();
		expect(screen.getByText("Receção de boas-vindas")).toBeInTheDocument();
		expect(screen.getByText("Jantar")).toBeInTheDocument();
	});

	it("shows descriptions and locations when present", () => {
		render(
			<InvitationSchedule items={ITEMS} isLoading={false} isError={false} />,
		);

		expect(screen.getByText("Cocktail de boas-vindas")).toBeInTheDocument();
		expect(screen.getByText("Entrada do salão")).toBeInTheDocument();
	});

	it("renders an ordered list with one item per entry", () => {
		render(
			<InvitationSchedule items={ITEMS} isLoading={false} isError={false} />,
		);

		// The list element is the <ol>; the decorative line span is filtered out.
		const list = screen.getByRole("list");
		expect(list.querySelectorAll("li")).toHaveLength(2);
	});

	it("shows the empty state message when there are no items", () => {
		render(<InvitationSchedule items={[]} isLoading={false} isError={false} />);

		expect(
			screen.getByText("O programa será partilhado em breve."),
		).toBeInTheDocument();
	});

	it("shows the error state message on failure", () => {
		render(<InvitationSchedule items={[]} isLoading={false} isError />);

		expect(
			screen.getByText("Não foi possível carregar o programa."),
		).toBeInTheDocument();
	});

	it("shows a loading skeleton while fetching", () => {
		const { container } = render(
			<InvitationSchedule items={[]} isLoading isError={false} />,
		);

		expect(screen.getByText("Programação")).toBeInTheDocument();
		expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
		expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(
			0,
		);
	});

	it("keeps decorative svg ornaments out of the accessibility tree", () => {
		const { container } = render(
			<InvitationSchedule items={ITEMS} isLoading={false} isError={false} />,
		);

		const decorations = container.querySelectorAll("svg[aria-hidden='true']");
		expect(decorations.length).toBeGreaterThanOrEqual(2);
	});
});
