-- CreateTable
CREATE TABLE "ProgramDocument" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "filename" TEXT,
    "mimeType" TEXT,
    "rawText" TEXT NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProgramDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProgramDocument_programId_createdAt_idx" ON "ProgramDocument"("programId", "createdAt");

-- AddForeignKey
ALTER TABLE "ProgramDocument" ADD CONSTRAINT "ProgramDocument_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;
