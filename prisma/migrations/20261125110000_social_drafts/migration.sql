CREATE TABLE "SocialDraft" (
  "id" TEXT NOT NULL,
  "slot" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'GENERATING',
  "productId" TEXT,
  "productName" TEXT,
  "imageUrl" TEXT,
  "caption" TEXT,
  "hook" TEXT,
  "storyboard" JSONB,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SocialDraft_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SocialDraft_slot_key" ON "SocialDraft"("slot");
CREATE INDEX "SocialDraft_createdAt_idx" ON "SocialDraft"("createdAt");
