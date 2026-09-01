import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { UpdateInventoryDialog } from "../update-inventory-dialog";

const mockMutateAsync = vi.fn();
const mockOnOpenChange = vi.fn();

vi.mock(
	"@/routes/_private/events/$eventId/inventory/-queries/inventory-queries",
	() => ({
		useUpdateInventoryItem: () => ({
			mutateAsync: mockMutateAsync,
			isPending: false,
		}),
	}),
);

vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
		success: vi.fn(),
	},
}));

const defaultInitialValues = {
	id: "item-123",
	name: "Bolo de Casamento 4 Andares",
	category: "CAKE",
	plannedQuantity: 1,
	currentQuantity: 0,
	unit: "UNIT",
	unitPrice: 250000,
	cakeType: "WEDDING_CAKE",
	weight: 12,
	deliveryDate: "2027-12-02",
	notes: "Alguma coisa",
};

function renderDialog(
	overrides: Partial<typeof defaultInitialValues> = {},
) {
	return render(
		<UpdateInventoryDialog
			open={true}
			onOpenChange={mockOnOpenChange}
			initialValues={{ ...defaultInitialValues, ...overrides }}
		/>,
	);
}

describe("UpdateInventoryDialog", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockMutateAsync.mockResolvedValue({});
	});

	it("renders dialog with title", () => {
		renderDialog();
		expect(screen.getByText("Editar item")).toBeInTheDocument();
	});

	it("populates form fields with initial values", () => {
		renderDialog();
		expect(screen.getByDisplayValue("Bolo de Casamento 4 Andares")).toBeInTheDocument();
		expect(screen.getByDisplayValue("1")).toBeInTheDocument();
		expect(screen.getByDisplayValue("250000")).toBeInTheDocument();
		expect(screen.getByDisplayValue("Alguma coisa")).toBeInTheDocument();
	});

	it("shows cake fields when category is CAKE", () => {
		renderDialog({ category: "CAKE" });
		expect(screen.getByText("Tipo de bolo")).toBeInTheDocument();
		expect(screen.getByText("Peso (kg)")).toBeInTheDocument();
		expect(screen.getByText("Data de entrega")).toBeInTheDocument();
	});

	it("hides cake fields when category is not CAKE", () => {
		renderDialog({ category: "DRINK" });
		expect(screen.queryByText("Tipo de bolo")).not.toBeInTheDocument();
		expect(screen.queryByText("Peso (kg)")).not.toBeInTheDocument();
		expect(screen.queryByText("Data de entrega")).not.toBeInTheDocument();
	});

	it("calls mutateAsync with correct data on submit", async () => {
		const user = userEvent.setup();
		renderDialog();

		const submitButton = screen.getByRole("button", { name: "Guardar" });
		await user.click(submitButton);

		await waitFor(() => {
			expect(mockMutateAsync).toHaveBeenCalledWith(
				expect.objectContaining({
					id: "item-123",
					name: "Bolo de Casamento 4 Andares",
					category: "CAKE",
					plannedQuantity: 1,
					unit: "UNIT",
					unitPrice: 250000,
					cakeType: "WEDDING_CAKE",
					weight: 12,
					deliveryDate: "2027-12-02",
					notes: "Alguma coisa",
				}),
			);
		});
	});

	it("calls onOpenChange after successful submit", async () => {
		const user = userEvent.setup();
		renderDialog();

		const submitButton = screen.getByRole("button", { name: "Guardar" });
		await user.click(submitButton);

		await waitFor(() => {
			expect(mockOnOpenChange).toHaveBeenCalled();
		});
	});

	it("does not send cakeType when category is not CAKE", async () => {
		const user = userEvent.setup();
		renderDialog({ category: "DRINK", cakeType: "" });

		const submitButton = screen.getByRole("button", { name: "Guardar" });
		await user.click(submitButton);

		await waitFor(() => {
			expect(mockMutateAsync).toHaveBeenCalledWith(
				expect.objectContaining({
					cakeType: undefined,
				}),
			);
		});
	});

	it("calls onOpenChange when cancel button is clicked", async () => {
		const user = userEvent.setup();
		renderDialog();

		const cancelButton = screen.getByRole("button", { name: "Cancelar" });
		await user.click(cancelButton);

		expect(mockOnOpenChange).toHaveBeenCalled();
	});

	it("does not send currentQuantity to backend", async () => {
		const user = userEvent.setup();
		renderDialog();

		const submitButton = screen.getByRole("button", { name: "Guardar" });
		await user.click(submitButton);

		await waitFor(() => {
			const callArg = mockMutateAsync.mock.calls[0][0];
			expect(callArg).not.toHaveProperty("currentQuantity");
		});
	});

	it("sends empty weight and deliveryDate as undefined when zero", async () => {
		const user = userEvent.setup();
		renderDialog({ weight: 0, deliveryDate: "" });

		const submitButton = screen.getByRole("button", { name: "Guardar" });
		await user.click(submitButton);

		await waitFor(() => {
			const callArg = mockMutateAsync.mock.calls[0][0];
			expect(callArg.weight).toBeUndefined();
			expect(callArg.deliveryDate).toBeUndefined();
		});
	});
});
