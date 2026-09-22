import { render, screen } from "@testing-library/react";
import { LoadingState } from "../loading-state/loading-state";

it("renders loading indicator and text", () => {
	render(<LoadingState />);
	expect(screen.getByText("A carregar dados...")).toBeInTheDocument();
});
