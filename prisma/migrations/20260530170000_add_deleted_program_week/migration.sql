-- Soft-delete trash table for ProgramWeek. When a coach deletes a week, we
-- snapshot its tree to JSON here so they can restore it from "Recently deleted".

CREATE TABLE "DeletedProgramWeek" (
  "id"         TEXT NOT NULL,
  "programId"  TEXT NOT NULL,
  "weekNumber" INTEGER NOT NULL,
  "weekLabel"  TEXT,
  "snapshot"   JSONB NOT NULL,
  "deletedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedBy"  TEXT,

  CONSTRAINT "DeletedProgramWeek_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DeletedProgramWeek_programId_deletedAt_idx"
  ON "DeletedProgramWeek" ("programId", "deletedAt");

ALTER TABLE "DeletedProgramWeek"
  ADD CONSTRAINT "DeletedProgramWeek_programId_fkey"
  FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;
