-- CreateEnum
CREATE TYPE "ReputationTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'LEGEND');

-- CreateTable
CREATE TABLE "reputation_scores" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userType" TEXT NOT NULL DEFAULT 'individual',
    "gigsCompleted" INTEGER NOT NULL DEFAULT 0,
    "gigsPosted" INTEGER NOT NULL DEFAULT 0,
    "boostsReceived" INTEGER NOT NULL DEFAULT 0,
    "boostsGiven" INTEGER NOT NULL DEFAULT 0,
    "creditsSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "creditsEarned" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "profileViews" INTEGER NOT NULL DEFAULT 0,
    "connectionsMade" INTEGER NOT NULL DEFAULT 0,
    "clanContributions" INTEGER NOT NULL DEFAULT 0,
    "applicationSuccess" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "responseTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "baseScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bonusScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "penaltyScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "finalScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tier" "ReputationTier" NOT NULL DEFAULT 'BRONZE',
    "badges" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isSuspended" BOOLEAN NOT NULL DEFAULT false,
    "adminOverride" DOUBLE PRECISION,
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reputation_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clan_reputations" (
    "id" TEXT NOT NULL,
    "clanId" TEXT NOT NULL,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "averageScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalGigsCompleted" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "clanBoostsReceived" INTEGER NOT NULL DEFAULT 0,
    "collaborationRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "memberRetention" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "clanScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "clanTier" "ReputationTier" NOT NULL DEFAULT 'BRONZE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clan_reputations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "score_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "previousScore" DOUBLE PRECISION NOT NULL,
    "newScore" DOUBLE PRECISION NOT NULL,
    "scoreDelta" DOUBLE PRECISION NOT NULL,
    "changeReason" TEXT NOT NULL,
    "eventId" TEXT,
    "eventData" JSONB,
    "calculatedBy" TEXT NOT NULL DEFAULT 'system',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "score_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventSource" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "scoreImpact" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "description" TEXT,
    "metadata" JSONB,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leaderboard_cache" (
    "id" TEXT NOT NULL,
    "boardType" TEXT NOT NULL,
    "boardKey" TEXT NOT NULL,
    "rankings" JSONB NOT NULL,
    "totalUsers" INTEGER NOT NULL DEFAULT 0,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "lastCalculated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leaderboard_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "score_config" (
    "id" TEXT NOT NULL,
    "configKey" TEXT NOT NULL,
    "configValue" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "score_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reputation_scores_userId_key" ON "reputation_scores"("userId");

-- CreateIndex
CREATE INDEX "reputation_scores_userId_idx" ON "reputation_scores"("userId");

-- CreateIndex
CREATE INDEX "reputation_scores_finalScore_idx" ON "reputation_scores"("finalScore");

-- CreateIndex
CREATE INDEX "reputation_scores_tier_idx" ON "reputation_scores"("tier");

-- CreateIndex
CREATE INDEX "reputation_scores_isVerified_idx" ON "reputation_scores"("isVerified");

-- CreateIndex
CREATE UNIQUE INDEX "clan_reputations_clanId_key" ON "clan_reputations"("clanId");

-- CreateIndex
CREATE INDEX "clan_reputations_clanId_idx" ON "clan_reputations"("clanId");

-- CreateIndex
CREATE INDEX "clan_reputations_clanScore_idx" ON "clan_reputations"("clanScore");

-- CreateIndex
CREATE INDEX "score_history_userId_idx" ON "score_history"("userId");

-- CreateIndex
CREATE INDEX "score_history_createdAt_idx" ON "score_history"("createdAt");

-- CreateIndex
CREATE INDEX "score_history_changeReason_idx" ON "score_history"("changeReason");

-- CreateIndex
CREATE INDEX "activity_logs_userId_idx" ON "activity_logs"("userId");

-- CreateIndex
CREATE INDEX "activity_logs_eventType_idx" ON "activity_logs"("eventType");

-- CreateIndex
CREATE INDEX "activity_logs_processed_idx" ON "activity_logs"("processed");

-- CreateIndex
CREATE INDEX "activity_logs_createdAt_idx" ON "activity_logs"("createdAt");

-- CreateIndex
CREATE INDEX "leaderboard_cache_validUntil_idx" ON "leaderboard_cache"("validUntil");

-- CreateIndex
CREATE UNIQUE INDEX "leaderboard_cache_boardType_boardKey_key" ON "leaderboard_cache"("boardType", "boardKey");

-- CreateIndex
CREATE UNIQUE INDEX "score_config_configKey_key" ON "score_config"("configKey");

-- AddForeignKey
ALTER TABLE "score_history" ADD CONSTRAINT "score_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "reputation_scores"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "reputation_scores"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
