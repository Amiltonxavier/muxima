-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'MULTICAIXA_EXPRESS';

-- AlterTable
ALTER TABLE "supplier" ADD COLUMN     "hasMcxExpress" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "iban" TEXT,
ADD COLUMN     "mcxPhone" TEXT,
ADD COLUMN     "nif" TEXT;
