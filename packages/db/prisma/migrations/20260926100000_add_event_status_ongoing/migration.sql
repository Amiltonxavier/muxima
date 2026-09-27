-- Alter the EventStatus enum to add the ONGOING value.
-- The value is appended at the end of the enum because Postgres can only
-- append values without rewriting the type.
ALTER TYPE "EventStatus" ADD VALUE 'ONGOING';

-- Migrate events that already started (persisted CONFIRMED rows whose
-- eventDate+startTime are in the past and endTime is in the future) so the
-- data is consistent right after deploy.
UPDATE "event"
SET "status" = 'ONGOING'
WHERE "status" = 'CONFIRMED'
  AND "eventDate" IS NOT NULL
  AND ("eventDate" + ("startTime" || ' hours')::interval) <= NOW()
  AND (
    "endTime" IS NULL
    OR ("eventDate" + ("endTime" || ' hours')::interval) > NOW()
  );
