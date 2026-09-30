/**
 * Validates a string value against an array of valid enum values.
 * Returns the value if valid, undefined otherwise.
 */
export function validateEnum<T extends string>(
	value: string | undefined,
	validValues: readonly T[],
): T | undefined {
	if (!value) return undefined;
	if (validValues.includes(value as T)) {
		return value as T;
	}
	return undefined;
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
