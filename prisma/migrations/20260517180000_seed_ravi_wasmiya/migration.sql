-- Fix Ravi and Wasmiya athletes - ensure they're linked to Jorge's coach profile

-- First, fix any existing Ravi athlete by linking to Jorge's coach
UPDATE "Athlete"
SET "coachProfileId" = (
  SELECT "CoachProfile"."id"
  FROM "CoachProfile"
  INNER JOIN "User" ON "User"."id" = "CoachProfile"."userId"
  WHERE "User"."email" = 'jorge@agonperformance.com'
)
WHERE "athleteKey" = 'ravi'
AND "coachProfileId" != (
  SELECT "CoachProfile"."id"
  FROM "CoachProfile"
  INNER JOIN "User" ON "User"."id" = "CoachProfile"."userId"
  WHERE "User"."email" = 'jorge@agonperformance.com'
);

-- Second, fix any existing Wasmiya athlete by linking to Jorge's coach
UPDATE "Athlete"
SET "coachProfileId" = (
  SELECT "CoachProfile"."id"
  FROM "CoachProfile"
  INNER JOIN "User" ON "User"."id" = "CoachProfile"."userId"
  WHERE "User"."email" = 'jorge@agonperformance.com'
)
WHERE "athleteKey" = 'wasmiya'
AND "coachProfileId" != (
  SELECT "CoachProfile"."id"
  FROM "CoachProfile"
  INNER JOIN "User" ON "User"."id" = "CoachProfile"."userId"
  WHERE "User"."email" = 'jorge@agonperformance.com'
);

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
