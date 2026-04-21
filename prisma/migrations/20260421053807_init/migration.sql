-- CreateEnum
CREATE TYPE "Role" AS ENUM ('COACH', 'ATHLETE');

-- CreateEnum
CREATE TYPE "Specialty" AS ENUM ('CROSSFIT', 'WOMEN', 'BODYBUILDING', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'es',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coach" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Coach_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Athlete" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "specialty" "Specialty" NOT NULL DEFAULT 'OTHER',
    "goals" TEXT,

    CONSTRAINT "Athlete_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseLibrary" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "youtubeUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExerciseLibrary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Program" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "specialty" "Specialty" NOT NULL DEFAULT 'OTHER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Program_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workout" (
    "id" TEXT NOT NULL,
    "programId" TEXT,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "dayIndex" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Workout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Section" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "protocol" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "reps" TEXT,
    "sets" TEXT,
    "load" TEXT,
    "rest" TEXT,
    "tempo" TEXT,
    "youtubeUrl" TEXT,
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutLog" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rating" INTEGER,
    "notes" TEXT,

    CONSTRAINT "WorkoutLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseLog" (
    "id" TEXT NOT NULL,
    "workoutLogId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "setsDone" INTEGER,
    "repsDone" TEXT,
    "loadUsed" TEXT,
    "notes" TEXT,

    CONSTRAINT "ExerciseLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Coach_userId_key" ON "Coach"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Athlete_userId_key" ON "Athlete"("userId");

-- CreateIndex
CREATE INDEX "ExerciseLibrary_coachId_name_idx" ON "ExerciseLibrary"("coachId", "name");

-- CreateIndex
CREATE INDEX "Assignment_athleteId_date_idx" ON "Assignment"("athleteId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Assignment_athleteId_workoutId_date_key" ON "Assignment"("athleteId", "workoutId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutLog_assignmentId_key" ON "WorkoutLog"("assignmentId");

-- AddForeignKey
ALTER TABLE "Coach" ADD CONSTRAINT "Coach_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Athlete" ADD CONSTRAINT "Athlete_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Athlete" ADD CONSTRAINT "Athlete_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseLibrary" ADD CONSTRAINT "ExerciseLibrary_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Program" ADD CONSTRAINT "Program_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workout" ADD CONSTRAINT "Workout_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutLog" ADD CONSTRAINT "WorkoutLog_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutLog" ADD CONSTRAINT "WorkoutLog_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseLog" ADD CONSTRAINT "ExerciseLog_workoutLogId_fkey" FOREIGN KEY ("workoutLogId") REFERENCES "WorkoutLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseLog" ADD CONSTRAINT "ExerciseLog_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
