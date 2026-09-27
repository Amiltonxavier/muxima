import { Prisma } from "@muxima/db/prisma";

/**
 * Money boundary helpers.
 *
 * `Decimal` is the storage type; integer cents are the arithmetic type. All
 * sums and comparisons happen in cents so no rounding error can accumulate,
 * and the value crosses the wire to the client as a plain number.
 */

const CENTS_PER_UNIT = 100;

/**
 * Converts a Prisma `Decimal` to integer cents.
 * Returns 0 for null/undefined so callers can aggregate without null checks.
 */
export function toCents(
	value: Prisma.Decimal | number | null | undefined,
): number {
	if (value === null || value === undefined) return 0;
	const numeric = typeof value === "number" ? value : value.toNumber();
	// `Math.round` (not `Math.floor`) so 0.005 rounds the way money is expected
	// to, and a negative value stays symmetric.
	return Math.round(numeric * CENTS_PER_UNIT);
}

/**
 * Converts integer cents back to a Prisma `Decimal` for storage.
 * Two decimal places are kept, which is enough for AOA amounts.
 */
export function fromCents(cents: number): Prisma.Decimal {
	return new Prisma.Decimal(cents / CENTS_PER_UNIT);
}

/** Sends money to the client as a number of major units. */
export function centsToUnits(cents: number): number {
	return cents / CENTS_PER_UNIT;
}

/** Renders a cent amount as a plain number string, e.g. `150000.5`. */
export function formatCents(cents: number): string {
	return (cents / CENTS_PER_UNIT).toFixed(2);
}
