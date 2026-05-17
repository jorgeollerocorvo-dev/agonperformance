-- Ensure Ravi and Wasmiya athletes exist with proper coach association

-- Get Jorge's coach profile ID or use placeholder (will fail if it doesn't exist, which is expected)
DO $$
DECLARE
  jorge_coach_id TEXT;
BEGIN
  SELECT "CoachProfile"."id" INTO jorge_coach_id
  FROM "CoachProfile"
  INNER JOIN "User" ON "User"."id" = "CoachProfile"."userId"
  WHERE "User"."email" = 'jorge@agonperformance.com'
  LIMIT 1;

  -- If Jorge's profile doesn't exist, this migration will fail
  -- That's expected - the demo coach must be seeded first
  IF jorge_coach_id IS NULL THEN
    RAISE EXCEPTION 'Jorge coach profile not found. Run seed/import.ts first.';
  END IF;

  -- Upsert Ravi athlete
  INSERT INTO "Athlete" ("id", "athleteKey", "coachProfileId", "fullName", "sex", "age", "division", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid()::text,
    'ravi',
    jorge_coach_id,
    'Ravi',
    'M',
    57,
    'Masters 55-59',
    NOW(),
    NOW()
  )
  ON CONFLICT ("athleteKey") DO UPDATE
  SET "coachProfileId" = jorge_coach_id,
      "fullName" = 'Ravi',
      "sex" = 'M',
      "age" = 57,
      "division" = 'Masters 55-59',
      "updatedAt" = NOW();

  -- Upsert Wasmiya athlete
  INSERT INTO "Athlete" ("id", "athleteKey", "coachProfileId", "fullName", "sex", "age", "division", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid()::text,
    'wasmiya',
    jorge_coach_id,
    'Wasmiya',
    'F',
    NULL,
    NULL,
    NOW(),
    NOW()
  )
  ON CONFLICT ("athleteKey") DO UPDATE
  SET "coachProfileId" = jorge_coach_id,
      "fullName" = 'Wasmiya',
      "sex" = 'F',
      "updatedAt" = NOW();
END $$;
