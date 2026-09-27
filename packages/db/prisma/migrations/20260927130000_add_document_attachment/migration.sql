-- Attachment support for receipts/contracts. The URL is where the file lives
-- (object storage); the API validates that only the accepted formats are used.
ALTER TABLE "document" ADD COLUMN "url" TEXT,
ADD COLUMN     "mimeType" TEXT;
