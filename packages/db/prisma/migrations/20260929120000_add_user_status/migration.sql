-- Account lifecycle state. BLOCKED accounts cannot authenticate and have all
-- their sessions revoked; the API enforces this (see packages/auth + users router).
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'BLOCKED');

ALTER TABLE "user"
ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "blockedAt" TIMESTAMP(3),
ADD COLUMN "blockedReason" TEXT;

CREATE INDEX "user_status_idx" ON "user"("status");
