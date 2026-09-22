// ── Shared Entity Types ──────────────────────────────────────────
// These types represent the API contracts between backend and frontend.
// They should be derived from Prisma types but represent the API response shape.

// ── Enums ────────────────────────────────────────────────────────
export type EventType = "ENGAGEMENT" | "WEDDING";
export type EventStatus =
	| "DRAFT"
	| "PLANNING"
	| "CONFIRMED"
	| "COMPLETED"
	| "CANCELLED";
export type MemberRole = "OWNER" | "PARTNER" | "ADMIN" | "EDITOR" | "VIEWER";
export type MemberStatus = "PENDING" | "ACTIVE" | "DECLINED";
export type ExpenseType = "EXPENSE" | "INCOME";
export type ExpenseStatus =
	| "PLANNED"
	| "PARTIALLY_PAID"
	| "PAID"
	| "OVERDUE"
	| "CANCELLED";
export type VendorCategory =
	| "VENUE"
	| "DECORATION"
	| "MUSIC"
	| "PHOTOGRAPHY"
	| "VIDEO"
	| "CATERING"
	| "CAKE"
	| "DRINKS"
	| "TRANSPORT"
	| "BEAUTY"
	| "SECURITY"
	| "ENTERTAINMENT"
	| "OTHER";
export type VendorStatus =
	| "PROSPECT"
	| "CONTACTED"
	| "NEGOTIATING"
	| "CONTRACTED"
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
	| "FOOD"
	| "CAKE"
	| "DECORATION"
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

export type BudgetCategory = {
	id: string;
	eventId: string;
	name: string;
	description: string | null;
	plannedAmount: number;
	createdAt: Date;
	updatedAt: Date;
};

export type BudgetWithCategories = Budget & {
	categories: BudgetCategory[];
};

// ── Expense ──────────────────────────────────────────────────────
export type Expense = {
	id: string;
	eventId: string;
	budgetCategoryId: string | null;
	vendorId: string | null;
	description: string;
	type: ExpenseType;
	totalAmount: number;
	dueDate: Date | null;
	status: ExpenseStatus;
	paidPercentage: number;
	notes: string | null;
	createdBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type ExpenseWithRelations = Expense & {
	vendor: Vendor | null;
	budgetCategory: BudgetCategory | null;
	payments: Payment[];
};

// ── Payment ──────────────────────────────────────────────────────
export type Payment = {
	id: string;
	expenseId: string;
	amount: number;
	paymentDate: Date;
	method: string;
	reference: string | null;
	notes: string | null;
	createdBy: string;
	createdAt: Date;
	updatedAt: Date;
};

// ── Vendor ───────────────────────────────────────────────────────
export type Vendor = {
	id: string;
	eventId: string;
	name: string;
	category: VendorCategory;
	phone: string | null;
	email: string | null;
	address: string | null;
	status: VendorStatus;
	description: string | null;
	notes: string | null;
	createdAt: Date;
	updatedAt: Date;
};

export type VendorWithRelations = Vendor & {
	expenses: Expense[];
	contracts: VendorContract[];
};

// ── VendorContract ───────────────────────────────────────────────
export type VendorContract = {
	id: string;
	eventId: string;
	vendorId: string;
	number: string | null;
	startDate: Date | null;
	endDate: Date | null;
	amount: number | null;
	status: string;
	documentId: string | null;
	notes: string | null;
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
	unit: InventoryUnit;
	unitPrice: number | null;
	vendorId: string | null;
	notes: string | null;
	createdAt: Date;
	updatedAt: Date;
};

export type InventoryItemWithRelations = InventoryItem & {
	vendor: Vendor | null;
	movements: InventoryMovement[];
};

// ── InventoryMovement ───────────────────────────────────────────
export type InventoryMovement = {
	id: string;
	inventoryItemId: string;
	type: MovementType;
	quantity: number;
	reason: string | null;
	createdBy: string;
	createdAt: Date;
};

// ── Document ─────────────────────────────────────────────────────
export type Document = {
	id: string;
	eventId: string;
	name: string;
	type: DocumentType;
	reference: string | null;
	vendorId: string | null;
	expenseId: string | null;
	paymentId: string | null;
	status: DocumentStatus;
	createdBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type DocumentWithRelations = Document & {
	vendor: Vendor | null;
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

// ── Guest Stats ──────────────────────────────────────────────────
export type GuestStats = {
	totalGuests: number;
	confirmed: number;
	pending: number;
	declined: number;
	waiting: number;
	maybe: number;
	cancelled: number;
	totalCompanions: number;
	totalConfirmedPeople: number;
	capacity: number;
	atCapacity: boolean;
	limitGuestCapacity: boolean;
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
	status?: EventStatus;
	eventDate?: string;
	venueName?: string;
	description?: string;
	capacity?: number;
	startTime?: string;
	endTime?: string;
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

export type CreateVendorInput = {
	eventId: string;
	name: string;
	category: VendorCategory;
	phone?: string;
	email?: string;
	address?: string;
	description?: string;
};

export type CreateExpenseInput = {
	eventId: string;
	description: string;
	totalAmount: number;
	budgetCategoryId?: string;
	vendorId?: string;
	dueDate?: string;
	notes?: string;
};

export type CreateInventoryItemInput = {
	eventId: string;
	name: string;
	category: InventoryCategory;
	plannedQuantity: number;
	currentQuantity?: number;
	unit: InventoryUnit;
	unitPrice?: number;
	vendorId?: string;
	notes?: string;
};

export type CreateDocumentInput = {
	eventId: string;
	name: string;
	type: DocumentType;
	reference?: string;
	vendorId?: string;
	expenseId?: string;
	paymentId?: string;
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
