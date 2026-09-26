-- CreateEnum
CREATE TYPE "DedicationType" AS ENUM ('WEDDING_VOW', 'ENGAGEMENT_VOW', 'DEDICATION');

-- CreateEnum
CREATE TYPE "DedicationStatus" AS ENUM ('NOT_STARTED', 'DRAFT', 'IN_PROGRESS', 'READY');

-- CreateTable
CREATE TABLE "dedication" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "DedicationType" NOT NULL,
    "status" "DedicationStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "content" JSONB NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT true,
    "lastOpenedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dedication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dedication_viewer" (
    "id" TEXT NOT NULL,
    "dedicationId" TEXT NOT NULL,
    "eventMemberId" TEXT NOT NULL,
    "lastOpenedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dedication_viewer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dedication_eventId_idx" ON "dedication"("eventId");

-- CreateIndex
CREATE INDEX "dedication_ownerId_idx" ON "dedication"("ownerId");

-- CreateIndex
CREATE INDEX "dedication_viewer_dedicationId_idx" ON "dedication_viewer"("dedicationId");

-- CreateIndex
CREATE INDEX "dedication_viewer_eventMemberId_idx" ON "dedication_viewer"("eventMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "dedication_viewer_dedicationId_eventMemberId_key" ON "dedication_viewer"("dedicationId", "eventMemberId");

-- AddForeignKey
ALTER TABLE "dedication" ADD CONSTRAINT "dedication_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dedication" ADD CONSTRAINT "dedication_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dedication_viewer" ADD CONSTRAINT "dedication_viewer_dedicationId_fkey" FOREIGN KEY ("dedicationId") REFERENCES "dedication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dedication_viewer" ADD CONSTRAINT "dedication_viewer_eventMemberId_fkey" FOREIGN KEY ("eventMemberId") REFERENCES "event_member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
