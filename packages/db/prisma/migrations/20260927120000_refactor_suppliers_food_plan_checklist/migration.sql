-- =============================================================================
-- Domain refactor: Vendors -> Suppliers, Budget as derived aggregate,
-- Food Plan, Checklist.
--
-- DATA PRESERVATION NOTES
-- -----------------------
-- 1. vendor            -> supplier            (233 rows, ids preserved)
--    - status CONTRACTED -> CONFIRMED
--    - category PHOTOGRAPHY -> PHOTOGRAPHER, VIDEO -> VIDEOGRAPHER,
--      DRINKS -> CATERING (closest business equivalent)
--    - price/nextDueDate/paymentStatus have no upstream source and stay NULL/PENDING
-- 2. document          -> document.supplierId (70 rows)
-- 3. inventory_item FOOD -> food_plan_item     (94 rows, one food_plan per event)
--    inventory_item CAKE/DECORATION -> MATERIAL (money already carried by unitPrice)
-- 4. inventory_item keeps unitPrice -> becomes the canonical Budget source.
--
-- DELIBERATE DATA LOSS
-- --------------------
-- expense (381), payment (230), budget_category (250), vendor_contract (85).
-- Every one of those 381 expenses has vendorId = NULL AND inventoryItemId = NULL,
-- and all 230 payments belong to those unattributed expenses, so none of them
-- can be mapped onto a supplier. They duplicated a manual ledger that is now
-- replaced by inventory_item.unitPrice (319/319 rows priced, 484 565 400 AOA
-- planned) plus supplier.price.
-- =============================================================================

-- Prereq of the previous commit, not yet present in every database.
ALTER TYPE "EventStatus" ADD VALUE IF NOT EXISTS 'ONGOING';

-- CreateEnum
CREATE TYPE "SupplierCategory" AS ENUM ('VENUE', 'CATERING', 'CAKE', 'SWEETS_AND_SAVOURIES', 'DECORATION', 'FLORIST', 'PHOTOGRAPHER', 'VIDEOGRAPHER', 'DJ', 'BAND', 'MUSIC', 'ENTERTAINMENT', 'TRANSPORT', 'BEAUTY', 'BRIDE_ATTIRE', 'GROOM_ATTIRE', 'RINGS', 'WEDDING_PLANNER', 'OFFICIANT', 'FAVOURS', 'ACCOMMODATION', 'SECURITY', 'OTHER');

-- CreateEnum
CREATE TYPE "SupplierStatus" AS ENUM ('PROSPECT', 'CONTACTED', 'NEGOTIATING', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SupplierPaymentStatus" AS ENUM ('PENDING', 'PAID', 'INSTALLMENTS', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SupplierPaymentModel" AS ENUM ('FULL', 'INSTALLMENTS', 'CUSTOM');

-- CreateEnum
CREATE TYPE "InstallmentStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FoodPlanCategory" AS ENUM ('STARTER', 'MAIN_COURSE', 'SIDE_DISH', 'DESSERT', 'FRUIT', 'OTHER');

-- CreateEnum
CREATE TYPE "FoodPlanUnit" AS ENUM ('UNIT', 'PLATE', 'BOWL', 'PORTION', 'GRAM', 'KILOGRAM', 'LITER', 'GLASS', 'BOTTLE', 'PACKAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "FoodPlanStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ChecklistStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "supplier" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "SupplierCategory" NOT NULL,
    "price" DECIMAL(65,30),
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "status" "SupplierStatus" NOT NULL DEFAULT 'PROSPECT',
    "paymentModel" "SupplierPaymentModel" NOT NULL DEFAULT 'FULL',
    "paymentStatus" "SupplierPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "nextDueDate" TIMESTAMP(3),
    "description" TEXT,
    "notes" TEXT,
    "categoryFields" JSONB,
    "customFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_payment" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_installment" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 1,
    "amount" DECIMAL(65,30) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "status" "InstallmentStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_installment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "food_plan" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "supplierId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "food_plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "food_plan_item" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "foodPlanId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "FoodPlanCategory" NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL DEFAULT 1,
    "unit" "FoodPlanUnit" NOT NULL DEFAULT 'PORTION',
    "description" TEXT,
    "notes" TEXT,
    "status" "FoodPlanStatus" NOT NULL DEFAULT 'PENDING',
    "customFields" JSONB,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "food_plan_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_item" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ChecklistStatus" NOT NULL DEFAULT 'PENDING',
    "position" INTEGER NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3),
    "supplierId" TEXT,
    "inventoryItemId" TEXT,
    "autoManaged" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checklist_item_pkey" PRIMARY KEY ("id")
);

