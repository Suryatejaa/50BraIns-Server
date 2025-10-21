/*
  Warnings:

  - A unique constraint covering the columns `[applicantId,gigId]` on the table `applications` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "GigAssignmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "GigMilestoneStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID');

-- CreateEnum
CREATE TYPE "GigTaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "GigType" AS ENUM ('PRODUCT', 'VISIT', 'REMOTE');

-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "address" TEXT,
ADD COLUMN     "clanId" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "milestonePlan" JSONB,
ADD COLUMN     "payoutSplit" JSONB,
ADD COLUMN     "teamPlan" JSONB;

-- AlterTable
ALTER TABLE "gigs" ADD COLUMN     "address" TEXT,
ADD COLUMN     "campaignDuration" TEXT,
ADD COLUMN     "followerRequirements" JSONB[] DEFAULT ARRAY[]::JSONB[],
ADD COLUMN     "gigType" "GigType" NOT NULL DEFAULT 'REMOTE',
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "locationRequirements" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "maxApplications" INTEGER,
ADD COLUMN     "platformRequirements" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "experienceLevel" SET DEFAULT 'intermediate';

-- CreateTable
CREATE TABLE "gig_assignments" (
    "id" TEXT NOT NULL,
    "gigId" TEXT NOT NULL,
    "applicationId" TEXT,
    "assigneeType" TEXT NOT NULL,
    "assigneeId" TEXT NOT NULL,
    "clanId" TEXT,
    "teamPlanSnapshot" JSONB,
    "milestonePlanSnapshot" JSONB,
    "payoutSplitSnapshot" JSONB,
    "status" "GigAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "gig_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gig_milestones" (
    "id" TEXT NOT NULL,
    "gigId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "deliverables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "GigMilestoneStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "feedback" TEXT,

    CONSTRAINT "gig_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gig_tasks" (
    "id" TEXT NOT NULL,
    "gigId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "milestoneId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assigneeUserId" TEXT NOT NULL,
    "status" "GigTaskStatus" NOT NULL DEFAULT 'TODO',
    "estimatedHours" DOUBLE PRECISION,
    "actualHours" DOUBLE PRECISION,
    "deliverables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gig_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gig_assignments_gigId_key" ON "gig_assignments"("gigId");

-- CreateIndex
CREATE UNIQUE INDEX "gig_assignments_applicationId_key" ON "gig_assignments"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "applications_applicantId_gigId_key" ON "applications"("applicantId", "gigId");

-- AddForeignKey
ALTER TABLE "gig_assignments" ADD CONSTRAINT "gig_assignments_gigId_fkey" FOREIGN KEY ("gigId") REFERENCES "gigs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gig_assignments" ADD CONSTRAINT "gig_assignments_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gig_milestones" ADD CONSTRAINT "gig_milestones_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "gig_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gig_tasks" ADD CONSTRAINT "gig_tasks_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "gig_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gig_tasks" ADD CONSTRAINT "gig_tasks_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "gig_milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
