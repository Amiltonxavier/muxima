// ── Shared Entity Types ──────────────────────────────────────────
// These types represent the API contracts between backend and frontend.
// They should be derived from Prisma types but represent the API response shape.

// ── Enums ────────────────────────────────────────────────────────
export type EventType = "ENGAGEMENT" | "WEDDING";
export type EventStatus =
	| "DRAFT"
	| "PLANNING"
	| "CONFIRMED"
	| "ONGOING"
	| "COMPLETED"
	| "CANCELLED";
export type MemberRole = "OWNER" | "PARTNER" | "ADMIN" | "EDITOR" | "VIEWER";
export type MemberStatus = "PENDING" | "ACTIVE" | "DECLINED";
export type SupplierCategory =
	| "VENUE"
	| "CATERING"
	| "CAKE"
	| "SWEETS_AND_SAVOURIES"
	| "DECORATION"
	| "FLORIST"
	| "PHOTOGRAPHER"
	| "VIDEOGRAPHER"
	| "DJ"
	| "BAND"
	| "MUSIC"
	| "ENTERTAINMENT"
	| "TRANSPORT"
	| "BEAUTY"
	| "BRIDE_ATTIRE"
	| "GROOM_ATTIRE"
	| "RINGS"
	| "WEDDING_PLANNER"
	| "OFFICIANT"
	| "FAVOURS"
	| "ACCOMMODATION"
	| "SECURITY"
	| "OTHER";
export type SupplierStatus =
	| "PROSPECT"
	| "CONTACTED"
	| "NEGOTIATING"
	| "CONFIRMED"
	| "COMPLETED"
	| "CANCELLED";
export type SupplierPaymentStatus =
	| "PENDING"
	| "PAID"
	| "INSTALLMENTS"
	| "OVERDUE"
	| "CANCELLED";
export type SupplierPaymentModel = "FULL" | "INSTALLMENTS" | "CUSTOM";
export type InstallmentStatus = "PENDING" | "PAID" | "OVERDUE" | "CANCELLED";
export type FoodPlanCategory =
	| "STARTER"
	| "MAIN_COURSE"
	| "SIDE_DISH"
	| "DESSERT"
	| "FRUIT"
	| "OTHER";
export type FoodPlanUnit =
	| "UNIT"
	| "PLATE"
	| "BOWL"
	| "PORTION"
	| "GRAM"
	| "KILOGRAM"
	| "LITER"
	| "GLASS"
	| "BOTTLE"
	| "PACKAGE"
	| "OTHER";
export type FoodPlanStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";
export type ChecklistStatus =
	| "PENDING"
	| "IN_PROGRESS"
	| "COMPLETED"
	| "CANCELLED";
export type GuestType = "FAMILY" | "FRIEND" | "COLLEAGUE" | "VIP" | "OTHER";
export type GuestStatus =
	| "PENDING"
	| "CONFIRMED"
	| "DECLINED"
	| "WAITING"
	| "MAYBE"
	| "CANCELLED";
export type CompanionStatus = "PENDING" | "CONFIRMED" | "DECLINED";
export type GuestInvitationStatus =
	| "CREATED"
	| "SENT"
	| "OPENED"
	| "RESPONDED"
	| "EXPIRED"
	| "CANCELLED";
export type RsvpStatus = "PENDING" | "CONFIRMED" | "MAYBE" | "DECLINED";
export type InvitationResponse = "CONFIRM" | "DECLINE" | "MAYBE";
export type TaskCategory =
	| "FINANCE"
	| "VENUE"
	| "GUESTS"
	| "FOOD"
	| "DRINKS"
	| "DECORATION"
	| "CEREMONY"
	| "DOCUMENTS"
	| "CLOTHING"
	| "TRANSPORT"
	| "OTHER";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type ScheduleStatus =
	| "PENDING"
	| "IN_PROGRESS"
	| "COMPLETED"
	| "CANCELLED";
export type InventoryCategory =
	| "DRINK"
	| "MATERIAL"
	| "EQUIPMENT"
	| "FURNITURE"
	| "LINEN"
	| "OTHER";