-- AlterTable: the new target columns are added up front so the backfill below
-- can populate them; the legacy columns are dropped further down.
ALTER TABLE "document" ADD COLUMN     "supplierId" TEXT,
ADD COLUMN     "supplierInstallmentId" TEXT,
ADD COLUMN     "supplierPaymentId" TEXT;

-- Backfill: one food plan per event, before any item is moved.
INSERT INTO "food_plan" ("id", "eventId", "createdAt", "updatedAt")
SELECT
    'fpl_' || e."id",
    e."id",
    e."createdAt",
    e."updatedAt"
FROM "event" e;

-- Backfill supplier from vendor.
INSERT INTO "supplier" (
    "id", "eventId", "name", "category", "price", "phone", "email", "address",
    "status", "paymentModel", "paymentStatus", "nextDueDate", "description",
    "notes", "createdAt", "updatedAt"
)
SELECT
    v."id",
    v."eventId",
    v."name",
    (CASE v."category"
        WHEN 'PHOTOGRAPHY' THEN 'PHOTOGRAPHER'::"SupplierCategory"
        WHEN 'VIDEO'       THEN 'VIDEOGRAPHER'::"SupplierCategory"
        WHEN 'DRINKS'      THEN 'CATERING'::"SupplierCategory"
        ELSE v."category"::text::"SupplierCategory"
    END),
    -- No expense/vendor_contract amount can be attributed (see header), so the
    -- agreed price is unknown at this point and stays NULL until it is entered.
    NULL::DECIMAL(65,30),
    v."phone",
    v."email",
    v."address",
    (CASE v."status"
        WHEN 'CONTRACTED' THEN 'CONFIRMED'::"SupplierStatus"
        ELSE v."status"::text::"SupplierStatus"
    END),
    'FULL'::"SupplierPaymentModel",
    'PENDING'::"SupplierPaymentStatus",
    NULL::TIMESTAMP(3),
    v."description",
    v."notes",
    v."createdAt",
    v."updatedAt"
FROM "vendor" v;

-- Backfill document.vendorId -> document.supplierId (ids are preserved).
UPDATE "document" d
SET "supplierId" = d."vendorId"
WHERE d."vendorId" IS NOT NULL;

-- Backfill food_plan_item from inventory FOOD rows.
-- Category is inferred from the item name; unitPrice is intentionally dropped
-- because Food Plan carries no prices (catering money lives on the supplier).
INSERT INTO "food_plan_item" (
    "id", "eventId", "foodPlanId", "name", "category", "quantity", "unit",
    "description", "notes", "status", "customFields", "position",
    "createdAt", "updatedAt"
)
SELECT
    i."id",
    i."eventId",
    'fpl_' || i."eventId",
    i."name",
    (CASE
        WHEN i."name" ~* '(salada|folha|entrada|antecedent|canap|petisco|empada|folhad)' THEN 'STARTER'
        WHEN i."name" ~* '(arroz|calulu|frango|porco|carne|peixe|caldo|feijão|batata|assada|caril|guiso)' THEN 'MAIN_COURSE'
        WHEN i."name" ~* '(tempero|molho|acompanhamento|legume|legumes)' THEN 'SIDE_DISH'
        WHEN i."name" ~* '(sobremesa|doce|pudim|gelatina|mousse|torta)' THEN 'DESSERT'
        WHEN i."name" ~* '(fruta|banana|maçã|maca|laranja|manga|abacaxi|uva)' THEN 'FRUIT'
        ELSE 'OTHER'
    END)::"FoodPlanCategory",
    i."plannedQuantity",
    (CASE i."unit"
        WHEN 'BOX'     THEN 'PACKAGE'::"FoodPlanUnit"
        WHEN 'CASE'    THEN 'PACKAGE'::"FoodPlanUnit"
        WHEN 'KG'      THEN 'KILOGRAM'::"FoodPlanUnit"
        ELSE i."unit"::text::"FoodPlanUnit"
    END),
    NULL,
    i."notes",
    (CASE i."status"
        WHEN 'COMPLETED'   THEN 'COMPLETED'::"FoodPlanStatus"
        WHEN 'IN_PROGRESS' THEN 'IN_PROGRESS'::"FoodPlanStatus"
        ELSE 'PENDING'::"FoodPlanStatus"
    END),
    NULL,
    ROW_NUMBER() OVER (PARTITION BY i."eventId" ORDER BY i."createdAt")::INTEGER,
    i."createdAt",
    i."updatedAt"
