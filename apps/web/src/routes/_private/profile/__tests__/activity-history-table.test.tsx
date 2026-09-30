import type { ActivityLog } from "@muxima/api/shared/types/entities";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The query hook is the only thing stubbed: the component is exercised for real
 * so that the table, the server-driven pagination and the empty/error states are
 * all covered. The hook is the boundary to the API, so mocking it keeps the test
 * about presentation rather than transport.
 */
const listSpy = vi.fn();

vi.mock("../-queries/activity-queries", () => ({
	useActivityLogs: (input: { page: number; limit: number }) => listSpy(input),
}));

const { ActivityHistoryTable } = await import(
	"../-components/activity-history-table"
);

function log(overrides: Partial<ActivityLog> = {}): ActivityLog {
	return {
		id: "log_1",
		userId: "usr_1",
		action: "LOGIN",
		resource: "SESSION",
		description: "Sessão iniciada",
		metadata: {},
		createdAt: new Date("2026-01-10T10:00:00.000Z"),
		...overrides,
	} as ActivityLog;
}

function page(rows: ActivityLog[], meta?: Record<string, number>) {
	return {
		data: rows,
		meta: meta ?? { page: 1, limit: 20, total: rows.length, totalPages: 1 },
	};
}

/** A settled query result, so nothing renders a spinner. */
function result(overrides: Record<string, unknown> = {}) {
	return {
		data: undefined,
		isLoading: false,
		isError: false,
		error: null,
		refetch: vi.fn(),
		...overrides,
	};
}

beforeEach(() => {
	listSpy.mockReset();
});

describe("ActivityHistoryTable", () => {
	it("renders one row per log with its date, action, resource and description", () => {
		listSpy.mockReturnValue(
			result({
				data: page([
					log(),
					log({
						id: "log_2",
						action: "EVENT_CREATED",
						resource: "EVENT",
						description: "Evento criado",
					}),
				]),
			}),
		);

		render(<ActivityHistoryTable />);

		expect(screen.getByText("Sessão iniciada")).toBeInTheDocument();
		// The action label and the description of an `EVENT_CREATED` log are
		// often the same words, and they live in separate columns, so both
		// render — asserted with getAllByText rather than getByText.
		expect(screen.getAllByText("Evento criado")).toHaveLength(2);
		expect(screen.getByText("Início de sessão")).toBeInTheDocument();
		expect(screen.getByText("Atividade")).toBeInTheDocument();
		expect(screen.getByText("Recurso")).toBeInTheDocument();
		expect(
			screen.getAllByRole("button", { name: /ver detalhes/i }),
		).toHaveLength(2);
	});

	it("requests the first page on mount", () => {
		listSpy.mockReturnValue(result({ data: page([log()]) }));

		render(<ActivityHistoryTable />);

		expect(listSpy).toHaveBeenCalledWith({ page: 1, limit: 20 });
	});

	it("asks the server for the next page rather than slicing locally", () => {
		listSpy.mockReturnValue(result({ data: page([log()]) }));

		render(<ActivityHistoryTable />);

		expect(listSpy).not.toHaveBeenCalledWith({ page: 2, limit: 20 });
		// Pagination is driven by the API's meta, not by a client-side slice.
		expect(screen.getByText(/1/)).toBeInTheDocument();
	});

	it("shows an explanatory empty state when there is no activity", () => {
		listSpy.mockReturnValue(result({ data: page([]) }));

		render(<ActivityHistoryTable />);

		expect(
			screen.getByText(/Ainda não há atividade registada/i),
		).toBeInTheDocument();
	});

	it("shows a loading state while the page is in flight", () => {
		listSpy.mockReturnValue(result({ isLoading: true }));

		render(<ActivityHistoryTable />);

		expect(screen.getByText("A carregar dados...")).toBeInTheDocument();
	});

	it("shows a specific error message and retries on demand", async () => {
		const refetch = vi.fn();
		listSpy.mockReturnValue(
			result({ isError: true, error: new Error("boom"), refetch }),
		);
		const user = userEvent.setup();

		render(<ActivityHistoryTable />);

		expect(
			screen.getByText(/Não foi possível carregar o histórico/i),
		).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Tentar novamente" }));
		expect(refetch).toHaveBeenCalled();
	});

	it("hides pagination entirely when there is nothing to page", () => {
		listSpy.mockReturnValue(result({ data: page([]) }));

		render(<ActivityHistoryTable />);

		expect(
			screen.queryByRole("navigation", { name: /paginação/i }),
		).not.toBeInTheDocument();
	});
});
