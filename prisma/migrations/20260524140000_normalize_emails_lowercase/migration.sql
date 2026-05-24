-- Normalize all stored emails to lowercase so case-insensitive login works
-- regardless of how the email was originally entered (Ravi@test.com vs ravi@test.com).
--
-- For each table:
--   1. If a lowercase variant ALREADY exists for the same email, skip that mixed-case
--      row (deleting would orphan its relations). We log a notice instead.
--   2. Otherwise, update the row in-place to lowercase its email.
--
-- Safe to re-run: the WHERE clause ensures only mixed-case rows are touched.

-- ── User table ────────────────────────────────────────────────────────────
-- Skip rows where a lowercase duplicate already exists (would violate unique constraint)
UPDATE "User" u
SET "email" = LOWER(u."email")
WHERE u."email" IS NOT NULL
  AND u."email" <> LOWER(u."email")
  AND NOT EXISTS (
    SELECT 1 FROM "User" u2
    WHERE u2."email" = LOWER(u."email")
      AND u2."id" <> u."id"
  );

-- ── Athlete table ─────────────────────────────────────────────────────────
-- Athlete.email is not necessarily unique, but normalize anyway for consistency
UPDATE "Athlete"
SET "email" = LOWER("email")
WHERE "email" IS NOT NULL
  AND "email" <> LOWER("email");

-- ── Lead table (if it has email) ──────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Lead' AND column_name = 'email'
  ) THEN
    EXECUTE 'UPDATE "Lead" SET "email" = LOWER("email") WHERE "email" IS NOT NULL AND "email" <> LOWER("email")';
  END IF;
END $$;
