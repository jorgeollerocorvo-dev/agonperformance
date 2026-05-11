-- AlterTable
ALTER TABLE "Inquiry" ADD COLUMN "contactName" TEXT;
ALTER TABLE "Inquiry" ADD COLUMN "contactInstagram" TEXT;
ALTER TABLE "Inquiry" ADD COLUMN "marketingConsent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Inquiry" ADD COLUMN "source" TEXT;
ALTER TABLE "Inquiry" ADD COLUMN "gender" TEXT;
ALTER TABLE "Inquiry" ADD COLUMN "budget" TEXT;
CREATE INDEX "Inquiry_createdAt_idx" ON "Inquiry"("createdAt");
