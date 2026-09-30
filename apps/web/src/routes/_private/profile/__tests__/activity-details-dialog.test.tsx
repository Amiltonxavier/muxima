import type { ActivityLog } from "@muxima/api/shared/types/entities";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
	ActivityDetailsDialog,
	formatContextValue,
	splitMetadata,
} from "../-components/activity-details-dialog";

const log: ActivityLog = {
	id: "log_1",
	userId: "usr_1",
	action: "EVENT_UPDATED",
	resource: "EVENT",
	resourceId: "evt_1",
	eventId: "evt_1",
	description: "Evento atualizado",
	metadata: {
		changes: [
			{ field: "name", before: "Casamento Ana & Rui", after: "Casamento Ana" },
			{ field: "guestCount", before: 120, after: 130 },
		],
		changedBy: "Ana",
	},
	ipAddress: "10.0.0.1",
	userAgent: "Mozilla/5.0 (iPhone)",
	createdAt: new Date("2026-01-10T10:00:00.000Z"),
} as ActivityLog;

describe("splitMetadata", () => {
	it("separates the field diff from the leftover context", () => {
		const { changes, context } = splitMetadata(log.metadata);

		expect(changes).toHaveLength(2);
		expect(context).toEqual([["changedBy", "Ana"]]);
	});

	it("ignores a payload that is not an object", () => {
		// Metadata is whatever the logging layer wrote; malformed input must not
		// crash the History tab.
		for (const value of [null, undefined, "texto", 42, ["a"]]) {
			expect(splitMetadata(value)).toEqual({ changes: [], context: [] });
		}
	});

	it("drops malformed change entries instead of trusting them", () => {
		const { changes } = splitMetadata({
			changes: [
				{ field: "name", before: "a", after: "b" },
				{ before: "a", after: "b" },
				{ field: "name", after: "b" },
				"nope",
				null,
			],
		});

		expect(changes).toEqual([{ field: "name", before: "a", after: "b" }]);
	});

	it("skips null and undefined context values", () => {
		const { context } = splitMetadata({ a: 1, b: null, c: undefined });

		expect(context).toEqual([["a", 1]]);
	});

	it("handles metadata with no diff", () => {
		const { changes, context } = splitMetadata({ device: "iphone" });

		expect(changes).toEqual([]);
		expect(context).toEqual([["device", "iphone"]]);
	});
});

describe("formatContextValue", () => {
	it("renders scalars directly", () => {
		expect(formatContextValue("a")).toBe("a");
		expect(formatContextValue(3)).toBe("3");
		expect(formatContextValue(true)).toBe("true");
	});

	it("renders an absent value as a dash", () => {
		expect(formatContextValue(null)).toBe("—");
		expect(formatContextValue(undefined)).toBe("—");
	});

	it("flattens objects and arrays instead of dumping JSON", () => {
		expect(formatContextValue({ a: 1, b: "x" })).toBe("a: 1, b: x");
		expect(formatContextValue([1, 2])).toBe("1, 2");
	});
});

describe("ActivityDetailsDialog", () => {
	it("renders nothing until a log is selected", () => {
		render(<ActivityDetailsDialog log={null} onClose={vi.fn()} />);

		expect(screen.queryByText("Evento atualizado")).not.toBeInTheDocument();
	});

	it("shows the action, resource and description", () => {
		// A description that adds nothing beyond the action label is not repeated
		// in the body, so use one that carries extra information.
		const detailed = {
			...log,
			description: "Nome e data do evento alterados",
		} as ActivityLog;

		render(<ActivityDetailsDialog log={detailed} onClose={vi.fn()} />);

		expect(screen.getByText("Evento atualizado")).toBeInTheDocument();
		expect(
			screen.getByText("Nome e data do evento alterados"),
		).toBeInTheDocument();
		// For an event log the resource id and the event id are the same value,
		// so the labels are asserted rather than the duplicated text.
		expect(screen.getByText("ID do recurso")).toBeInTheDocument();
		expect(screen.getByText("Evento", { selector: "dt" })).toBeInTheDocument();
	});

	it("does not repeat a description identical to the action label", () => {
		render(<ActivityDetailsDialog log={log} onClose={vi.fn()} />);

		// "Evento atualizado" is both the title and the description; it must be
		// rendered once, and the Descrição section omitted entirely.
		expect(screen.getAllByText("Evento atualizado")).toHaveLength(1);
		expect(screen.queryByText("Descrição")).not.toBeInTheDocument();
	});

	it("renders each change as an explicit before/after pair", () => {
		render(<ActivityDetailsDialog log={log} onClose={vi.fn()} />);

		expect(screen.getByText("name")).toBeInTheDocument();
		expect(screen.getByText("Casamento Ana & Rui")).toBeInTheDocument();
		expect(screen.getByText("Casamento Ana")).toBeInTheDocument();

		expect(screen.getByText("guestCount")).toBeInTheDocument();
		expect(screen.getByText("120")).toBeInTheDocument();
		expect(screen.getByText("130")).toBeInTheDocument();
	});

	it("renders leftover context as key/value pairs", () => {
		render(<ActivityDetailsDialog log={log} onClose={vi.fn()} />);

		expect(screen.getByText("changedBy")).toBeInTheDocument();
		expect(screen.getByText("Ana")).toBeInTheDocument();
	});

	it("never presents raw JSON", () => {
		const withObject = {
			...log,
			metadata: { changes: [], payload: { nested: { deep: 1 } } },
		} as ActivityLog;

		render(<ActivityDetailsDialog log={withObject} onClose={vi.fn()} />);

		expect(screen.queryByText(/[{}]/)).not.toBeInTheDocument();
		expect(screen.getByText("nested: deep: 1")).toBeInTheDocument();
	});

	it("survives a malformed metadata payload", () => {
		const broken = { ...log, metadata: "not-an-object" } as ActivityLog;

		expect(() =>
			render(<ActivityDetailsDialog log={broken} onClose={vi.fn()} />),
		).not.toThrow();
	});

	it("calls onClose when dismissed", async () => {
		const onClose = vi.fn();
		const user = userEvent.setup();

		render(<ActivityDetailsDialog log={log} onClose={onClose} />);
		await user.keyboard("{Escape}");

		expect(onClose).toHaveBeenCalled();
	});
});
