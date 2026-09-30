import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
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

it("shows a custom error message when provided", () => {
	render(
		<QueryState
			state={{ ...baseState, isError: true, hasData: false }}
			errorMessage="Não foi possível carregar o histórico."
		>
			<p>Content</p>
		</QueryState>,
	);
	expect(
		screen.getByText("Não foi possível carregar o histórico."),
	).toBeInTheDocument();
});

it("offers a retry action when one is provided", async () => {
	const onRetry = vi.fn();
	const user = userEvent.setup();

	render(
		<QueryState
			state={{ ...baseState, isError: true, hasData: false }}
			onRetry={onRetry}
		>
			<p>Content</p>
		</QueryState>,
	);

	await user.click(screen.getByRole("button", { name: "Tentar novamente" }));
	expect(onRetry).toHaveBeenCalledOnce();
});

it("shows a custom empty message when provided", () => {
	render(
		<QueryState
			state={{ ...baseState, isEmpty: true, hasData: false }}
			emptyMessage="Ainda não há atividade registada."
		>
			<p>Content</p>
		</QueryState>,
	);
	expect(
		screen.getByText("Ainda não há atividade registada."),
	).toBeInTheDocument();
});
