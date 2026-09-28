import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@muxima/ui/components/select";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

function Controlled({
	onChange,
	value,
	withEmptyOption = false,
}: {
	onChange?: (v: string) => void;
	value: string;
	withEmptyOption?: boolean;
}) {
	return (
		<Select
			value={value}
			onValueChange={(v) => {
				onChange?.(v);
			}}
		>
			<SelectTrigger className="w-[160px]">
				<SelectValue placeholder="Escolhe..." />
			</SelectTrigger>
			<SelectContent>
				{withEmptyOption && <SelectItem value="">Sem mesa</SelectItem>}
				<SelectItem value="WEDDING">Casamento</SelectItem>
				<SelectItem value="ENGAGEMENT">Noivado</SelectItem>
			</SelectContent>
		</Select>
	);
}

describe("Select wrapper (Headless UI) — smoke", () => {
	it("renders a native select with the chosen label", () => {
		render(<Controlled value="WEDDING" />);
		const el = screen.getByRole("combobox") as HTMLSelectElement;
		expect(el.tagName).toBe("SELECT");
		expect(el.selectedIndex).toBe(0);
	});

	it("shows the placeholder when no option matches the value", () => {
		render(<Controlled value="" />);
		const el = screen.getByRole("combobox") as HTMLSelectElement;
		// jsdom não marca selectedIndex === -1 (browser sim); o que importa é o placeholder:
		expect(screen.getByText("Escolhe...")).toBeDefined();
		expect(el).toBeDefined();
	});

	it("shows the empty-option label when value='' matches <SelectItem value=\"\">", () => {
		render(<Controlled value="" withEmptyOption />);
		const el = screen.getByRole("combobox") as HTMLSelectElement;
		expect(el.selectedIndex).toBe(0);
		expect(el.selectedOptions[0]?.textContent).toBe("Sem mesa");
		expect(screen.queryByText("Escolhe...")).toBeNull();
	});

	it("emits onValueChange on user change", () => {
		const onChange = vi.fn();
		render(<Controlled value="WEDDING" onChange={onChange} />);
		fireEvent.change(screen.getByRole("combobox"), {
			target: { value: "ENGAGEMENT" },
		});
		expect(onChange).toHaveBeenCalledWith("ENGAGEMENT");
	});

	it("re-syncs the placeholder when value changes from outside", () => {
		const { rerender } = render(<Controlled value="WEDDING" />);
		expect(
			(screen.getByRole("combobox") as HTMLSelectElement).selectedIndex,
		).toBe(0);
		expect(screen.queryByText("Escolhe...")).toBeNull();
		rerender(<Controlled value="MISSING" />);
		// jsdom satura o DOM para a 1ª opção; o placeholder é o sinal visível:
		expect(screen.getByText("Escolhe...")).toBeDefined();
	});

	it("forwards id from SelectTrigger for label association", () => {
		render(
			<>
				<label htmlFor="payment-method">Método</label>
				<Select value="MB">
					<SelectTrigger id="payment-method">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="MB">Multicaixa</SelectItem>
					</SelectContent>
				</Select>
			</>,
		);
		const el = document.getElementById("payment-method");
		expect(el?.tagName).toBe("SELECT");
	});
});
