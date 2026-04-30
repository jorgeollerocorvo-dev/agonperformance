-- Add intensity feedback fields to SessionLog
ALTER TABLE "SessionLog" ADD COLUMN "intensityFeedback" INTEGER,
ADD COLUMN "intensityReview" TEXT,
ADD COLUMN "mediaData" JSONB;

-- Add comment documenting the fields
COMMENT ON COLUMN "SessionLog"."intensityFeedback" IS '1-5 scale workout intensity rating from athlete (1=easy, 5=hardest)';
COMMENT ON COLUMN "SessionLog"."intensityReview" IS 'athlete''s text feedback about workout intensity';
COMMENT ON COLUMN "SessionLog"."mediaData" IS 'future: { fileIds: [...], uploadedAt: ... } for photos/videos';