export type InventoryUnit =
	| "UNIT"
	| "BOX"
	| "CASE"
	| "BOTTLE"
	| "KG"
	| "LITER"
	| "PACKAGE"
	| "OTHER";
export type MovementType =
	| "PURCHASE"
	| "ADD"
	| "CONSUMPTION"
	| "ADJUSTMENT"
	| "LOSS"
	| "RETURN";
export type InventoryStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";
export type DocumentType = "CONTRACT" | "RECEIPT" | "QUOTE" | "OTHER";
export type DocumentStatus = "ACTIVE" | "ARCHIVED" | "DELETED";
export type NotificationType =
	| "FINANCE"
	| "TASKS"
	| "GUESTS"
	| "INVENTORY"
	| "EVENT";
export type NotificationPriority =
	| "INFO"
	| "WARNING"
	| "IMPORTANT"
	| "CRITICAL";

// ── User ─────────────────────────────────────────────────────────
export type User = {
	id: string;
	name: string;
	email: string;
	createdAt: Date;
	updatedAt: Date;
};

export type UserSummary = Pick<User, "id" | "name" | "email">;

// ── Event ────────────────────────────────────────────────────────
export type Event = {
	id: string;
	ownerId: string;
	name: string;
	type: EventType;
	status: EventStatus;
	eventDate: Date | null;
	startTime: string | null;
	endTime: string | null;
	venueName: string | null;
	address: string | null;
	province: string | null;
	municipality: string | null;
	neighborhood: string | null;
	reference: string | null;
	latitude: number | null;
	longitude: number | null;
	capacity: number | null;
	limitGuestCapacity: boolean;
	currency: string;
	description: string | null;
	createdAt: Date;
	updatedAt: Date;
};

export type EventListItem = Pick<
	Event,
	| "id"
	| "name"
	| "type"
	| "status"
	| "eventDate"
	| "venueName"
	| "capacity"
	| "currency"
	| "description"
	| "createdAt"
> & {
	members: EventMember[];
	budget: Budget | null;
};

export type EventWithMembers = Event & {
	members: EventMember[];
	budget: Budget | null;
};

// ── EventMember ──────────────────────────────────────────────────
export type EventMember = {
	id: string;
	eventId: string;
	userId: string;
	role: MemberRole;
	status: MemberStatus;
	joinedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
};

export type EventMemberWithUser = EventMember & {
	user: UserSummary;
};

// ── Budget ───────────────────────────────────────────────────────
export type Budget = {
	id: string;
	eventId: string;
	plannedAmount: number;
	reserveAmount: number | null;
	notes: string | null;
	createdAt: Date;
	updatedAt: Date;
};

// ── Supplier ────────────────────────────────────────────────────
export type Supplier = {
	id: string;
	eventId: string;
	name: string;
	category: SupplierCategory;
	price: number | null;
	phone: string | null;
	email: string | null;
	address: string | null;
	status: SupplierStatus;
	paymentModel: SupplierPaymentModel;
	paymentStatus: SupplierPaymentStatus;
	nextDueDate: Date | null;
	description: string | null;
	notes: string | null;
	categoryFields: unknown;
	customFields: unknown;
	createdAt: Date;
	updatedAt: Date;
};

/** Money figures resolved by the backend finance module. */
export type SupplierMoney = {
	total: number;
	paid: number;
	pending: number;
	percentage: number;
	paymentStatus: SupplierPaymentStatus;
	nextDueDate: Date | null;
	hasInstallments: boolean;
	isFullyPaid: boolean;
};

