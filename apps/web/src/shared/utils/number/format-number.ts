export interface FormatNumberOptions extends Intl.NumberFormatOptions {
	/** Alias de minimumFractionDigits. */
	minFractionDigits?: number;
	/** Alias de maximumFractionDigits. */
	maxFractionDigits?: number;
}

/**
 * Formata número com Intl no locale pt-AO.
 *
 * @example
 * formatNumber(1234567.89); // "1 234 567,89"
 * formatNumber(0.5, { style: "percent" }); // "50%"
 * formatNumber(1234.5, { minFractionDigits: 2 }); // "1 234,50"
 */
export function formatNumber(
	value: number,
	options: FormatNumberOptions = {},
	locale = "pt-AO",
): string {
	const { minFractionDigits, maxFractionDigits, ...intlOptions } = options;
	if (minFractionDigits !== undefined)
		intlOptions.minimumFractionDigits = minFractionDigits;
	if (maxFractionDigits !== undefined)
		intlOptions.maximumFractionDigits = maxFractionDigits;
	return new Intl.NumberFormat(locale, intlOptions).format(value);
}
