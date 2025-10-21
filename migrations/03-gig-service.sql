-- 03-GIG-SERVICE.sql
-- Gig Service Migration - Creates gig service tables
-- Run after: 00-create-enums.sql

-- ============================================================================
-- GIG SERVICE TABLES
-- ============================================================================

-- Disable triggers temporarily
SET session_replication_role = replica;

-- Drop existing tables in reverse dependency order
DROP TABLE IF EXISTS "gigTasks";
DROP TABLE IF EXISTS "gigMilestones";
DROP TABLE IF EXISTS "gigAssignments";
DROP TABLE IF EXISTS "gigCreditEvents";
DROP TABLE IF EXISTS "gigBoostEvents";
DROP TABLE IF EXISTS "submissions";
DROP TABLE IF EXISTS "applications";
DROP TABLE IF EXISTS "gigs";

CREATE TABLE "gigs" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "postedById" TEXT NOT NULL,
    "postedByType" TEXT DEFAULT 'user',
    "brandName" TEXT,
    "brandUsername" TEXT,
    "brandAvatar" TEXT,
    "brandVerified" BOOLEAN DEFAULT false,
    "budgetMin" DOUBLE PRECISION,
    "budgetMax" DOUBLE PRECISION,
    "experienceLevel" TEXT DEFAULT 'intermediate',
    "budgetType" TEXT DEFAULT 'fixed',
    "roleRequired" TEXT NOT NULL,
    "skillsRequired" TEXT[] DEFAULT ARRAY[]::"text"[],
    "isClanAllowed" BOOLEAN DEFAULT true,
    "location" TEXT,
    "duration" TEXT,
    "urgency" TEXT DEFAULT 'normal',
    "status" "GigStatus" NOT NULL,
    "category" TEXT NOT NULL,
    "deliverables" TEXT[] DEFAULT ARRAY[]::"text"[],
    "requirements" TEXT,
    "deadline" TIMESTAMPTZ(6),
    "assignedToId" TEXT,
    "assignedToType" TEXT,
    "completedAt" TIMESTAMPTZ(6),
    "gigType" "GigType" DEFAULT 'REMOTE',
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "maxApplications" INTEGER,
    "platformRequirements" TEXT[] DEFAULT ARRAY[]::"text"[],
    "tags" TEXT[] DEFAULT ARRAY[]::"text"[],
    "followerRequirements" JSONB[] DEFAULT ARRAY[]::jsonb[],
    "locationRequirements" TEXT[] DEFAULT ARRAY[]::"text"[],
    "campaignDuration" TEXT,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gigs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "gigId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "applicantType" TEXT NOT NULL,
    "clanId" TEXT,
    "proposal" TEXT,
    "quotedPrice" DOUBLE PRECISION,
    "estimatedTime" TEXT,
    "portfolio" TEXT[] DEFAULT ARRAY[]::"text"[],
    "status" "ApplicationStatus" DEFAULT 'PENDING',
    "upiId" TEXT NOT NULL,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "teamPlan" JSONB,
    "milestonePlan" JSONB,
    "payoutSplit" JSONB,
    "appliedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMPTZ(6),
    "rejectionReason" TEXT,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "applications_applicantId_gigId_key" UNIQUE ("applicantId", "gigId")
);

CREATE TABLE "submissions" (
    "id" TEXT NOT NULL,
    "gigId" TEXT NOT NULL,
    "applicationId" TEXT,
    "submittedById" TEXT NOT NULL,
    "submittedByType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "upiId" TEXT NOT NULL,
    "deliverables" TEXT[] DEFAULT ARRAY[]::"text"[],
    "notes" TEXT,
    "status" "SubmissionStatus" DEFAULT 'PENDING',
    "submittedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMPTZ(6),
    "feedback" TEXT,
    "rating" INTEGER,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "gigBoostEvents" (
    "id" TEXT NOT NULL,
    "gigId" TEXT NOT NULL,
    "boosterId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "duration" INTEGER NOT NULL,
    "eventId" TEXT NOT NULL,
    "isActive" BOOLEAN DEFAULT true,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gigBoostEvents_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "gigBoostEvents_eventId_key" UNIQUE ("eventId")
);

CREATE TABLE "gigCreditEvents" (
    "id" TEXT NOT NULL,
    "gigId" TEXT,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "eventId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gigCreditEvents_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "gigCreditEvents_eventId_key" UNIQUE ("eventId")
);

CREATE TABLE "gigAssignments" (
    "id" TEXT NOT NULL,
    "gigId" TEXT NOT NULL,
    "applicationId" TEXT,
    "assigneeType" TEXT NOT NULL,
    "assigneeId" TEXT NOT NULL,
    "clanId" TEXT,
    "teamPlanSnapshot" JSONB,
    "milestonePlanSnapshot" JSONB,
    "payoutSplitSnapshot" JSONB,
    "status" "GigAssignmentStatus" DEFAULT 'ACTIVE',
    "assignedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ(6),

    CONSTRAINT "gigAssignments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "gigAssignments_gigId_key" UNIQUE ("gigId"),
    CONSTRAINT "gigAssignments_applicationId_key" UNIQUE ("applicationId")
);

CREATE TABLE "gigMilestones" (
    "id" TEXT NOT NULL,
    "gigId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueAt" TIMESTAMPTZ(6) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "deliverables" TEXT[] DEFAULT ARRAY[]::"text"[],
    "status" "GigMilestoneStatus" DEFAULT 'PENDING',
    "submittedAt" TIMESTAMPTZ(6),
    "approvedAt" TIMESTAMPTZ(6),
    "paidAt" TIMESTAMPTZ(6),
    "feedback" TEXT,

    CONSTRAINT "gigMilestones_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "gigTasks" (
    "id" TEXT NOT NULL,
    "gigId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "milestoneId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assigneeUserId" TEXT NOT NULL,
    "status" "GigTaskStatus" DEFAULT 'TODO',
    "estimatedHours" DOUBLE PRECISION,
    "actualHours" DOUBLE PRECISION,
    "deliverables" TEXT[] DEFAULT ARRAY[]::"text"[],
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gigTasks_pkey" PRIMARY KEY ("id")
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "gigBoostEvents_gigId_idx" ON "gigBoostEvents"("gigId");
CREATE INDEX IF NOT EXISTS "gigBoostEvents_isActive_idx" ON "gigBoostEvents"("isActive");
CREATE INDEX IF NOT EXISTS "gigBoostEvents_expiresAt_idx" ON "gigBoostEvents"("expiresAt");

CREATE INDEX IF NOT EXISTS "gigCreditEvents_gigId_idx" ON "gigCreditEvents"("gigId");
CREATE INDEX IF NOT EXISTS "gigCreditEvents_userId_idx" ON "gigCreditEvents"("userId");
CREATE INDEX IF NOT EXISTS "gigCreditEvents_eventType_idx" ON "gigCreditEvents"("eventType");

-- Re-enable triggers
SET session_replication_role = DEFAULT;

SELECT 'SUCCESS: Gig service tables created!' as result;