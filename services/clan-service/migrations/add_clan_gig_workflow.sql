-- Migration: Add Clan Gig Workflow Tables
-- This migration adds the new tables for clan work packages and member agreements

-- Create clan_work_packages table
CREATE TABLE IF NOT EXISTS "clan_work_packages" (
    "id" TEXT NOT NULL,
    "gigId" TEXT NOT NULL,
    "clanId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assigneeUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'TODO',
    "estimatedHours" DOUBLE PRECISION,
    "actualHours" DOUBLE PRECISION,
    "deliverables" TEXT[] DEFAULT '{}',
    "notes" TEXT,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "clan_work_packages_pkey" PRIMARY KEY ("id")
);

-- Create member_agreements table
CREATE TABLE IF NOT EXISTS "member_agreements" (
    "id" TEXT NOT NULL,
    "clanId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gigId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "expectedHours" DOUBLE PRECISION,
    "deliverables" TEXT[] DEFAULT '{}',
    "payoutPercentage" DOUBLE PRECISION,
    "payoutFixedAmount" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "member_agreements_pkey" PRIMARY KEY ("id")
);

-- Add unique constraint on member_agreements table
ALTER TABLE member_agreements ADD CONSTRAINT "member_agreements_clanId_userId_gigId_key" UNIQUE ("clanId", "userId", "gigId");

-- Add foreign key constraints
ALTER TABLE clan_work_packages ADD CONSTRAINT "clan_work_packages_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "clans"("id") ON DELETE CASCADE;
ALTER TABLE member_agreements ADD CONSTRAINT "member_agreements_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "clans"("id") ON DELETE CASCADE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS "clan_work_packages_clanId_idx" ON "clan_work_packages"("clanId");
CREATE INDEX IF NOT EXISTS "clan_work_packages_gigId_idx" ON "clan_work_packages"("gigId");
CREATE INDEX IF NOT EXISTS "clan_work_packages_assigneeUserId_idx" ON "clan_work_packages"("assigneeUserId");
CREATE INDEX IF NOT EXISTS "member_agreements_clanId_idx" ON "member_agreements"("clanId");
CREATE INDEX IF NOT EXISTS "member_agreements_gigId_idx" ON "member_agreements"("gigId");
CREATE INDEX IF NOT EXISTS "member_agreements_userId_idx" ON "member_agreements"("userId");
CREATE INDEX IF NOT EXISTS "member_agreements_status_idx" ON "member_agreements"("status");

-- Create enum types if they don't exist
-- Note: PostgreSQL will handle enum creation automatically when the tables are created
