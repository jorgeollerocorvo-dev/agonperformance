-- Co-joint training: two athletes' sessions can share a coJointKey so we can
-- render a chain badge and keep them in sync.

ALTER TABLE "ProgramSession" ADD COLUMN "coJointKey" TEXT;

CREATE INDEX "ProgramSession_coJointKey_idx" ON "ProgramSession" ("coJointKey");