FROM "inventory_item" i
WHERE i."category" = 'FOOD';

-- AlterEnum: FOOD/CAKE/DECORATION leave the inventory taxonomy and become
-- MATERIAL. The switch runs before the FOOD rows above are removed, so the
-- money they carried stays in unitPrice on the remaining rows.
BEGIN;
CREATE TYPE "InventoryCategory_new" AS ENUM ('DRINK', 'MATERIAL', 'EQUIPMENT', 'FURNITURE', 'LINEN', 'OTHER');
ALTER TABLE "inventory_item" ALTER COLUMN "category" DROP DEFAULT;
ALTER TABLE "inventory_item"
    ALTER COLUMN "category" TYPE "InventoryCategory_new"
    USING (CASE "category"
        WHEN 'FOOD'       THEN 'MATERIAL'::"InventoryCategory_new"
        WHEN 'CAKE'       THEN 'MATERIAL'::"InventoryCategory_new"
        WHEN 'DECORATION' THEN 'MATERIAL'::"InventoryCategory_new"
        ELSE "category"::text::"InventoryCategory_new"
    END);
ALTER TYPE "InventoryCategory" RENAME TO "InventoryCategory_old";
ALTER TYPE "InventoryCategory_new" RENAME TO "InventoryCategory";
DROP TYPE "public"."InventoryCategory_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "budget_category" DROP CONSTRAINT "budget_category_eventId_fkey";

-- DropForeignKey
ALTER TABLE "document" DROP CONSTRAINT "document_expenseId_fkey";

-- DropForeignKey
ALTER TABLE "document" DROP CONSTRAINT "document_paymentId_fkey";

-- DropForeignKey
ALTER TABLE "document" DROP CONSTRAINT "document_vendorId_fkey";

-- DropForeignKey
ALTER TABLE "expense" DROP CONSTRAINT "expense_budgetCategoryId_fkey";

-- DropForeignKey
ALTER TABLE "expense" DROP CONSTRAINT "expense_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "expense" DROP CONSTRAINT "expense_eventId_fkey";

-- DropForeignKey
ALTER TABLE "expense" DROP CONSTRAINT "expense_inventoryItemId_fkey";

-- DropForeignKey
ALTER TABLE "expense" DROP CONSTRAINT "expense_vendorId_fkey";

-- DropForeignKey
ALTER TABLE "inventory_item" DROP CONSTRAINT "inventory_item_vendorId_fkey";

-- DropForeignKey
ALTER TABLE "payment" DROP CONSTRAINT "payment_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "payment" DROP CONSTRAINT "payment_expenseId_fkey";

-- DropForeignKey
ALTER TABLE "vendor" DROP CONSTRAINT "vendor_eventId_fkey";

-- DropForeignKey
ALTER TABLE "vendor_contract" DROP CONSTRAINT "vendor_contract_eventId_fkey";

-- DropForeignKey
ALTER TABLE "vendor_contract" DROP CONSTRAINT "vendor_contract_vendorId_fkey";

-- DropIndex
DROP INDEX "document_expenseId_idx";

-- DropIndex
DROP INDEX "document_paymentId_idx";

-- DropIndex
DROP INDEX "document_vendorId_idx";

