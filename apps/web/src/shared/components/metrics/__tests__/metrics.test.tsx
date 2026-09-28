import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
	MetricBreakdownCard,
	MetricCard,
	MetricProgressCard,
	MetricRadialCard,
	MetricStatusList,
	SegmentedProgress,
	StatsGrid,
	safePercentage,
} from "../index";

describe("safePercentage", () => {
	it.each([
		[0, 0, 0],
		[0, 100, 0],
		[50, 100, 50],
		[100, 100, 100],
		[120, 100, 100],
		[-10, 100, 0],
		[5, -1, 0],
		[Number.NaN, 10, 0],
		[10, Number.POSITIVE_INFINITY, 0],
		[10, 0, 0],
	])("safePercentage(%s, %s) === %s", (value, max, expected) => {
		expect(safePercentage(value, max)).toBe(expected);
	});
});

describe("MetricCard", () => {
	it("renders title, value and description", () => {
		render(<MetricCard title="Convidados" value={120} description="de 200" />);
		expect(screen.getByText("Convidados")).toBeDefined();
		expect(screen.getByText("120")).toBeDefined();
		expect(screen.getByText("de 200")).toBeDefined();
	});

	it("renders trend and action when provided", () => {
		render(
			<MetricCard
				title="Tarefas"
				value={12}
				trend={{ label: "+5", tone: "success" }}
				action={<button type="button">Ver mais</button>}
			/>,
		);
		expect(screen.getByText("+5")).toBeDefined();
		expect(screen.getByText("Ver mais")).toBeDefined();
	});
});

describe("MetricProgressCard", () => {
	it("renders value/limit and computed percentage", () => {
		render(<MetricProgressCard title="Mesas" value={7} limit={10} />);
		expect(screen.getByText("7")).toBeDefined();
		expect(screen.getByRole("progressbar")).toHaveAttribute(
			"aria-valuenow",
			"70",
		);
	});

	it("uses the provided percentage when given", () => {
		render(
			<MetricProgressCard title="Mesas" value={7} limit={10} percentage={42} />,
		);
		expect(screen.getByRole("progressbar")).toHaveAttribute(
			"aria-valuenow",
			"42",
		);
	});

	it("is safe on 0/0 and clamps above-limit values", () => {
		const { rerender } = render(
			<MetricProgressCard title="Zero" value={0} limit={0} />,
		);
		expect(screen.getByRole("progressbar")).toHaveAttribute(
			"aria-valuenow",
			"0",
		);
		rerender(<MetricProgressCard title="Acima" value={120} limit={100} />);
		expect(screen.getByRole("progressbar")).toHaveAttribute(
			"aria-valuenow",
			"100",
		);
	});

	it("hides the limit suffix when limit is not a positive number", () => {
		render(<MetricProgressCard title="Zero" value={0} limit={0} />);
		expect(screen.queryByText("/ 0")).toBeNull();
	});
});

describe("SegmentedProgress", () => {
	it("renders one child per non-zero segment and a legend", () => {
		render(
			<SegmentedProgress
				aria-label="Tarefas"
				segments={[
					{ label: "Todo", value: 40, tone: "primary" },
					{ label: "Em curso", value: 30, tone: "warning" },
					{ label: "Feito", value: 30, tone: "success" },
				]}
			/>,
		);
		const bar = screen.getByRole("progressbar");
		expect(bar).toHaveAttribute("aria-valuenow", "100");
		expect(screen.getByText("Todo")).toBeDefined();
		expect(screen.getByText("Feito")).toBeDefined();
		expect(screen.getByText("(40%)")).toBeDefined();
	});

	it("keeps zero-value segments in the legend but not in the bar", () => {
		const { container } = render(
			<SegmentedProgress
				segments={[
					{ label: "A", value: 10 },
					{ label: "B", value: 0 },
				]}
			/>,
		);
		// A legenda mantém o segmento (consistente com charts), a barra não:
		expect(screen.getByText("B")).toBeDefined();
		const bar = screen.getByRole("progressbar");
		expect(bar.childElementCount).toBe(1);
		expect(container).toBeDefined();
	});

	it("shows remaining space when an explicit total exceeds the sum", () => {
		render(
			<SegmentedProgress
				segments={[{ label: "Cheias", value: 3 }]}
				total={5}
				showTotal
				totalLabel="Mesas"
			/>,
		);
		expect(screen.getByText("Mesas")).toBeDefined();
		expect(screen.getByText("5")).toBeDefined();
		expect(screen.getByText("Restante")).toBeDefined();
		expect(screen.getByText("2")).toBeDefined();
	});

	it("formats legend values with formatValue", () => {
		render(
			<SegmentedProgress
				segments={[{ label: "Pago", value: 500 }]}
				formatValue={(v) => `${v} kz`}
			/>,
		);
		expect(screen.getByText("500 kz")).toBeDefined();
	});
});

describe("MetricBreakdownCard", () => {
	it("renders total value and segmented bar with legend", () => {
		render(
			<MetricBreakdownCard
				title="Tarefas"
				value={24}
				items={[
					{ label: "Baixa", value: 6, tone: "default" },
					{ label: "Alta", value: 18, tone: "danger" },
				]}
			/>,
		);
		expect(screen.getByText("Tarefas")).toBeDefined();
		expect(screen.getByText("24")).toBeDefined();
		expect(screen.getByText("Baixa")).toBeDefined();
		expect(screen.getByText("Alta")).toBeDefined();
	});
});

describe("MetricStatusList", () => {
	it("renders rows with status text (never color-only)", () => {
		render(
			<MetricStatusList
				aria-label="Mesas"
				items={[
					{
						label: "Mesa 1",
						value: "4/6",
						status: { label: "Crítico", tone: "danger" },
					},
					{
						label: "Mesa 2",
						value: "6/6",
						status: { label: "Cheia", tone: "success" },
					},
				]}
			/>,
		);
		expect(screen.getByText("Mesa 1")).toBeDefined();
		expect(screen.getByText("Crítico")).toBeDefined();
		expect(screen.getByText("Cheia")).toBeDefined();
	});

	it("exposes progress ARIA values per row", () => {
		render(
			<MetricStatusList
				items={[
					{
						label: "Confirmação",
						value: "60%",
						// 3/5 → 60% na barra (role="progressbar" usa escala 0–100).
						progress: { value: 3, max: 5 },
					},
				]}
			/>,
		);
		const bar = screen.getByRole("progressbar");
		expect(bar).toHaveAttribute("aria-valuemax", "100");
		expect(bar).toHaveAttribute("aria-valuenow", "60");
	});
});

describe("MetricRadialCard", () => {
	it("renders title and description", () => {
		render(
			<MetricRadialCard
				title="Conclusão"
				value={72}
				label="concluído"
				description="18 de 25 tarefas"
			/>,
		);
		expect(screen.getByText("Conclusão")).toBeDefined();
		expect(screen.getByText("18 de 25 tarefas")).toBeDefined();
	});
});

describe("StatsGrid", () => {
	it("renders children with the requested column layout", () => {
		render(
			<StatsGrid columns={4}>
				<MetricCard title="A" value={1} />
				<MetricCard title="B" value={2} />
			</StatsGrid>,
		);
		expect(screen.getByText("A")).toBeDefined();
		expect(screen.getByText("B")).toBeDefined();
		expect(screen.getByText("A").closest(".grid")).toBeDefined();
	});
});
