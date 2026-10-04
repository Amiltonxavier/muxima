-- Maximum number of PEOPLE (guests + companions) a single invitation may hold.
-- The default of 2 is applied by the database so every new event starts with
-- the same value even if a client forgets to send it.
ALTER TABLE "event"
ADD COLUMN "maxGuestsPerInvitation" INTEGER NOT NULL DEFAULT 2;
