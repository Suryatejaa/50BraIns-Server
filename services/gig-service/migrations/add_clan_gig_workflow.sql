-- Migration: Add Clan Gig Workflow Tables
-- This migration adds the new tables for clan applications, assignments, milestones, and tasks

-- Add clanId column to applications table
ALTER TABLE applications ADD COLUMN IF NOT EXISTS "clanId" TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS "teamPlan" JSONB;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS "milestonePlan" JSONB;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS "payoutSplit" JSONB;

-- Create gig_assignments table
CREATE TABLE IF NOT EXISTS "gig_assignments" (
    "id" TEXT NOT NULL,
    "gigId" TEXT NOT NULL,
    "assigneeType" TEXT NOT NULL,
    "assigneeId" TEXT NOT NULL,
    "clanId" TEXT,
    "teamPlanSnapshot" JSONB,
    "milestonePlanSnapshot" JSONB,
    "payoutSplitSnapshot" JSONB,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "gig_assignments_pkey" PRIMARY KEY ("id")
);

-- Create gig_milestones table
CREATE TABLE IF NOT EXISTS "gig_milestones" (
    "id" TEXT NOT NULL,
    "gigId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "deliverables" TEXT[] DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "feedback" TEXT,
    CONSTRAINT "gig_milestones_pkey" PRIMARY KEY ("id")
);

-- Create gig_tasks table
CREATE TABLE IF NOT EXISTS "gig_tasks" (
    "id" TEXT NOT NULL,
    "gigId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "milestoneId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assigneeUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'TODO',
    "estimatedHours" DOUBLE PRECISION,
    "actualHours" DOUBLE PRECISION,
    "deliverables" TEXT[] DEFAULT '{}',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "gig_tasks_pkey" PRIMARY KEY ("id")
);

-- Add unique constraint on applications table
ALTER TABLE applications ADD CONSTRAINT "applications_applicantId_gigId_key" UNIQUE ("applicantId", "gigId");

-- Add unique constraint on gig_assignments table
ALTER TABLE gig_assignments ADD CONSTRAINT "gig_assignments_gigId_key" UNIQUE ("gigId");

-- Add foreign key constraints
ALTER TABLE gig_assignments ADD CONSTRAINT "gig_assignments_gigId_fkey" FOREIGN KEY ("gigId") REFERENCES "gigs"("id") ON DELETE CASCADE;
ALTER TABLE gig_milestones ADD CONSTRAINT "gig_milestones_gigId_fkey" FOREIGN KEY ("gigId") REFERENCES "gigs"("id") ON DELETE CASCADE;
ALTER TABLE gig_milestones ADD CONSTRAINT "gig_milestones_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "gig_assignments"("id") ON DELETE CASCADE;
ALTER TABLE gig_tasks ADD CONSTRAINT "gig_tasks_gigId_fkey" FOREIGN KEY ("gigId") REFERENCES "gigs"("id") ON DELETE CASCADE;
ALTER TABLE gig_tasks ADD CONSTRAINT "gig_tasks_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "gig_assignments"("id") ON DELETE CASCADE;
ALTER TABLE gig_tasks ADD CONSTRAINT "gig_tasks_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "gig_milestones"("id") ON DELETE SET NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS "gig_assignments_clanId_idx" ON "gig_assignments"("clanId");
CREATE INDEX IF NOT EXISTS "gig_assignments_status_idx" ON "gig_assignments"("status");
CREATE INDEX IF NOT EXISTS "gig_milestones_assignmentId_idx" ON "gig_milestones"("assignmentId");
CREATE INDEX IF NOT EXISTS "gig_milestones_status_idx" ON "gig_milestones"("status");
CREATE INDEX IF NOT EXISTS "gig_tasks_assignmentId_idx" ON "gig_tasks"("assignmentId");
CREATE INDEX IF NOT EXISTS "gig_tasks_assigneeUserId_idx" ON "gig_tasks"("assigneeUserId");
CREATE INDEX IF NOT EXISTS "gig_tasks_status_idx" ON "gig_tasks"("status");

-- Insert enum values if they don't exist
-- Note: PostgreSQL will handle enum creation automatically when the tables are created
