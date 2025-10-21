-- CreateEnum
CREATE TYPE "GigStatus" AS ENUM ('DRAFT', 'OPEN', 'IN_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REVISION');

-- CreateTable
CREATE TABLE "gigs" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "postedById" TEXT NOT NULL,
    "postedByType" TEXT NOT NULL DEFAULT 'user',
    "budget" DOUBLE PRECISION,
    "budgetType" TEXT NOT NULL DEFAULT 'fixed',
    "roleRequired" TEXT NOT NULL,
    "skillsRequired" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isClanAllowed" BOOLEAN NOT NULL DEFAULT true,
    "location" TEXT,
    "duration" TEXT,
    "urgency" TEXT NOT NULL DEFAULT 'normal',
    "status" "GigStatus" NOT NULL DEFAULT 'OPEN',
    "category" TEXT NOT NULL,
    "deliverables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requirements" TEXT,
    "deadline" TIMESTAMP(3),
    "assignedToId" TEXT,
    "assignedToType" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gigs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "gigId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "applicantType" TEXT NOT NULL,
    "proposal" TEXT,
    "quotedPrice" DOUBLE PRECISION,
    "estimatedTime" TEXT,
    "portfolio" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submissions" (
    "id" TEXT NOT NULL,
    "gigId" TEXT NOT NULL,
    "submitterId" TEXT NOT NULL,
    "submitterType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "files" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "feedback" TEXT,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gig_boost_events" (
    "id" TEXT NOT NULL,
    "gigId" TEXT NOT NULL,
    "boosterId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "duration" INTEGER NOT NULL,
    "eventId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gig_boost_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gig_credit_events" (
    "id" TEXT NOT NULL,
    "gigId" TEXT,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "eventId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gig_credit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gig_boost_events_eventId_key" ON "gig_boost_events"("eventId");

-- CreateIndex
CREATE INDEX "gig_boost_events_gigId_idx" ON "gig_boost_events"("gigId");

-- CreateIndex
CREATE INDEX "gig_boost_events_isActive_idx" ON "gig_boost_events"("isActive");

-- CreateIndex
CREATE INDEX "gig_boost_events_expiresAt_idx" ON "gig_boost_events"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "gig_credit_events_eventId_key" ON "gig_credit_events"("eventId");

-- CreateIndex
CREATE INDEX "gig_credit_events_gigId_idx" ON "gig_credit_events"("gigId");

-- CreateIndex
CREATE INDEX "gig_credit_events_userId_idx" ON "gig_credit_events"("userId");

-- CreateIndex
CREATE INDEX "gig_credit_events_eventType_idx" ON "gig_credit_events"("eventType");

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_gigId_fkey" FOREIGN KEY ("gigId") REFERENCES "gigs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_gigId_fkey" FOREIGN KEY ("gigId") REFERENCES "gigs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
