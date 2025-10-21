/*
  Warnings:

  - You are about to drop the `Clan` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ClanVisibility" AS ENUM ('PUBLIC', 'PRIVATE', 'INVITE_ONLY');

-- CreateEnum
CREATE TYPE "ClanRole" AS ENUM ('HEAD', 'CO_HEAD', 'ADMIN', 'SENIOR_MEMBER', 'MEMBER', 'TRAINEE');

-- CreateEnum
CREATE TYPE "ClanPermission" AS ENUM ('INVITE_MEMBERS', 'REMOVE_MEMBERS', 'EDIT_CLAN_INFO', 'MANAGE_PORTFOLIO', 'APPLY_TO_GIGS', 'MANAGE_FINANCES', 'VIEW_ANALYTICS');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'LEFT');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "PortfolioMediaType" AS ENUM ('IMAGE', 'VIDEO', 'DOCUMENT', 'LINK');

-- DropTable
DROP TABLE "Clan";

-- CreateTable
CREATE TABLE "clans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "tagline" TEXT,
    "visibility" "ClanVisibility" NOT NULL DEFAULT 'PUBLIC',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "clanHeadId" TEXT NOT NULL,
    "email" TEXT,
    "website" TEXT,
    "instagramHandle" TEXT,
    "twitterHandle" TEXT,
    "linkedinHandle" TEXT,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "isPaidMembership" BOOLEAN NOT NULL DEFAULT false,
    "membershipFee" DOUBLE PRECISION,
    "maxMembers" INTEGER NOT NULL DEFAULT 50,
    "primaryCategory" TEXT,
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "location" TEXT,
    "timezone" TEXT,
    "totalGigs" INTEGER NOT NULL DEFAULT 0,
    "completedGigs" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reputationScore" INTEGER NOT NULL DEFAULT 0,
    "portfolioImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "portfolioVideos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "showcaseProjects" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clan_members" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clanId" TEXT NOT NULL,
    "role" "ClanRole" NOT NULL DEFAULT 'MEMBER',
    "customRole" TEXT,
    "permissions" "ClanPermission"[] DEFAULT ARRAY[]::"ClanPermission"[],
    "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "isCore" BOOLEAN NOT NULL DEFAULT false,
    "gigsParticipated" INTEGER NOT NULL DEFAULT 0,
    "revenueGenerated" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "contributionScore" INTEGER NOT NULL DEFAULT 0,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clan_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clan_invitations" (
    "id" TEXT NOT NULL,
    "clanId" TEXT NOT NULL,
    "invitedUserId" TEXT NOT NULL,
    "invitedByUserId" TEXT NOT NULL,
    "invitedEmail" TEXT,
    "role" "ClanRole" NOT NULL DEFAULT 'MEMBER',
    "customRole" TEXT,
    "message" TEXT,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "clan_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clan_join_requests" (
    "id" TEXT NOT NULL,
    "clanId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT,
    "requestedRole" "ClanRole" NOT NULL DEFAULT 'MEMBER',
    "portfolio" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "clan_join_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clan_analytics" (
    "id" TEXT NOT NULL,
    "clanId" TEXT NOT NULL,
    "profileViews" INTEGER NOT NULL DEFAULT 0,
    "searchAppearances" INTEGER NOT NULL DEFAULT 0,
    "contactClicks" INTEGER NOT NULL DEFAULT 0,
    "gigApplications" INTEGER NOT NULL DEFAULT 0,
    "gigWinRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageProjectValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "clientRetentionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "memberGrowthRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "memberRetentionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "teamProductivity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "marketRanking" INTEGER,
    "categoryRanking" INTEGER,
    "localRanking" INTEGER,
    "socialEngagement" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "referralCount" INTEGER NOT NULL DEFAULT 0,
    "lastCalculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clan_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clan_portfolio" (
    "id" TEXT NOT NULL,
    "clanId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "mediaType" "PortfolioMediaType" NOT NULL,
    "mediaUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "projectType" TEXT,
    "clientName" TEXT,
    "projectDate" TIMESTAMP(3),
    "projectValue" DOUBLE PRECISION,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clan_portfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clan_reviews" (
    "id" TEXT NOT NULL,
    "clanId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "communicationRating" INTEGER,
    "qualityRating" INTEGER,
    "timelinessRating" INTEGER,
    "professionalismRating" INTEGER,
    "projectId" TEXT,
    "projectType" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clan_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clans_slug_key" ON "clans"("slug");

-- CreateIndex
CREATE INDEX "clans_visibility_idx" ON "clans"("visibility");

-- CreateIndex
CREATE INDEX "clans_primaryCategory_idx" ON "clans"("primaryCategory");

-- CreateIndex
CREATE INDEX "clans_reputationScore_idx" ON "clans"("reputationScore");

-- CreateIndex
CREATE INDEX "clans_clanHeadId_idx" ON "clans"("clanHeadId");

-- CreateIndex
CREATE INDEX "clan_members_userId_idx" ON "clan_members"("userId");

-- CreateIndex
CREATE INDEX "clan_members_clanId_idx" ON "clan_members"("clanId");

-- CreateIndex
CREATE INDEX "clan_members_status_idx" ON "clan_members"("status");

-- CreateIndex
CREATE UNIQUE INDEX "clan_members_userId_clanId_key" ON "clan_members"("userId", "clanId");

-- CreateIndex
CREATE INDEX "clan_invitations_invitedUserId_idx" ON "clan_invitations"("invitedUserId");

-- CreateIndex
CREATE INDEX "clan_invitations_clanId_idx" ON "clan_invitations"("clanId");

-- CreateIndex
CREATE INDEX "clan_invitations_status_idx" ON "clan_invitations"("status");

-- CreateIndex
CREATE INDEX "clan_invitations_expiresAt_idx" ON "clan_invitations"("expiresAt");

-- CreateIndex
CREATE INDEX "clan_join_requests_userId_idx" ON "clan_join_requests"("userId");

-- CreateIndex
CREATE INDEX "clan_join_requests_clanId_idx" ON "clan_join_requests"("clanId");

-- CreateIndex
CREATE INDEX "clan_join_requests_status_idx" ON "clan_join_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "clan_join_requests_userId_clanId_key" ON "clan_join_requests"("userId", "clanId");

-- CreateIndex
CREATE UNIQUE INDEX "clan_analytics_clanId_key" ON "clan_analytics"("clanId");

-- CreateIndex
CREATE INDEX "clan_portfolio_clanId_idx" ON "clan_portfolio"("clanId");

-- CreateIndex
CREATE INDEX "clan_portfolio_mediaType_idx" ON "clan_portfolio"("mediaType");

-- CreateIndex
CREATE INDEX "clan_portfolio_isPublic_idx" ON "clan_portfolio"("isPublic");

-- CreateIndex
CREATE INDEX "clan_portfolio_isFeatured_idx" ON "clan_portfolio"("isFeatured");

-- CreateIndex
CREATE INDEX "clan_reviews_clanId_idx" ON "clan_reviews"("clanId");

-- CreateIndex
CREATE INDEX "clan_reviews_reviewerId_idx" ON "clan_reviews"("reviewerId");

-- CreateIndex
CREATE INDEX "clan_reviews_rating_idx" ON "clan_reviews"("rating");

-- CreateIndex
CREATE INDEX "clan_reviews_isPublic_idx" ON "clan_reviews"("isPublic");

-- AddForeignKey
ALTER TABLE "clan_members" ADD CONSTRAINT "clan_members_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "clans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clan_invitations" ADD CONSTRAINT "clan_invitations_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "clans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clan_join_requests" ADD CONSTRAINT "clan_join_requests_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "clans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clan_analytics" ADD CONSTRAINT "clan_analytics_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "clans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clan_portfolio" ADD CONSTRAINT "clan_portfolio_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "clans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clan_reviews" ADD CONSTRAINT "clan_reviews_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "clans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
