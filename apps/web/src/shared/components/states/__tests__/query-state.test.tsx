import { render, screen } from "@testing-library/react";
import { QueryState } from "../index";

const baseState = {
	isLoading: false,
	isError: false,
	isEmpty: false,
	hasData: true,
};

it("renders children when data is present", () => {
	render(
		<QueryState state={baseState}>
			<p>Content</p>
		</QueryState>,
	);
	expect(screen.getByText("Content")).toBeInTheDocument();
});

it("renders LoadingState when loading", () => {
	render(
		<QueryState state={{ ...baseState, isLoading: true, hasData: false }}>
			<p>Content</p>
		</QueryState>,
	);
	expect(screen.getByText("A carregar dados...")).toBeInTheDocument();
});

it("renders ErrorState when error", () => {
	render(
		<QueryState state={{ ...baseState, isError: true, hasData: false }}>
			<p>Content</p>
		</QueryState>,
	);
	expect(
		screen.getByText("Ocorreu um erro ao carregar os dados."),
	).toBeInTheDocument();
});

it("renders EmptyState when empty", () => {
	render(
		<QueryState state={{ ...baseState, isEmpty: true, hasData: false }}>
			<p>Content</p>
		</QueryState>,
	);
	expect(screen.getByText("Nenhum registo encontrado.")).toBeInTheDocument();
});

it("does not render children in non-data states", () => {
	const { container } = render(
		<QueryState state={{ ...baseState, isLoading: true, hasData: false }}>
			<p>Content</p>
		</QueryState>,
	);
	expect(container.querySelector("p")).toBeNull();
});
