-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CLIENT', 'COACH', 'ADMIN');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "PreferredLanguage" AS ENUM ('EN', 'ES', 'AR');

-- CreateEnum
CREATE TYPE "SpecialtyCategory" AS ENUM ('TRAINING', 'WELLNESS', 'REHAB', 'NUTRITION', 'SPECIALTY');

-- CreateEnum
CREATE TYPE "ProviderType" AS ENUM ('PERSONAL_TRAINER', 'CROSSFIT_COACH', 'NUTRITIONIST', 'PHYSIOTHERAPIST', 'GYM', 'CLINIC');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "GenderPreference" AS ENUM ('MALE_ONLY', 'FEMALE_ONLY', 'ANY');

-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'PREMIUM', 'PRO');

-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('NEW', 'MATCHED', 'CONTACTED', 'CONVERTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SubscriptionInterval" AS ENUM ('FREE', 'MONTHLY', 'YEARLY');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT,
    "oauthProviders" JSONB,
    "preferredLanguage" "PreferredLanguage" NOT NULL DEFAULT 'ES',
    "countryCode" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Madrid',
    "fullName" TEXT,
    "displayName" TEXT,
    "gender" "Gender",
    "dob" DATE,
    "profilePhotoUrl" TEXT,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "isPhoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Specialty" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "labelEs" TEXT NOT NULL,
    "labelAr" TEXT,
    "category" "SpecialtyCategory" NOT NULL,
    "iconUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Specialty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "providerType" "ProviderType" NOT NULL DEFAULT 'PERSONAL_TRAINER',
    "listingStatus" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "verificationBadge" BOOLEAN NOT NULL DEFAULT false,
    "headline" TEXT,
    "bioEn" TEXT,
    "bioEs" TEXT,
    "bioAr" TEXT,
    "yearsExperience" INTEGER,
    "qualifications" JSONB,
    "languagesSpoken" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "servicesOffered" JSONB,
    "trainsOppositeGender" BOOLEAN NOT NULL DEFAULT true,
    "genderPreference" "GenderPreference" NOT NULL DEFAULT 'ANY',
    "equipmentAvailable" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "facilityFeatures" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "homeBaseLat" DECIMAL(10,8),
    "homeBaseLng" DECIMAL(11,8),
    "homeBaseAddress" TEXT,
    "homeBaseCity" TEXT,
    "serviceAreaCities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "serviceAreaRadiusKm" INTEGER,
    "willTravel" BOOLEAN NOT NULL DEFAULT false,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "pricePerSessionMin" DECIMAL(10,2),
    "pricePerSessionMax" DECIMAL(10,2),
    "pricePerMonthPackage" DECIMAL(10,2),
    "acceptsOnlinePayment" BOOLEAN NOT NULL DEFAULT false,
    "acceptsCash" BOOLEAN NOT NULL DEFAULT true,
    "acceptsBankTransfer" BOOLEAN NOT NULL DEFAULT false,
    "availableRamadanHours" BOOLEAN NOT NULL DEFAULT false,
    "typicalWeeklyHours" JSONB,
    "profilePhotoUrl" TEXT,
    "galleryImageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "introVideoUrl" TEXT,
    "subscriptionTier" "SubscriptionTier" NOT NULL DEFAULT 'FREE',
    "subscriptionExpiresAt" TIMESTAMP(3),
    "featuredUntil" TIMESTAMP(3),
    "ratingAvg" DECIMAL(3,2),
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "inquiryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachProfileSpecialty" (
    "coachProfileId" TEXT NOT NULL,
    "specialtyId" TEXT NOT NULL,

    CONSTRAINT "CoachProfileSpecialty_pkey" PRIMARY KEY ("coachProfileId","specialtyId")
);

-- CreateTable
CREATE TABLE "Athlete" (
    "id" TEXT NOT NULL,
    "athleteKey" TEXT NOT NULL,
    "userId" TEXT,
    "coachProfileId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "displayName" TEXT,
    "sex" TEXT,
    "age" INTEGER,
    "dob" DATE,
    "email" TEXT,
    "phone" TEXT,
    "heightCm" INTEGER,
    "weightKg" DOUBLE PRECISION,
    "division" TEXT,
    "competitiveGoal" TEXT,
    "goals" TEXT,
    "notes" TEXT,
    "injuryHistory" JSONB,
    "trainingFrequency" JSONB,
    "current1rms" JSONB,
    "currentBenchmarks" JSONB,
    "targetsByCompetition" JSONB,
    "priorityGaps" JSONB,
    "programmingNotes" JSONB,
    "activeProgramId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Athlete_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AthleteLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unlinkedAt" TIMESTAMP(3),

    CONSTRAINT "AthleteLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Movement" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameEs" TEXT,
    "nameAr" TEXT,
    "category" TEXT,
    "videoUrl" TEXT,
    "demoUrl" TEXT,
    "attributes" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Movement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Program" (
    "id" TEXT NOT NULL,
    "programKey" TEXT,
    "athleteId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "goal" TEXT,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "durationWeeks" INTEGER,
    "weeklyStructure" JSONB,
    "targets" JSONB,
    "schemaVersion" TEXT NOT NULL DEFAULT '1.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Program_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramWeek" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "weekLabel" TEXT,
    "startDate" DATE,
    "endDate" DATE,

    CONSTRAINT "ProgramWeek_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramSession" (
    "id" TEXT NOT NULL,
    "programWeekId" TEXT NOT NULL,
    "sessionKey" TEXT,
    "date" DATE NOT NULL,
    "day" TEXT,
    "focus" TEXT,
    "intensity" TEXT,
    "notes" TEXT,

    CONSTRAINT "ProgramSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramBlock" (
    "id" TEXT NOT NULL,
    "programSessionId" TEXT NOT NULL,
    "blockCode" TEXT NOT NULL,
    "label" TEXT,
    "format" TEXT,
    "restSec" INTEGER,
    "timeCapSec" INTEGER,
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProgramBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramMovement" (
    "id" TEXT NOT NULL,
    "programBlockId" TEXT NOT NULL,
    "movementId" TEXT,
    "customName" TEXT,
    "prescription" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,
    "altGroup" TEXT,
    "pattern" TEXT,
    "isTest" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ProgramMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionLog" (
    "id" TEXT NOT NULL,
    "programSessionId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rating" INTEGER,
    "notes" TEXT,
    "actuals" JSONB,

    CONSTRAINT "SessionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestResult" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "movementId" TEXT,
    "customMovement" TEXT,
    "testType" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "resultValue" DECIMAL(10,2),
    "resultUnit" TEXT,
    "notes" TEXT,
    "source" TEXT,

    CONSTRAINT "TestResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "clientUserId" TEXT NOT NULL,
    "coachUserId" TEXT NOT NULL,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientReadAt" TIMESTAMP(3),
    "coachReadAt" TIMESTAMP(3),
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "containsContactInfo" BOOLEAN NOT NULL DEFAULT false,
    "isFlagged" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inquiry" (
    "id" TEXT NOT NULL,
    "clientUserId" TEXT,
    "anonymousEmail" TEXT,
    "anonymousPhone" TEXT,
    "goal" TEXT,
    "frequencyCurrent" TEXT,
    "frequencyDesired" TEXT,
    "numPeople" TEXT,
    "ageRange" TEXT,
    "injuryOrConcern" TEXT,
    "preferredLocation" TEXT,
    "preferredDaysAndTimes" TEXT,
    "urgency" TEXT,
    "notes" TEXT,
    "recommendedCoachIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "InquiryStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Inquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "coachProfileId" TEXT NOT NULL,
    "clientUserId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "bodyEn" TEXT,
    "bodyEs" TEXT,
    "bodyAr" TEXT,
    "coachResponse" TEXT,
    "coachResponseAt" TIMESTAMP(3),
    "isFlagged" BOOLEAN NOT NULL DEFAULT false,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameEs" TEXT NOT NULL,
    "nameAr" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "interval" "SubscriptionInterval" NOT NULL,
    "features" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" TIMESTAMP(3),
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "paymentProvider" TEXT,
    "paymentProviderRef" TEXT,
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "UserRole_role_idx" ON "UserRole"("role");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_role_key" ON "UserRole"("userId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Specialty_code_key" ON "Specialty"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CoachProfile_userId_key" ON "CoachProfile"("userId");

-- CreateIndex
CREATE INDEX "CoachProfile_listingStatus_subscriptionTier_idx" ON "CoachProfile"("listingStatus", "subscriptionTier");

-- CreateIndex
CREATE INDEX "CoachProfile_providerType_idx" ON "CoachProfile"("providerType");

-- CreateIndex
CREATE UNIQUE INDEX "Athlete_athleteKey_key" ON "Athlete"("athleteKey");

-- CreateIndex
CREATE UNIQUE INDEX "Athlete_userId_key" ON "Athlete"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AthleteLink_userId_athleteId_key" ON "AthleteLink"("userId", "athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "Movement_code_key" ON "Movement"("code");

-- CreateIndex
CREATE INDEX "Movement_category_idx" ON "Movement"("category");

-- CreateIndex
CREATE UNIQUE INDEX "Program_programKey_key" ON "Program"("programKey");

-- CreateIndex
CREATE INDEX "Program_athleteId_startDate_idx" ON "Program"("athleteId", "startDate");

-- CreateIndex
CREATE UNIQUE INDEX "ProgramWeek_programId_weekNumber_key" ON "ProgramWeek"("programId", "weekNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ProgramSession_sessionKey_key" ON "ProgramSession"("sessionKey");

-- CreateIndex
CREATE INDEX "ProgramSession_date_idx" ON "ProgramSession"("date");

-- CreateIndex
CREATE UNIQUE INDEX "SessionLog_programSessionId_key" ON "SessionLog"("programSessionId");

-- CreateIndex
CREATE INDEX "TestResult_athleteId_date_idx" ON "TestResult"("athleteId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_clientUserId_coachUserId_key" ON "Conversation"("clientUserId", "coachUserId");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "Inquiry_status_idx" ON "Inquiry"("status");

-- CreateIndex
CREATE INDEX "Review_coachProfileId_isHidden_idx" ON "Review"("coachProfileId", "isHidden");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlan_code_key" ON "SubscriptionPlan"("code");

-- CreateIndex
CREATE INDEX "Subscription_userId_status_idx" ON "Subscription"("userId", "status");

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachProfile" ADD CONSTRAINT "CoachProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachProfileSpecialty" ADD CONSTRAINT "CoachProfileSpecialty_coachProfileId_fkey" FOREIGN KEY ("coachProfileId") REFERENCES "CoachProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachProfileSpecialty" ADD CONSTRAINT "CoachProfileSpecialty_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "Specialty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Athlete" ADD CONSTRAINT "Athlete_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Athlete" ADD CONSTRAINT "Athlete_coachProfileId_fkey" FOREIGN KEY ("coachProfileId") REFERENCES "CoachProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteLink" ADD CONSTRAINT "AthleteLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteLink" ADD CONSTRAINT "AthleteLink_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Program" ADD CONSTRAINT "Program_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramWeek" ADD CONSTRAINT "ProgramWeek_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramSession" ADD CONSTRAINT "ProgramSession_programWeekId_fkey" FOREIGN KEY ("programWeekId") REFERENCES "ProgramWeek"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramBlock" ADD CONSTRAINT "ProgramBlock_programSessionId_fkey" FOREIGN KEY ("programSessionId") REFERENCES "ProgramSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramMovement" ADD CONSTRAINT "ProgramMovement_programBlockId_fkey" FOREIGN KEY ("programBlockId") REFERENCES "ProgramBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramMovement" ADD CONSTRAINT "ProgramMovement_movementId_fkey" FOREIGN KEY ("movementId") REFERENCES "Movement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionLog" ADD CONSTRAINT "SessionLog_programSessionId_fkey" FOREIGN KEY ("programSessionId") REFERENCES "ProgramSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionLog" ADD CONSTRAINT "SessionLog_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestResult" ADD CONSTRAINT "TestResult_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestResult" ADD CONSTRAINT "TestResult_movementId_fkey" FOREIGN KEY ("movementId") REFERENCES "Movement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_coachUserId_fkey" FOREIGN KEY ("coachUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_coachProfileId_fkey" FOREIGN KEY ("coachProfileId") REFERENCES "CoachProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
