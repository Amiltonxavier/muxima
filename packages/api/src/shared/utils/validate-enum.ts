import { ValidationError } from "../errors/app-error";

/**
 * Validates a query-string enum filter against the allowed values.
 *
 * An absent value means "no filter" and yields `undefined`. A value that is
 * present but not allowed is a client mistake and must not be silently dropped
 * (it used to be, which made REST ignore invalid filters while oRPC rejected
 * them with 422): it raises the same `422 VALIDATION_ERROR` contract, with the
 * issue attached to the offending query-string field.
 */
export function validateEnum<T extends string>(
	value: string | undefined,
	validValues: readonly T[],
	field: string,
): T | undefined {
	if (!value) return undefined;
	if (validValues.includes(value as T)) {
		return value as T;
	}
	throw new ValidationError("Os dados enviados são inválidos.", {
		details: {
			issues: [{ path: field, message: "Valor inválido." }],
		},
	});
}

// Valid enum values from Prisma schema
export const VALID_EVENT_STATUSES = [
	"DRAFT",
	"PLANNING",
	"CONFIRMED",
	"ONGOING",
	"COMPLETED",
	"CANCELLED",
] as const;
export const VALID_EVENT_TYPES = ["ENGAGEMENT", "WEDDING"] as const;
export const VALID_TASK_STATUSES = [
	"TODO",
	"IN_PROGRESS",
	"COMPLETED",
	"CANCELLED",
] as const;
export const VALID_TASK_CATEGORIES = [
	"FINANCE",
	"VENUE",
	"GUESTS",
	"FOOD",
	"DRINKS",
	"DECORATION",
	"CEREMONY",
	"DOCUMENTS",
	"CLOTHING",
	"TRANSPORT",
	"OTHER",
] as const;
export const VALID_TASK_PRIORITIES = [
	"LOW",
	"MEDIUM",
	"HIGH",
	"URGENT",
] as const;
export const VALID_GUEST_STATUSES = [
	"PENDING",
	"CONFIRMED",
	"DECLINED",
	"WAITING",
	"MAYBE",
	"CANCELLED",
] as const;
export const VALID_GUEST_TYPES = [
	"FAMILY",
	"FRIEND",
	"COLLEAGUE",
	"VIP",
	"OTHER",
] as const;
export const VALID_SUPPLIER_STATUSES = [
	"PROSPECT",
	"CONTACTED",
	"NEGOTIATING",
	"CONFIRMED",
	"COMPLETED",
	"CANCELLED",
] as const;
export const VALID_SUPPLIER_CATEGORIES = [
	"VENUE",
	"CATERING",
	"CAKE",
	"SWEETS_AND_SAVOURIES",
	"DECORATION",
	"FLORIST",
	"PHOTOGRAPHER",
	"VIDEOGRAPHER",
	"DJ",
	"BAND",
	"MUSIC",
	"ENTERTAINMENT",
	"TRANSPORT",
	"BEAUTY",
	"BRIDE_ATTIRE",
	"GROOM_ATTIRE",
	"RINGS",
	"WEDDING_PLANNER",
	"OFFICIANT",
	"FAVOURS",
	"ACCOMMODATION",
	"SECURITY",
	"OTHER",
] as const;
export const VALID_SUPPLIER_PAYMENT_STATUSES = [
	"PENDING",
	"PAID",
	"INSTALLMENTS",
	"OVERDUE",
	"CANCELLED",
] as const;
export const VALID_INVENTORY_CATEGORIES = [
	"DRINK",
	"MATERIAL",
	"EQUIPMENT",
	"FURNITURE",
	"LINEN",
	"OTHER",
] as const;
export const VALID_INVENTORY_STATUSES = [
	"PENDING",
	"IN_PROGRESS",
	"COMPLETED",
] as const;
export const VALID_NOTIFICATION_TYPES = [
	"FINANCE",
	"TASKS",
	"GUESTS",
	"INVENTORY",
	"EVENT",
] as const;
export const VALID_SCHEDULE_STATUSES = [
	"PENDING",
	"IN_PROGRESS",
	"COMPLETED",
	"CANCELLED",
] as const;
export const VALID_MEMBER_ROLES = [
	"OWNER",
	"PARTNER",
	"ADMIN",
	"EDITOR",
	"VIEWER",
] as const;
export const VALID_MEMBER_STATUSES = ["PENDING", "ACTIVE", "DECLINED"] as const;
