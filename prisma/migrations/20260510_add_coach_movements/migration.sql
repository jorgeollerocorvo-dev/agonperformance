-- CreateTable "CoachMovement"
CREATE TABLE "CoachMovement" (
    "id" TEXT NOT NULL,
    "coachProfileId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameEs" TEXT,
    "nameAr" TEXT,
    "videoUrl" TEXT,
    "demoUrl" TEXT,
    "category" TEXT,
    "attributes" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CoachMovement_coachProfileId_code_key" ON "CoachMovement"("coachProfileId", "code");

-- CreateIndex
CREATE INDEX "CoachMovement_coachProfileId_idx" ON "CoachMovement"("coachProfileId");

-- CreateIndex
CREATE INDEX "CoachMovement_category_idx" ON "CoachMovement"("category");

-- AddForeignKey
ALTER TABLE "CoachMovement" ADD CONSTRAINT "CoachMovement_coachProfileId_fkey" FOREIGN KEY ("coachProfileId") REFERENCES "CoachProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
