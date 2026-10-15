-- AlterTable
-- `pendingKey` is set only while an invitation is PENDING (eventId:email), so
-- the unique index below makes duplicate pending invites impossible at the
-- database level. It is cleared on accept/reject/revoke, which is what allows a
-- legitimate re-invitation. `respondedBy` records who actually answered.
ALTER TABLE "event_invitation" ADD COLUMN     "pendingKey" TEXT,
ADD COLUMN     "respondedBy" TEXT;

-- AlterTable
-- Structured payload for actionable notifications (invitations, etc.).
ALTER TABLE "notification" ADD COLUMN     "data" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "event_invitation_pendingKey_key" ON "event_invitation"("pendingKey");

-- CreateIndex
CREATE INDEX "event_invitation_email_status_idx" ON "event_invitation"("email", "status");
