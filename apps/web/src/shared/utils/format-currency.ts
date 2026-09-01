export function formatCurrency(value: number): string {
	return `${new Intl.NumberFormat("pt-AO", {
		style: "decimal",
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(value)} Kz`;
}

export function formatCurrencyCompact(value: number): string {
	if (value >= 1_000_000) {
		return `${(value / 1_000_000).toFixed(1).replace(".0", "")}M Kz`;
	}
	if (value >= 1_000) {
		return `${(value / 1_000).toFixed(0)}K Kz`;
	}
	return formatCurrency(value);
}