export type SupplierPayment = {
	id: string;
	supplierId: string;
	amount: number;
	paymentDate: Date;
	method: string;
	reference: string | null;
	notes: string | null;
	createdBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type SupplierInstallment = {
	id: string;
	supplierId: string;
	position: number;
	amount: number;
	dueDate: Date;
	paidAt: Date | null;
	status: InstallmentStatus;
	notes: string | null;
	createdAt: Date;
	updatedAt: Date;
};

export type SupplierWithRelations = Supplier & {
	payments: SupplierPayment[];
	installments: SupplierInstallment[];
};

// ── Food Plan ───────────────────────────────────────────────────
export type FoodPlan = {
	id: string;
	eventId: string;
	supplierId: string | null;
	notes: string | null;
	createdAt: Date;
	updatedAt: Date;
};

export type FoodPlanItem = {
	id: string;
	eventId: string;
	foodPlanId: string;
	name: string;
	category: FoodPlanCategory;
	quantity: number;
	unit: FoodPlanUnit;
	description: string | null;
	notes: string | null;
	status: FoodPlanStatus;
	customFields: unknown;
	position: number;
	createdAt: Date;
	updatedAt: Date;
};

// ── Checklist ───────────────────────────────────────────────────
export type ChecklistItem = {
	id: string;
	eventId: string;
	title: string;
	description: string | null;
	status: ChecklistStatus;
	position: number;
	dueDate: Date | null;
	supplierId: string | null;
	inventoryItemId: string | null;
	autoManaged: boolean;
	completedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
};

// ── Guest ────────────────────────────────────────────────────────
export type Guest = {
	id: string;
	eventId: string;
	name: string;
	phone: string | null;
	email: string | null;
	group: string | null;
	type: GuestType;
	status: GuestStatus;
	companionsLimit: number;
	notes: string | null;
	createdAt: Date;
	updatedAt: Date;
};

export type GuestWithRelations = Guest & {
	companions: GuestCompanion[];
	tableGuests: TableGuestWithTable[];
	invitationGuests: InvitationGuestWithInvitation[];
};

// ── GuestCompanion ──────────────────────────────────────────────
export type GuestCompanion = {
	id: string;
	guestId: string;
	name: string;
	status: CompanionStatus;
	createdAt: Date;
	updatedAt: Date;
};

// ── GuestInvitation ─────────────────────────────────────────────
export type GuestInvitation = {
	id: string;
	eventId: string;
	code: string;
	url: string | null;
	status: GuestInvitationStatus;
	sentAt: Date | null;
	openedAt: Date | null;
	respondedAt: Date | null;
	publishedAt: Date | null;
	response: InvitationResponse | null;
	rsvpStatus: RsvpStatus;
	expiresAt: Date | null;
	qrCode: string | null;
	createdAt: Date;
	updatedAt: Date;
};

export type InvitationGuest = {
	id: string;
	invitationId: string;
	guestId: string;
	createdAt: Date;
};

export type InvitationGuestWithInvitation = InvitationGuest & {
	invitation: GuestInvitation;
};

export type GuestInvitationWithGuests = GuestInvitation & {
	guests: (InvitationGuest & { guest: Guest })[];
	event: {
		id: string;
		name: string;
		type: EventType;
		eventDate: Date | null;
		startTime: string | null;
		endTime: string | null;
		venueName: string | null;
		address: string | null;
		neighborhood: string | null;
		municipality: string | null;
		province: string | null;
		description: string | null;
		capacity: number | null;
		limitGuestCapacity: boolean;
		status: EventStatus;
		owner: UserSummary;
	};
};

export type PublicInvitationGuest = {
	id: string;
	name: string;
	status: GuestStatus;
	companions: GuestCompanion[];
};

export type PublicInvitation = {
	id: string;
	code: string;
	status: GuestInvitationStatus;
	rsvpStatus: RsvpStatus;
	response: InvitationResponse | null;
	respondedAt: Date | null;
	expiresAt: Date | null;
	publishedAt: Date | null;
	canRespond: boolean;
	event: {
		id: string;
		name: string;
		type: EventType;
		status: EventStatus;
		eventDate: Date | null;
		startTime: string | null;
		endTime: string | null;
		venueName: string | null;
		address: string | null;
		neighborhood: string | null;
		municipality: string | null;
		province: string | null;
		description: string | null;
	};
	host: UserSummary;
	guests: PublicInvitationGuest[];
};

export type PublicInvitationLookup =
	| { result: "NOT_FOUND" }
	| { result: "EXPIRED" }
	| { result: "CANCELLED" }
	| { result: "AVAILABLE"; invitation: PublicInvitation };

export type InvitationStats = {
	total: number;
	published: number;
	unpublished: number;
	responded: number;
	responses: Record<InvitationResponse, number>;
	expired: number;
	cancelled: number;
	responseRate: number;
};

// ── Table ────────────────────────────────────────────────────────
export type Table = {
	id: string;
	eventId: string;
	name: string;
	number: number | null;
	capacity: number;
	location: string | null;
	notes: string | null;
	deletedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
};

export type TableGuest = {
	id: string;
	tableId: string;
	guestId: string;
	assignedAt: Date;
};

export type TableGuestWithTable = TableGuest & {
	table: Table;
};

export type TableWithGuests = Table & {
	tableGuests: (TableGuest & { guest: Guest })[];
};

// ── Task ─────────────────────────────────────────────────────────
export type Task = {
	id: string;
	eventId: string;
	title: string;
	description: string | null;
	category: TaskCategory;
	priority: TaskPriority;
	status: TaskStatus;
	assignedTo: string | null;
	dueDate: Date | null;
	completedAt: Date | null;
	completedBy: string | null;
	createdBy: string;
	createdAt: Date;
	updatedAt: Date;
};

// ── Schedule ─────────────────────────────────────────────────────
export type Schedule = {
	id: string;
	eventId: string;
	title: string;
	description: string | null;
	startAt: Date;
	endAt: Date | null;
	location: string | null;
	responsible: string | null;
	status: ScheduleStatus;
	createdAt: Date;
	updatedAt: Date;
};

// ── Inventory ────────────────────────────────────────────────────
export type InventoryItem = {
	id: string;
	eventId: string;
	name: string;
	category: InventoryCategory;
	plannedQuantity: number;
	currentQuantity: number;
	status: InventoryStatus;
	unit: InventoryUnit;
	unitPrice: number | null;
	customFields: unknown;
	notes: string | null;
	createdAt: Date;
	updatedAt: Date;
};

export type InventoryItemWithRelations = InventoryItem & {
	movements: InventoryMovement[];
};

// Row shape returned by the inventory list/detail endpoints. All quantities,
// values and percentages are calculated by the backend — the frontend only
// renders them.
export type InventoryListItem = {
	id: string;
	eventId: string;
	name: string;
	category: InventoryCategory;
	unit: InventoryUnit;
	status: InventoryStatus;
	plannedQuantity: number;
	currentQuantity: number;
	remainingQuantity: number;
	completionPercentage: number;
	unitPrice: number | null;
	totalValue: number;
	completedValue: number;
	pendingValue: number;
	customFields: unknown;
	notes: string | null;
	createdAt: Date;
	updatedAt: Date;
};

// ── InventoryMovement ───────────────────────────────────────────
export type InventoryMovement = {
	id: string;
	inventoryItemId: string;
	type: MovementType;
	quantity: number;
	unitPrice: number | null;
	totalCost: number | null;
	reason: string | null;
	createdBy: string;
	createdAt: Date;
};

export type InventoryMovementDto = InventoryMovement & {
	creator: UserSummary | null;
};

export type InventoryHistory = {
	item: {
		id: string;
		name: string;
		unit: InventoryUnit;
		status: InventoryStatus;
		plannedQuantity: number;
		currentQuantity: number;
		remainingQuantity: number;
		completionPercentage: number;
		unitPrice: number | null;
	};
	movements: InventoryMovementDto[];
	totals: {
		movementsCount: number;
		totalEntered: number;
		totalCost: number;
	};
};

// ── Inventory Stats ──────────────────────────────────────────────
export type InventoryStats = {
	totalItems: number;
	totalQuantity: number;
	totalCurrent: number;
	totalRemaining: number;
	completionPercentage: number;
	totalValue: number;
	completedValue: number;
	pendingValue: number;
	completedItems: number;
	inProgressItems: number;
	pendingItems: number;
	lowStockItems: number;
	outOfStockItems: number;
	movementCount: number;
};

// ── Document ─────────────────────────────────────────────────────
export type Document = {
	id: string;
	eventId: string;
	name: string;
	type: DocumentType;
	reference: string | null;
	supplierId: string | null;
	supplierPaymentId: string | null;
	supplierInstallmentId: string | null;
	status: DocumentStatus;
	createdBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type DocumentWithRelations = Document & {
	supplier: Supplier | null;
};

// ── Notification ─────────────────────────────────────────────────
export type Notification = {
	id: string;
	userId: string;
	eventId: string | null;
	type: NotificationType;
	title: string;
	message: string;
	priority: NotificationPriority;
	readAt: Date | null;
	createdAt: Date;
};

// ── AuditLog ─────────────────────────────────────────────────────
export type AuditLog = {
	id: string;
	eventId: string;
	userId: string;
	action: string;
	entity: string;
	entityId: string | null;
	oldData: unknown;
	newData: unknown;
	createdAt: Date;
};

// ── Dedication ───────────────────────────────────────────────────
export type DedicationType = "WEDDING_VOW" | "ENGAGEMENT_VOW" | "DEDICATION";
export type DedicationStatus =
	| "NOT_STARTED"
	| "DRAFT"
	| "IN_PROGRESS"
	| "READY";

/**
 * Actions this module writes to the shared `AuditLog` model. Kept as a union
 * instead of a new Prisma enum so the existing audit table is reused as-is.
 */
export type DedicationAuditAction =
	| "CREATED"
	| "UPDATED"
	| "STATUS_CHANGED"
	| "LOCKED"
	| "UNLOCKED"
	| "VIEWER_ADDED"
	| "VIEWER_REMOVED"
	| "OPENED"
	| "DELETED";

/**
 * A node of the Tiptap document tree. Only the shapes produced by the
 * editor's schema survive `sanitizeRichTextContent`, so this type doubles as
 * the contract the backend guarantees to the renderer.
 */
export type RichTextMark = {
	type: "bold" | "italic" | "underline" | "strike" | "code" | "link";
	attrs?: { href?: string; target?: string; rel?: string };
};

export type RichTextNode = {
	type: string;
	attrs?: Record<string, string | number | boolean | null>;
	content?: RichTextNode[];
	text?: string;
	marks?: RichTextMark[];
};

/** Who the current user is with respect to a given dedication. */
export type DedicationAccess = "OWNER" | "VIEWER";

/** Filter applied to the visibility column of the table. */
export type DedicationVisibilityFilter = "ALL" | "PRIVATE" | "SHARED";

export type Dedication = {
	id: string;
	eventId: string;
	ownerId: string;
	title: string;
	type: DedicationType;
	status: DedicationStatus;
	content: RichTextNode;
	isLocked: boolean;
	lastOpenedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
};

/** Row shape returned by the list endpoint. Counts come from the backend. */
export type DedicationListItem = {
	id: string;
	eventId: string;
	ownerId: string;
	title: string;
	type: DedicationType;
	status: DedicationStatus;
	isLocked: boolean;
	lastOpenedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
	owner: UserSummary;
	/** Whether the requester owns the dedication or was granted read access. */
	access: DedicationAccess;
	viewerCount: number;
	/** Plain-text preview of the body, generated by the backend. */
	excerpt: string;
};

export type DedicationDetail = DedicationListItem & {
	content: RichTextNode;
	owner: UserSummary;
	/** When *this* viewer last opened it, if the requester is not the owner. */
	viewerLastOpenedAt: Date | null;
};

export type DedicationViewerDto = {
	id: string;
	dedicationId: string;
	eventMemberId: string;
	lastOpenedAt: Date | null;
	createdAt: Date;
	member: {
		id: string;
		userId: string;
		role: MemberRole;
		status: MemberStatus;
		user: UserSummary;
	};
};

export type DedicationHistoryEntry = {
	id: string;
	action: DedicationAuditAction;
	userId: string;
	actor: UserSummary | null;
	/** Already-resolved label, so the frontend never parses free-form data. */
	message: string;
	createdAt: Date;
};

export type DedicationStats = {
	total: number;
	notStarted: number;
	draft: number;
	inProgress: number;
	ready: number;
	privateCount: number;
	sharedCount: number;
	sharedWithMe: number;
	/** Of the shared ones, how many the current user has already opened. */
	openedByMe: number;
};

// ── Guest Stats ──────────────────────────────────────────────────
export type GuestTypeStats = {
	total: number;
	confirmed: number;
	pending: number;
	declined: number;
};

export type GuestStats = {
	totalGuests: number;
	confirmed: number;
	pending: number;
	declined: number;
	waiting: number;
	maybe: number;
	cancelled: number;
	totalCompanions: number;
	confirmedCompanions: number;
	totalConfirmedPeople: number;
	confirmationRate: number;
	capacity: number;
	atCapacity: boolean;
	limitGuestCapacity: boolean;
	byType: Record<GuestType, GuestTypeStats>;
};

// ── Table Stats ──────────────────────────────────────────────────
export type TableStats = {
	total: number;
	totalCapacity: number;
	totalOccupied: number;
	available: number;
	fullTables: number;
	partialTables: number;
	emptyTables: number;
	occupancyRate: number;
};

// ── Task Stats ───────────────────────────────────────────────────
export type TaskStats = {
	total: number;
	todo: number;
	inProgress: number;
	completed: number;
	cancelled: number;
	completionRate: number;
	overdue: number;
};

// ── Schedule Stats ───────────────────────────────────────────────
export type ScheduleStats = {
	total: number;
	pending: number;
	inProgress: number;
	completed: number;
	cancelled: number;
};

// ── Budget aggregates (backend derived) ─────────────────────────
export type BudgetTotals = {
	totalBudget: number;
	reserve: number;
	available: number;
	planned: number;
	spent: number;
	pending: number;
	overdue: number;
	remaining: number;
	usagePercentage: number;
	/** Share of the committed amount that has already been settled, 0..100. */
	paymentPercentage: number;
	currency: string;
};

export type BudgetStats = BudgetTotals & {
	byCategory: BudgetBreakdownEntry[];
	bySource: BudgetBreakdownEntry[];
	byPaymentStatus: BudgetBreakdownEntry[];
};

export type BudgetBreakdownEntry = {
	key: string;
	label: string;
	planned: number;
	paid: number;
	pending: number;
	percentage: number;
	count: number;
};

// ── API Response Types ───────────────────────────────────────────
export type PaginationMeta = {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
};

export type PaginatedResponse<T> = {
	data: T[];
	meta: PaginationMeta;
};

export type ApiResponse<T> = {
	data: T;
};

// ── Form Input Types ─────────────────────────────────────────────
export type CreateEventInput = {
	name: string;
	type: EventType;
	eventDate?: string;
	venueName?: string;
	description?: string;
	capacity?: number;
	budgetAmount?: number;
};

export type UpdateEventInput = {
	name?: string;
	type?: EventType;
	eventDate?: string;
	venueName?: string;
	description?: string;
	capacity?: number;
	startTime?: string;
	endTime?: string;
	status?: EventStatus;
};

export type CreateTaskInput = {
	eventId: string;
	title: string;
	description?: string;
	category: TaskCategory;
	priority?: TaskPriority;
	assignedTo?: string;
	dueDate?: string;
};

export type UpdateTaskInput = {
	id: string;
	title?: string;
	description?: string;
	category?: TaskCategory;
	priority?: TaskPriority;
	status?: TaskStatus;
	dueDate?: string;
};

export type CreateGuestInput = {
	eventId: string;
	name: string;
	phone?: string;
	email?: string;
	group?: string;
	type?: GuestType;
	companionsLimit?: number;
	notes?: string;
	tableId?: string;
};

export type CreateSupplierInput = {
	eventId: string;
	name: string;
	category: SupplierCategory;
	price?: number;
	phone?: string;
	email?: string;
	address?: string;
	description?: string;
	notes?: string;
	customFields?: Record<string, unknown>;
	categoryFields?: Record<string, unknown>;
};

export type CreateInventoryItemInput = {
	eventId: string;
	name: string;
	category: InventoryCategory;
	plannedQuantity: number;
	currentQuantity?: number;
	unit: InventoryUnit;
	unitPrice?: number;
	notes?: string;
	customFields?: Record<string, unknown>;
};

export type CreateDocumentInput = {
	eventId: string;
	name: string;
	type: DocumentType;
	reference?: string;
	supplierId?: string;
	supplierPaymentId?: string;
	supplierInstallmentId?: string;
};

export type CreateScheduleInput = {
	eventId: string;
	title: string;
	description?: string;
	startAt: string;
	endAt?: string;
	location?: string;
	responsible?: string;
};
