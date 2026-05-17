-- Fix Ravi and Wasmiya athletes - ensure they're linked to Jorge's coach profile

-- First, fix any existing Ravi athlete by linking to Jorge's coach
-- This handles both NULL and wrong coach associations
UPDATE "Athlete"
SET
  "coachProfileId" = (
    SELECT "CoachProfile"."id"
    FROM "CoachProfile"
    INNER JOIN "User" ON "User"."id" = "CoachProfile"."userId"
    WHERE "User"."email" = 'jorge@agonperformance.com'
    LIMIT 1
  ),
  "fullName" = 'Ravi',
  "sex" = 'M',
  "age" = 57,
  "division" = 'Masters 55-59',
  "updatedAt" = NOW()
WHERE "athleteKey" = 'ravi';

-- Second, fix any existing Wasmiya athlete by linking to Jorge's coach
UPDATE "Athlete"
SET
  "coachProfileId" = (
    SELECT "CoachProfile"."id"
    FROM "CoachProfile"
    INNER JOIN "User" ON "User"."id" = "CoachProfile"."userId"
    WHERE "User"."email" = 'jorge@agonperformance.com'
    LIMIT 1
  ),
  "fullName" = 'Wasmiya',
  "sex" = 'F',
  "updatedAt" = NOW()
WHERE "athleteKey" = 'wasmiya';

-- Third, create Ravi if doesn't exist
INSERT INTO "Athlete" ("id", "athleteKey", "coachProfileId", "fullName", "sex", "age", "division", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  'ravi',
  cp."id",
  'Ravi',
  'M',
  57,
  'Masters 55-59',
  NOW(),
  NOW()
FROM (
  SELECT "CoachProfile"."id"
  FROM "CoachProfile"
  INNER JOIN "User" ON "User"."id" = "CoachProfile"."userId"
  WHERE "User"."email" = 'jorge@agonperformance.com'
) AS cp
WHERE NOT EXISTS (
  SELECT 1 FROM "Athlete" WHERE "athleteKey" = 'ravi'
);

-- Fourth, create Wasmiya if doesn't exist
INSERT INTO "Athlete" ("id", "athleteKey", "coachProfileId", "fullName", "sex", "age", "division", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  'wasmiya',
  cp."id",
  'Wasmiya',
  'F',
  NULL,
  NULL,
  NOW(),
  NOW()
FROM (
  SELECT "CoachProfile"."id"
  FROM "CoachProfile"
  INNER JOIN "User" ON "User"."id" = "CoachProfile"."userId"
  WHERE "User"."email" = 'jorge@agonperformance.com'
) AS cp
WHERE NOT EXISTS (
  SELECT 1 FROM "Athlete" WHERE "athleteKey" = 'wasmiya'
);
