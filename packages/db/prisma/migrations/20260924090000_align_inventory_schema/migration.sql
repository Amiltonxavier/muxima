-- CreateEnum
CREATE TYPE "InventoryStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- AlterTable
ALTER TABLE "expense" ADD COLUMN     "inventoryItemId" TEXT;

-- AlterTable
ALTER TABLE "inventory_item" ADD COLUMN     "status" "InventoryStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "venueQuantity" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "inventory_movement" ADD COLUMN     "totalCost" DECIMAL(65,30),
ADD COLUMN     "unitPrice" DECIMAL(65,30);

-- AddForeignKey
ALTER TABLE "expense" ADD CONSTRAINT "expense_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
