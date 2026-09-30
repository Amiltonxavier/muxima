/**
 * Activity logging — the single write path for the Profile > History trail.
 *
 * Every module that wants to record an action goes through `createActivityLog`.
 * Nothing else should touch the `activity_log` table directly: routing all
 * writes through one function is what makes the redaction guarantee in
 * `redactSecrets` actually hold, instead of relying on every future call site
 * to remember to strip credentials.
 *
 * This lives in `@muxima/db` rather than `@muxima/api` because the session
 * lifecycle hooks in `@muxima/auth` (sign-in, sign-out) must log through the
 * exact same path, and `@muxima/auth` cannot depend on `@muxima/api`.
 */
import type { Prisma } from "../prisma/generated/client";

/**
 * The actions the application can record. Kept as a string union rather than a
 * database enum — the same choice the existing `AuditLog` makes — so new
 * actions (`SUPPLIER_CREATED`, `PAYMENT_CREATED`, …) can be added by extending
 * this union without a migration.
 */
export const ACTIVITY_ACTIONS = [
	"LOGIN",
	"LOGOUT",
	"PASSWORD_CHANGED",
	"PROFILE_UPDATED",
	"EVENT_CREATED",
	"EVENT_UPDATED",
	"EVENT_DELETED",
	"GUEST_CREATED",
	"GUEST_UPDATED",
	"GUEST_DELETED",
] as const;

export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];

/** The kinds of things an action can be performed on. */
export const ACTIVITY_RESOURCES = [
	"SESSION",
	"PROFILE",
	"EVENT",
	"GUEST",
] as const;

export type ActivityResource = (typeof ACTIVITY_RESOURCES)[number];

/**
 * A single before/after pair. Stored under `metadata.changes` and rendered as
 * "Field — Before: X, After: Y" in the details dialog, so the History tab never
 * has to fall back to dumping raw JSON.
 */
export type ActivityChange = {
	field: string;
	before: unknown;
	after: unknown;
};

export type ActivityMetadata = {
	/** Field-level diff for update actions. */
	changes?: ActivityChange[];
	/** Any other non-sensitive context (ids, names, counts). */
	[key: string]: unknown;
};

export type CreateActivityLogInput = {
	userId: string;
	action: ActivityAction;
	resource: ActivityResource;
	/** Human-readable summary, rendered directly in the History table. */
	description: string;
	resourceId?: string | null;
	eventId?: string | null;
	metadata?: ActivityMetadata;
	ipAddress?: string | null;
	userAgent?: string | null;
	/**
	 * Client to write through. Defaults to the shared instance; pass an explicit
	 * client (e.g. a transaction) to keep the log atomic with the change it
	 * describes, or a test double to assert on writes.
	 *
	 * Typed as the single method actually used rather than as
	 * `Pick<PrismaClient, "activityLog">`, so a double only has to provide
	 * `create` instead of the whole delegate.
	 */
	client?: {
		activityLog: {
			create(args: {
				data: Prisma.ActivityLogUncheckedCreateInput;
			}): Promise<unknown>;
		};
	};
};

export const REDACTED = "[redacted]" as const;

/**
 * Key fragments that must never reach the database. Compared against
 * lowercased, separator-stripped key names, so `new_password`,
 * `newPassword` and `NEW-PASSWORD` are all caught.
 */
const SENSITIVE_KEY_FRAGMENTS = [
	"password",
	"passwd",
	"token",
	"cookie",
	"secret",
	"authorization",
	"credential",
	"apikey",
	"privatekey",
	"sessionid",
] as const;

function isSensitiveKey(key: string): boolean {
	const normalized = key.toLowerCase().replace(/[-_\s]/g, "");
	return SENSITIVE_KEY_FRAGMENTS.some((fragment) =>
		normalized.includes(fragment),
	);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return (
		typeof value === "object" &&
		value !== null &&
		!Array.isArray(value) &&
		!(value instanceof Date)
	);
}

/**
 * Strip credential-shaped values from arbitrary metadata.
 *
 * Runs on every write rather than at the call sites: a future caller that
 * forwards a request body by mistake still cannot leak a password. Returns a
 * new structure; the input is never mutated.
 */
export function redactSecrets<T>(value: T): T {
	if (Array.isArray(value)) {
		return value.map((item) => redactSecrets(item)) as T;
	}

	if (isPlainObject(value)) {
		const result: Record<string, unknown> = {};
		for (const [key, entry] of Object.entries(value)) {
			result[key] = isSensitiveKey(key) ? REDACTED : redactSecrets(entry);
		}
		return result as T;
	}

	return value;
}

/**
 * Build the field-level diff stored in `metadata.changes`.
 *
 * `previous` is the stored record and `next` is whatever the caller sent (or
 * the freshly saved row), so `next` is deliberately typed loosely: the two sides
 * often differ in representation — a submitted `eventDate` is an ISO string
 * while the stored one is a `Date` — and this only ever compares values.
 *
 * Only the requested fields are considered, and only the ones that actually
 * changed are returned, so an unrelated counter bump never shows up as a
 * "change" in the UI. A field missing from `next` was not part of the edit and
 * is skipped.
 */
export function buildChanges<T extends Record<string, unknown>>(
	previous: T,
	next: Readonly<Record<string, unknown>>,
	fields: readonly (keyof T)[],
): ActivityChange[] {
	const changes: ActivityChange[] = [];

	for (const field of fields) {
		const before = previous[field];
		if (!(field in next)) continue;
		const after = next[field as string];
		if (Object.is(before, after)) continue;
		changes.push({ field: String(field), before, after });
	}

	return changes;
}

/**
 * Write one activity log row.
 *
 * Never throws and never rejects: a failed audit write must not roll back or
 * fail the user action it describes, so errors are reported on the console and
 * swallowed. Authorization never relies on this function — the trail is a
 * record of what happened, not a gate.
 */
export async function createActivityLog(
	input: CreateActivityLogInput,
): Promise<void> {
	try {
		const prisma = input.client ?? (await getDefaultClient());

		const metadata =
			input.metadata === undefined
				? undefined
				: (redactSecrets(input.metadata) as Prisma.InputJsonValue);

		await prisma.activityLog.create({
			data: {
				userId: input.userId,
				action: input.action,
				resource: input.resource,
				description: input.description,
				...(input.resourceId ? { resourceId: input.resourceId } : {}),
				...(input.eventId ? { eventId: input.eventId } : {}),
				...(metadata === undefined ? {} : { metadata }),
				...(input.ipAddress ? { ipAddress: input.ipAddress } : {}),
				...(input.userAgent ? { userAgent: input.userAgent } : {}),
			},
		});
	} catch (error) {
		console.error("[activity-log] failed to record activity", error);
	}
}

/**
 * The shared Prisma instance. Imported lazily so that simply importing this
 * module does not open a database connection — several tests import the logger
 * purely to exercise `redactSecrets` / `buildChanges`.
 */
type ActivityLogWriter = NonNullable<CreateActivityLogInput["client"]>;

let defaultClient: ActivityLogWriter | null = null;

async function getDefaultClient(): Promise<ActivityLogWriter> {
	if (defaultClient) return defaultClient;
	const { default: db } = await import("./index");
	defaultClient = db;
	return defaultClient;
}
