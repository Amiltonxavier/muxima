import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusDot } from "../status-dot";

describe("StatusDot", () => {
	it("renders the textual label", () => {
		render(<StatusDot label="Confirmado" />);
		expect(screen.getByText("Confirmado")).toBeDefined();
	});

	it("applies the requested tone to the dot", () => {
		const { container } = render(
			<StatusDot label="Confirmado" tone="success" />,
		);
		const dot = container.querySelector("span[aria-hidden]");
		expect(dot?.className).toContain("bg-emerald-500");
	});

	it("defaults to the neutral tone", () => {
		const { container } = render(<StatusDot label="Rascunho" />);
		const dot = container.querySelector("span[aria-hidden]");
		expect(dot?.className).toContain("bg-neutral-400");
	});

	it("marks the dot as decorative, keeping the text semantic", () => {
		const { container } = render(
			<StatusDot label="Confirmado" tone="success" />,
		);
		const dot = container.querySelector("span[aria-hidden]");
		expect(dot).toBeDefined();
		expect(screen.getByText("Confirmado")).toBeDefined();
	});

	it("accepts a custom className", () => {
		const { container } = render(
			<StatusDot label="Pago" className="justify-end" />,
		);
		expect(container.firstElementChild?.className).toContain("justify-end");
	});
});
