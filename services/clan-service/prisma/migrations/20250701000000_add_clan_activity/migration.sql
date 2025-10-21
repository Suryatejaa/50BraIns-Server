-- CreateTable: clan_activities
CREATE TABLE "clan_activities" (
  "id" TEXT NOT NULL,
  "clanId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "attachments" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "pollOptions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "isPinned" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "clan_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable: clan_activity_votes
CREATE TABLE "clan_activity_votes" (
  "id" TEXT NOT NULL,
  "activityId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "optionIndex" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "clan_activity_votes_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "clan_activities_clanId_idx" ON "clan_activities"("clanId");
CREATE INDEX "clan_activities_createdAt_idx" ON "clan_activities"("createdAt");
CREATE INDEX "clan_activities_isPinned_createdAt_idx" ON "clan_activities"("isPinned", "createdAt");
CREATE UNIQUE INDEX "clan_activity_votes_activityId_userId_key" ON "clan_activity_votes"("activityId", "userId");
CREATE INDEX "clan_activity_votes_activityId_idx" ON "clan_activity_votes"("activityId");

