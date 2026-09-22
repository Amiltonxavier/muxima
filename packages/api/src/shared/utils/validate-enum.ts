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
export const VALID_VENDOR_STATUSES = [
	"PROSPECT",
	"CONTACTED",
	"NEGOTIATING",
	"CONTRACTED",
	"COMPLETED",
	"CANCELLED",
] as const;
export const VALID_VENDOR_CATEGORIES = [
	"VENUE",
	"DECORATION",
	"MUSIC",
	"PHOTOGRAPHY",
	"VIDEO",
	"CATERING",
	"CAKE",
	"DRINKS",
	"TRANSPORT",
	"BEAUTY",
	"SECURITY",
	"ENTERTAINMENT",
	"OTHER",
] as const;
export const VALID_EXPENSE_STATUSES = [
	"PLANNED",
	"PARTIALLY_PAID",
	"PAID",
	"OVERDUE",
	"CANCELLED",
] as const;
export const VALID_EXPENSE_TYPES = ["EXPENSE", "INCOME"] as const;
export const VALID_INVENTORY_CATEGORIES = [
	"DRINK",
	"FOOD",
	"CAKE",
	"DECORATION",
	"OTHER",
] as const;
export const VALID_DOCUMENT_TYPES = [
	"CONTRACT",
	"RECEIPT",
	"QUOTE",
	"OTHER",
] as const;
export const VALID_DOCUMENT_STATUSES = [
	"ACTIVE",
	"ARCHIVED",
	"DELETED",
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