-- DropIndex
DROP INDEX "inventory_item_vendorId_idx";

-- AlterTable
ALTER TABLE "budget" ALTER COLUMN "plannedAmount" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "inventory_item" DROP COLUMN "venueQuantity",
DROP COLUMN "vendorId",
ADD COLUMN     "customFields" JSONB;

-- AlterTable
ALTER TABLE "document" DROP COLUMN "expenseId",
DROP COLUMN "paymentId",
DROP COLUMN "vendorId";

-- DropTable
DROP TABLE "budget_category";

-- DropTable
DROP TABLE "expense";

-- DropTable
DROP TABLE "payment";

-- DropTable
DROP TABLE "vendor";

-- DropTable
DROP TABLE "vendor_contract";

-- DropEnum
DROP TYPE "ContractStatus";

-- DropEnum
DROP TYPE "ExpenseStatus";

-- DropEnum
DROP TYPE "ExpenseType";

-- DropEnum
DROP TYPE "VendorCategory";

-- DropEnum
DROP TYPE "VendorStatus";

-- CreateIndex
CREATE INDEX "supplier_eventId_idx" ON "supplier"("eventId");

-- CreateIndex
CREATE INDEX "supplier_eventId_status_idx" ON "supplier"("eventId", "status");

-- CreateIndex
CREATE INDEX "supplier_eventId_category_idx" ON "supplier"("eventId", "category");

-- CreateIndex
CREATE INDEX "supplier_payment_supplierId_idx" ON "supplier_payment"("supplierId");

-- CreateIndex
CREATE INDEX "supplier_payment_createdBy_idx" ON "supplier_payment"("createdBy");

-- CreateIndex
CREATE INDEX "supplier_installment_supplierId_idx" ON "supplier_installment"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_installment_supplierId_position_key" ON "supplier_installment"("supplierId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "food_plan_eventId_key" ON "food_plan"("eventId");

-- CreateIndex
CREATE INDEX "food_plan_supplierId_idx" ON "food_plan"("supplierId");

-- CreateIndex
CREATE INDEX "food_plan_item_eventId_idx" ON "food_plan_item"("eventId");

-- CreateIndex
CREATE INDEX "food_plan_item_foodPlanId_idx" ON "food_plan_item"("foodPlanId");

-- CreateIndex
CREATE INDEX "checklist_item_eventId_idx" ON "checklist_item"("eventId");

-- CreateIndex
CREATE INDEX "checklist_item_supplierId_idx" ON "checklist_item"("supplierId");

-- CreateIndex
CREATE INDEX "checklist_item_inventoryItemId_idx" ON "checklist_item"("inventoryItemId");

-- CreateIndex
CREATE INDEX "document_supplierId_idx" ON "document"("supplierId");

-- CreateIndex
CREATE INDEX "document_supplierPaymentId_idx" ON "document"("supplierPaymentId");

-- CreateIndex
CREATE INDEX "document_supplierInstallmentId_idx" ON "document"("supplierInstallmentId");

-- CreateIndex
CREATE INDEX "inventory_item_eventId_category_idx" ON "inventory_item"("eventId", "category");

-- AddForeignKey
ALTER TABLE "supplier" ADD CONSTRAINT "supplier_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payment" ADD CONSTRAINT "supplier_payment_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payment" ADD CONSTRAINT "supplier_payment_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_installment" ADD CONSTRAINT "supplier_installment_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_plan" ADD CONSTRAINT "food_plan_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_plan" ADD CONSTRAINT "food_plan_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_plan_item" ADD CONSTRAINT "food_plan_item_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_plan_item" ADD CONSTRAINT "food_plan_item_foodPlanId_fkey" FOREIGN KEY ("foodPlanId") REFERENCES "food_plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_item" ADD CONSTRAINT "checklist_item_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_item" ADD CONSTRAINT "checklist_item_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_item" ADD CONSTRAINT "checklist_item_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_supplierPaymentId_fkey" FOREIGN KEY ("supplierPaymentId") REFERENCES "supplier_payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_supplierInstallmentId_fkey" FOREIGN KEY ("supplierInstallmentId") REFERENCES "supplier_installment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
