import { render, screen } from "@testing-library/react";
import { ErrorState } from "../error-state/error-state";

it("renders default error message", () => {
	render(<ErrorState />);
	expect(
		screen.getByText("Ocorreu um erro ao carregar os dados."),
	).toBeInTheDocument();
});

it("renders custom message", () => {
	render(<ErrorState message="Falha na rede" />);
	expect(screen.getByText("Falha na rede")).toBeInTheDocument();
});
