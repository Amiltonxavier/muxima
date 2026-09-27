import { type Prisma, Prisma as PrismaNs } from "@muxima/db/prisma";

/**
 * JSON boundary helper for the `Json?` columns (`customFields`,
 * `categoryFields`).
 *
 * `Record<string, unknown>` is not assignable to Prisma's `InputJsonValue`,
 * and a plain `unknown` may legitimately hold `undefined`, which JSON cannot
 * represent. This converts once, at the write boundary, and strips undefined
 * so a partially filled form does not fail on a missing key.
 */
export function toJsonInput(
	value: Record<string, unknown> | null | undefined,
): Prisma.InputJsonValue | typeof PrismaNs.JsonNull | undefined {
	if (value === null) return PrismaNs.JsonNull;
	if (value === undefined) return undefined;

	const cleaned = stripUndefined(value);
	if (cleaned === null) return undefined;
	return cleaned as Prisma.InputJsonValue;
}

/** Reads a JSON column back as a plain record, or null when empty. */
export function fromJson(value: unknown): Record<string, unknown> | null {
	if (value === null || value === undefined) return null;
	if (typeof value === "object" && !Array.isArray(value)) {
		return value as Record<string, unknown>;
	}
	return null;
}

function stripUndefined(value: unknown): unknown {
	if (value === null) return null;
	if (Array.isArray(value)) {
		return value.map(stripUndefined).filter((v) => v !== undefined);
	}
	if (typeof value === "object") {
		const out: Record<string, unknown> = {};
		for (const [key, item] of Object.entries(value)) {
			if (item === undefined) continue;
			const cleaned = stripUndefined(item);
			if (cleaned !== undefined) out[key] = cleaned;
		}
		return out;
	}
	if (typeof value === "bigint" || typeof value === "function")
		return undefined;
	if (typeof value === "number" && !Number.isFinite(value)) return undefined;
	return value;
}
