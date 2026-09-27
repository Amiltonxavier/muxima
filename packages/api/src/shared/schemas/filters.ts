import { z } from "zod";

// ── Base pagination ──────────────────────────────────────────────
export const paginationInput = z.object({
	page: z.number().int().min(1).optional().default(1),
	limit: z.number().int().min(1).max(100).optional().default(20),
});

export type PaginationInput = z.infer<typeof paginationInput>;

// ── Events ───────────────────────────────────────────────────────
export const eventFiltersSchema = z.object({
	search: z.string().trim().optional(),
	status: z
		.enum([
			"DRAFT",
			"PLANNING",
			"CONFIRMED",
			"ONGOING",
			"COMPLETED",
			"CANCELLED",
		])
		.optional(),
	type: z.enum(["ENGAGEMENT", "WEDDING"]).optional(),
});

export type EventFilters = z.infer<typeof eventFiltersSchema>;

export const eventListInput = paginationInput.merge(eventFiltersSchema);
export type EventListInput = z.infer<typeof eventListInput>;

// ── Tasks ────────────────────────────────────────────────────────
export const taskFiltersSchema = z.object({
	search: z.string().trim().optional(),
	status: z.enum(["TODO", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
	category: z
		.enum([
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
		])
		.optional(),
	priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
});

export type TaskFilters = z.infer<typeof taskFiltersSchema>;

export const taskListInput = paginationInput.merge(taskFiltersSchema);
export type TaskListInput = z.infer<typeof taskListInput>;

// ── Guests ───────────────────────────────────────────────────────
export const guestFiltersSchema = z.object({
	search: z.string().trim().optional(),
	status: z
		.enum(["PENDING", "CONFIRMED", "DECLINED", "WAITING", "MAYBE", "CANCELLED"])
		.optional(),
	type: z.enum(["FAMILY", "FRIEND", "COLLEAGUE", "VIP", "OTHER"]).optional(),
});

export type GuestFilters = z.infer<typeof guestFiltersSchema>;

export const guestListInput = paginationInput.merge(guestFiltersSchema);
export type GuestListInput = z.infer<typeof guestListInput>;

// ── Vendors ──────────────────────────────────────────────────────
export const vendorFiltersSchema = z.object({
	search: z.string().trim().optional(),
	category: z
		.enum([
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
		])
		.optional(),
	status: z
		.enum([
			"PROSPECT",
			"CONTACTED",
			"NEGOTIATING",
			"CONTRACTED",
			"COMPLETED",
			"CANCELLED",
		])
		.optional(),
});

export type VendorFilters = z.infer<typeof vendorFiltersSchema>;

export const vendorListInput = paginationInput.merge(vendorFiltersSchema);
export type VendorListInput = z.infer<typeof vendorListInput>;

// ── Expenses ─────────────────────────────────────────────────────
export const expenseFiltersSchema = z.object({
	search: z.string().trim().optional(),
	status: z
		.enum(["PLANNED", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"])
		.optional(),
	type: z.enum(["EXPENSE", "INCOME"]).optional(),
	vendorId: z.string().uuid().optional(),
});

export type ExpenseFilters = z.infer<typeof expenseFiltersSchema>;

export const expenseListInput = paginationInput.merge(expenseFiltersSchema);
export type ExpenseListInput = z.infer<typeof expenseListInput>;

// ── Inventory ────────────────────────────────────────────────────
export const inventoryFiltersSchema = z.object({
	search: z.string().trim().optional(),
	category: z
		.enum(["DRINK", "MATERIAL", "EQUIPMENT", "FURNITURE", "LINEN", "OTHER"])
		.optional(),
	status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]).optional(),
});

export type InventoryFilters = z.infer<typeof inventoryFiltersSchema>;

export const inventoryListInput = paginationInput.merge(inventoryFiltersSchema);
export type InventoryListInput = z.infer<typeof inventoryListInput>;

// ── Documents ────────────────────────────────────────────────────
export const documentFiltersSchema = z.object({
	search: z.string().trim().optional(),
	type: z.enum(["CONTRACT", "RECEIPT", "QUOTE", "OTHER"]).optional(),
	status: z.enum(["ACTIVE", "ARCHIVED", "DELETED"]).optional(),
	supplierId: z.string().uuid().optional(),
});

export type DocumentFilters = z.infer<typeof documentFiltersSchema>;

export const documentListInput = paginationInput.merge(documentFiltersSchema);
export type DocumentListInput = z.infer<typeof documentListInput>;

// ── Tables ───────────────────────────────────────────────────────
export const tableFiltersSchema = z.object({
	search: z.string().trim().optional(),
});

export type TableFilters = z.infer<typeof tableFiltersSchema>;

export const tableListInput = paginationInput.merge(tableFiltersSchema);
export type TableListInput = z.infer<typeof tableListInput>;

// ── Schedules ────────────────────────────────────────────────────
export const scheduleFiltersSchema = z.object({
	search: z.string().trim().optional(),
	status: z
		.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"])
		.optional(),
});

export type ScheduleFilters = z.infer<typeof scheduleFiltersSchema>;

export const scheduleListInput = paginationInput.merge(scheduleFiltersSchema);
export type ScheduleListInput = z.infer<typeof scheduleListInput>;

// ── Notifications ────────────────────────────────────────────────
export const notificationFiltersSchema = z.object({
	search: z.string().trim().optional(),
	type: z.enum(["FINANCE", "TASKS", "GUESTS", "INVENTORY", "EVENT"]).optional(),
	read: z.boolean().optional(),
});

export type NotificationFilters = z.infer<typeof notificationFiltersSchema>;

export const notificationListInput = paginationInput.merge(
	notificationFiltersSchema,
);
export type NotificationListInput = z.infer<typeof notificationListInput>;

// ── Members ──────────────────────────────────────────────────────
export const memberFiltersSchema = z.object({
	search: z.string().trim().optional(),
	role: z.enum(["OWNER", "PARTNER", "ADMIN", "EDITOR", "VIEWER"]).optional(),
	status: z.enum(["PENDING", "ACTIVE", "DECLINED"]).optional(),
});

export type MemberFilters = z.infer<typeof memberFiltersSchema>;

export const memberListInput = paginationInput.merge(memberFiltersSchema);
export type MemberListInput = z.infer<typeof memberListInput>;

// ── Dedications ──────────────────────────────────────────────────
export const dedicationFiltersSchema = z.object({
	search: z.string().trim().optional(),
	type: z.enum(["WEDDING_VOW", "ENGAGEMENT_VOW", "DEDICATION"]).optional(),
	status: z.enum(["NOT_STARTED", "DRAFT", "IN_PROGRESS", "READY"]).optional(),
	visibility: z.enum(["PRIVATE", "SHARED"]).optional(),
});

export type DedicationFilters = z.infer<typeof dedicationFiltersSchema>;

export const dedicationListInput = paginationInput.merge(
	dedicationFiltersSchema,
);
export type DedicationListInput = z.infer<typeof dedicationListInput>;
