-- Backfill `status` for rows that existed before the column was introduced.
-- Mirrors InventoryService.computeStatus (backend is the authority):
--   planned > 0 AND current >= planned -> COMPLETED
--   current <= 0                      -> PENDING
--   otherwise                         -> IN_PROGRESS
UPDATE "inventory_item"
SET "status" = (CASE
  WHEN "plannedQuantity" > 0 AND "currentQuantity" >= "plannedQuantity" THEN 'COMPLETED'
  WHEN "currentQuantity" <= 0 THEN 'PENDING'
  ELSE 'IN_PROGRESS'
END)::"InventoryStatus";
