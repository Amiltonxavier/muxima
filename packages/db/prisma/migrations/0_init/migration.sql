-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."CompanionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DECLINED');

-- CreateEnum
CREATE TYPE "public"."ContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."DocumentStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'DELETED');

-- CreateEnum
CREATE TYPE "public"."DocumentType" AS ENUM ('CONTRACT', 'RECEIPT', 'QUOTE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."EventStatus" AS ENUM ('DRAFT', 'PLANNING', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."EventType" AS ENUM ('ENGAGEMENT', 'WEDDING', 'BIRTHDAY', 'CONFERENCE', 'WORKSHOP', 'GRADUATION', 'DINNER', 'CORPORATE', 'BABY_SHOWER', 'CEREMONY', 'PARTY');

-- CreateEnum
CREATE TYPE "public"."ExpenseStatus" AS ENUM ('PLANNED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."ExpenseType" AS ENUM ('EXPENSE', 'INCOME');

-- CreateEnum
CREATE TYPE "public"."GuestInvitationStatus" AS ENUM ('CREATED', 'SENT', 'OPENED', 'RESPONDED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."GuestStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DECLINED', 'WAITING', 'CANCELLED', 'MAYBE');

-- CreateEnum
CREATE TYPE "public"."GuestType" AS ENUM ('FAMILY', 'FRIEND', 'COLLEAGUE', 'VIP', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."InventoryCategory" AS ENUM ('DRINK', 'FOOD', 'CAKE', 'DECORATION', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."InventoryUnit" AS ENUM ('UNIT', 'BOX', 'CASE', 'BOTTLE', 'KG', 'LITER', 'PACKAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."MemberRole" AS ENUM ('OWNER', 'PARTNER', 'ADMIN', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "public"."MemberStatus" AS ENUM ('PENDING', 'ACTIVE', 'DECLINED');

-- CreateEnum
CREATE TYPE "public"."MovementType" AS ENUM ('PURCHASE', 'ADD', 'CONSUMPTION', 'ADJUSTMENT', 'LOSS', 'RETURN');

-- CreateEnum
CREATE TYPE "public"."NotificationPriority" AS ENUM ('INFO', 'WARNING', 'IMPORTANT', 'CRITICAL');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('FINANCE', 'TASKS', 'GUESTS', 'INVENTORY', 'EVENT');

-- CreateEnum
CREATE TYPE "public"."PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'ATM', 'CARD', 'MOBILE_PAYMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."RsvpStatus" AS ENUM ('PENDING', 'CONFIRMED', 'MAYBE', 'DECLINED');

-- CreateEnum
CREATE TYPE "public"."ScheduleStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."TaskCategory" AS ENUM ('FINANCE', 'VENUE', 'GUESTS', 'FOOD', 'DRINKS', 'DECORATION', 'CEREMONY', 'DOCUMENTS', 'CLOTHING', 'TRANSPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "public"."TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."VendorCategory" AS ENUM ('VENUE', 'DECORATION', 'MUSIC', 'PHOTOGRAPHY', 'VIDEO', 'CATERING', 'CAKE', 'DRINKS', 'TRANSPORT', 'BEAUTY', 'SECURITY', 'ENTERTAINMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."VendorStatus" AS ENUM ('PROSPECT', 'CONTACTED', 'NEGOTIATING', 'CONTRACTED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "public"."account" (
    "id" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."audit_log" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "oldData" JSONB,
    "newData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."budget" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "plannedAmount" DECIMAL(65,30) NOT NULL,
    "reserveAmount" DECIMAL(65,30) DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."budget_category" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "plannedAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."document" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."DocumentType" NOT NULL,
    "reference" TEXT,
    "vendorId" TEXT,
    "expenseId" TEXT,
    "paymentId" TEXT,
    "status" "public"."DocumentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."event" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."EventType" NOT NULL,
    "status" "public"."EventStatus" NOT NULL DEFAULT 'DRAFT',
    "eventDate" TIMESTAMP(3),
    "startTime" TEXT,
    "endTime" TEXT,
    "venueName" TEXT,
    "address" TEXT,
    "province" TEXT,
    "municipality" TEXT,
    "neighborhood" TEXT,
    "reference" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "capacity" INTEGER,
    "limitGuestCapacity" BOOLEAN NOT NULL DEFAULT false,
    "currency" TEXT NOT NULL DEFAULT 'AOA',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."event_invitation" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "invitedBy" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role" "public"."MemberRole" NOT NULL,
    "token" TEXT NOT NULL,
    "status" "public"."InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."event_member" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "public"."MemberRole" NOT NULL,
    "status" "public"."MemberStatus" NOT NULL DEFAULT 'PENDING',
    "joinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."expense" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "budgetCategoryId" TEXT,
    "vendorId" TEXT,
    "description" TEXT NOT NULL,
    "type" "public"."ExpenseType" NOT NULL DEFAULT 'EXPENSE',
    "totalAmount" DECIMAL(65,30) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "status" "public"."ExpenseStatus" NOT NULL DEFAULT 'PLANNED',
    "paidPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."guest" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "group" TEXT,
    "type" "public"."GuestType" NOT NULL,
    "status" "public"."GuestStatus" NOT NULL DEFAULT 'PENDING',
    "companionsLimit" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."guest_companion" (
    "id" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "public"."CompanionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guest_companion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."guest_invitation" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "url" TEXT,
    "status" "public"."GuestInvitationStatus" NOT NULL DEFAULT 'CREATED',
    "sentAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "response" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "qrCode" TEXT,
    "rsvpStatus" "public"."RsvpStatus" NOT NULL DEFAULT 'PENDING',
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "guest_invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."inventory_item" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "public"."InventoryCategory" NOT NULL,
    "plannedQuantity" DECIMAL(65,30) NOT NULL,
    "currentQuantity" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "unit" "public"."InventoryUnit" NOT NULL,
    "unitPrice" DECIMAL(65,30),
    "vendorId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."inventory_movement" (
    "id" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "type" "public"."MovementType" NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "reason" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."invitation_guest" (
    "id" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitation_guest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT,
    "type" "public"."NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "priority" "public"."NotificationPriority" NOT NULL DEFAULT 'INFO',
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payment" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "method" "public"."PaymentMethod" NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."schedule" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "location" TEXT,
    "responsible" TEXT,
    "status" "public"."ScheduleStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."table" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "number" INTEGER,
    "capacity" INTEGER NOT NULL,
    "location" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "table_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."table_guest" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "table_guest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."task" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "public"."TaskCategory" NOT NULL,
    "priority" "public"."TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "public"."TaskStatus" NOT NULL DEFAULT 'TODO',
    "assignedTo" TEXT,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "phone" TEXT,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."vendor" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "public"."VendorCategory" NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "status" "public"."VendorStatus" NOT NULL DEFAULT 'PROSPECT',
    "description" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."vendor_contract" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "number" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "amount" DECIMAL(65,30),
    "status" "public"."ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "documentId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "account_issuer_accountId_uidx" ON "public"."account"("issuer" ASC, "accountId" ASC);

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "public"."account"("userId" ASC);

-- CreateIndex
CREATE INDEX "audit_log_eventId_idx" ON "public"."audit_log"("eventId" ASC);

-- CreateIndex
CREATE INDEX "audit_log_userId_idx" ON "public"."audit_log"("userId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "budget_eventId_key" ON "public"."budget"("eventId" ASC);

-- CreateIndex
CREATE INDEX "budget_category_eventId_idx" ON "public"."budget_category"("eventId" ASC);

-- CreateIndex
CREATE INDEX "document_createdBy_idx" ON "public"."document"("createdBy" ASC);

-- CreateIndex
CREATE INDEX "document_eventId_idx" ON "public"."document"("eventId" ASC);

-- CreateIndex
CREATE INDEX "document_expenseId_idx" ON "public"."document"("expenseId" ASC);

-- CreateIndex
CREATE INDEX "document_paymentId_idx" ON "public"."document"("paymentId" ASC);

-- CreateIndex
CREATE INDEX "document_vendorId_idx" ON "public"."document"("vendorId" ASC);

-- CreateIndex
CREATE INDEX "event_ownerId_idx" ON "public"."event"("ownerId" ASC);

-- CreateIndex
CREATE INDEX "event_invitation_eventId_idx" ON "public"."event_invitation"("eventId" ASC);

-- CreateIndex
CREATE INDEX "event_invitation_invitedBy_idx" ON "public"."event_invitation"("invitedBy" ASC);

-- CreateIndex
CREATE INDEX "event_invitation_token_idx" ON "public"."event_invitation"("token" ASC);

-- CreateIndex
CREATE INDEX "event_member_eventId_idx" ON "public"."event_member"("eventId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "event_member_eventId_userId_key" ON "public"."event_member"("eventId" ASC, "userId" ASC);

-- CreateIndex
CREATE INDEX "event_member_userId_idx" ON "public"."event_member"("userId" ASC);

-- CreateIndex
CREATE INDEX "expense_budgetCategoryId_idx" ON "public"."expense"("budgetCategoryId" ASC);

-- CreateIndex
CREATE INDEX "expense_createdBy_idx" ON "public"."expense"("createdBy" ASC);

-- CreateIndex
CREATE INDEX "expense_eventId_idx" ON "public"."expense"("eventId" ASC);

-- CreateIndex
CREATE INDEX "expense_vendorId_idx" ON "public"."expense"("vendorId" ASC);

-- CreateIndex
CREATE INDEX "guest_eventId_idx" ON "public"."guest"("eventId" ASC);

-- CreateIndex
CREATE INDEX "guest_companion_guestId_idx" ON "public"."guest_companion"("guestId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "guest_invitation_code_key" ON "public"."guest_invitation"("code" ASC);

-- CreateIndex
CREATE INDEX "guest_invitation_eventId_idx" ON "public"."guest_invitation"("eventId" ASC);

-- CreateIndex
CREATE INDEX "inventory_item_eventId_idx" ON "public"."inventory_item"("eventId" ASC);

-- CreateIndex
CREATE INDEX "inventory_item_vendorId_idx" ON "public"."inventory_item"("vendorId" ASC);

-- CreateIndex
CREATE INDEX "inventory_movement_createdBy_idx" ON "public"."inventory_movement"("createdBy" ASC);

-- CreateIndex
CREATE INDEX "inventory_movement_inventoryItemId_idx" ON "public"."inventory_movement"("inventoryItemId" ASC);

-- CreateIndex
CREATE INDEX "invitation_guest_guestId_idx" ON "public"."invitation_guest"("guestId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "invitation_guest_invitationId_guestId_key" ON "public"."invitation_guest"("invitationId" ASC, "guestId" ASC);

-- CreateIndex
CREATE INDEX "invitation_guest_invitationId_idx" ON "public"."invitation_guest"("invitationId" ASC);

-- CreateIndex
CREATE INDEX "notification_eventId_idx" ON "public"."notification"("eventId" ASC);

-- CreateIndex
CREATE INDEX "notification_userId_idx" ON "public"."notification"("userId" ASC);

-- CreateIndex
CREATE INDEX "payment_createdBy_idx" ON "public"."payment"("createdBy" ASC);

-- CreateIndex
CREATE INDEX "payment_expenseId_idx" ON "public"."payment"("expenseId" ASC);

-- CreateIndex
CREATE INDEX "schedule_eventId_idx" ON "public"."schedule"("eventId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "public"."session"("token" ASC);

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "public"."session"("userId" ASC);

-- CreateIndex
CREATE INDEX "table_eventId_idx" ON "public"."table"("eventId" ASC);

-- CreateIndex
CREATE INDEX "table_guest_guestId_idx" ON "public"."table_guest"("guestId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "table_guest_tableId_guestId_key" ON "public"."table_guest"("tableId" ASC, "guestId" ASC);

-- CreateIndex
CREATE INDEX "table_guest_tableId_idx" ON "public"."table_guest"("tableId" ASC);

-- CreateIndex
CREATE INDEX "task_assignedTo_idx" ON "public"."task"("assignedTo" ASC);

-- CreateIndex
CREATE INDEX "task_createdBy_idx" ON "public"."task"("createdBy" ASC);

-- CreateIndex
CREATE INDEX "task_eventId_idx" ON "public"."task"("eventId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "public"."user"("email" ASC);

-- CreateIndex
CREATE INDEX "vendor_eventId_idx" ON "public"."vendor"("eventId" ASC);

-- CreateIndex
CREATE INDEX "vendor_contract_eventId_idx" ON "public"."vendor_contract"("eventId" ASC);

-- CreateIndex
CREATE INDEX "vendor_contract_vendorId_idx" ON "public"."vendor_contract"("vendorId" ASC);

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "public"."verification"("identifier" ASC);

-- AddForeignKey
ALTER TABLE "public"."account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_log" ADD CONSTRAINT "audit_log_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_log" ADD CONSTRAINT "audit_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."budget" ADD CONSTRAINT "budget_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."budget_category" ADD CONSTRAINT "budget_category_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."document" ADD CONSTRAINT "document_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."document" ADD CONSTRAINT "document_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."document" ADD CONSTRAINT "document_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "public"."expense"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."document" ADD CONSTRAINT "document_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "public"."payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."document" ADD CONSTRAINT "document_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "public"."vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."event" ADD CONSTRAINT "event_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."event_invitation" ADD CONSTRAINT "event_invitation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."event_invitation" ADD CONSTRAINT "event_invitation_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "public"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."event_member" ADD CONSTRAINT "event_member_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."event_member" ADD CONSTRAINT "event_member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expense" ADD CONSTRAINT "expense_budgetCategoryId_fkey" FOREIGN KEY ("budgetCategoryId") REFERENCES "public"."budget_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expense" ADD CONSTRAINT "expense_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expense" ADD CONSTRAINT "expense_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expense" ADD CONSTRAINT "expense_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "public"."vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."guest" ADD CONSTRAINT "guest_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."guest_companion" ADD CONSTRAINT "guest_companion_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "public"."guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."guest_invitation" ADD CONSTRAINT "guest_invitation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inventory_item" ADD CONSTRAINT "inventory_item_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inventory_item" ADD CONSTRAINT "inventory_item_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "public"."vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inventory_movement" ADD CONSTRAINT "inventory_movement_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inventory_movement" ADD CONSTRAINT "inventory_movement_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "public"."inventory_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invitation_guest" ADD CONSTRAINT "invitation_guest_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "public"."guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invitation_guest" ADD CONSTRAINT "invitation_guest_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "public"."guest_invitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notification" ADD CONSTRAINT "notification_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notification" ADD CONSTRAINT "notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payment" ADD CONSTRAINT "payment_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payment" ADD CONSTRAINT "payment_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "public"."expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."schedule" ADD CONSTRAINT "schedule_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."table" ADD CONSTRAINT "table_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."table_guest" ADD CONSTRAINT "table_guest_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "public"."guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."table_guest" ADD CONSTRAINT "table_guest_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "public"."table"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task" ADD CONSTRAINT "task_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "public"."user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task" ADD CONSTRAINT "task_completedBy_fkey" FOREIGN KEY ("completedBy") REFERENCES "public"."user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task" ADD CONSTRAINT "task_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task" ADD CONSTRAINT "task_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vendor" ADD CONSTRAINT "vendor_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vendor_contract" ADD CONSTRAINT "vendor_contract_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vendor_contract" ADD CONSTRAINT "vendor_contract_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "public"."vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
