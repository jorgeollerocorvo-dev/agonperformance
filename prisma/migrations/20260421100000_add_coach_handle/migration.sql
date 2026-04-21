-- AlterTable
ALTER TABLE "CoachProfile" ADD COLUMN "handle" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CoachProfile_handle_key" ON "CoachProfile"("handle");
