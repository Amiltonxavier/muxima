/**
 * Slice colours are assigned by index so a pie slice and its legend entry can
 * never drift apart. The tokens come from the UI package globals.
 */
const CHART_PALETTE = [
	"var(--chart-1)",
	"var(--chart-2)",
	"var(--chart-3)",
	"var(--chart-4)",
	"var(--chart-5)",
] as const;

export function chartColorAt(index: number): string {
	return CHART_PALETTE[index % CHART_PALETTE.length];
}
