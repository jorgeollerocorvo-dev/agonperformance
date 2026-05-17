-- Final fix for athlete coach association - simple and reliable approach

-- Delete athletes with NULL coachProfileId (they're invalid)
DELETE FROM "Athlete" WHERE "athleteKey" IN ('ravi', 'wasmiya') AND "coachProfileId" IS NULL;

-- Delete athletes with wrong coachProfileId
DELETE FROM "Athlete"
WHERE "athleteKey" IN ('ravi', 'wasmiya')
AND "coachProfileId" NOT IN (
  SELECT cp."id"
  FROM "CoachProfile" cp
  INNER JOIN "User" u ON cp."userId" = u."id"
  WHERE u."email" = 'jorge@agonperformance.com'
);

-- Now insert Ravi with proper coach association
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
FROM "CoachProfile" cp
INNER JOIN "User" u ON cp."userId" = u."id"
WHERE u."email" = 'jorge@agonperformance.com'
AND NOT EXISTS (SELECT 1 FROM "Athlete" WHERE "athleteKey" = 'ravi');

-- Now insert Wasmiya with proper coach association
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
FROM "CoachProfile" cp
INNER JOIN "User" u ON cp."userId" = u."id"
WHERE u."email" = 'jorge@agonperformance.com'
AND NOT EXISTS (SELECT 1 FROM "Athlete" WHERE "athleteKey" = 'wasmiya');
