export function formatCurrency(value: number): string {
	return `${new Intl.NumberFormat("pt-AO", {
		style: "decimal",
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(value)} Kz`;
}

export function formatCurrencyCompact(value: number): string {
	const absoluteValue = Math.abs(value);
	const sign = value < 0 ? "-" : "";

	const format = (amount: number, suffix: string) =>
		`${sign}${new Intl.NumberFormat("pt-AO", {
			maximumFractionDigits: 1,
		}).format(amount)}${suffix} Kz`;

	if (absoluteValue >= 1_000_000_000) {
		return format(absoluteValue / 1_000_000_000, "B");
	}

	if (absoluteValue >= 1_000_000) {
		return format(absoluteValue / 1_000_000, "M");
	}

	if (absoluteValue >= 1_000) {
		return format(absoluteValue / 1_000, "K");
	}

	return formatCurrency(value);
}
