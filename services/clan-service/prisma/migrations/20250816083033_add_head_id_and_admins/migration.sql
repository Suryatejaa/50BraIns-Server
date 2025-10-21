/*
  Warnings:

  - You are about to drop the column `contributionScore` on the `clan_members` table. All the data in the column will be lost.
  - You are about to drop the column `customRole` on the `clan_members` table. All the data in the column will be lost.
  - You are about to drop the column `gigsParticipated` on the `clan_members` table. All the data in the column will be lost.
  - You are about to drop the column `isCore` on the `clan_members` table. All the data in the column will be lost.
  - You are about to drop the column `lastActiveAt` on the `clan_members` table. All the data in the column will be lost.
  - You are about to drop the column `permissions` on the `clan_members` table. All the data in the column will be lost.
  - You are about to drop the column `revenueGenerated` on the `clan_members` table. All the data in the column will be lost.
  - The `role` column on the `clan_members` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `clan_members` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `averageRating` on the `clans` table. All the data in the column will be lost.
  - You are about to drop the column `clanHeadId` on the `clans` table. All the data in the column will be lost.
  - You are about to drop the column `completedGigs` on the `clans` table. All the data in the column will be lost.
  - You are about to drop the column `slug` on the `clans` table. All the data in the column will be lost.
  - You are about to drop the column `totalGigs` on the `clans` table. All the data in the column will be lost.
  - You are about to drop the column `totalRevenue` on the `clans` table. All the data in the column will be lost.
  - The `visibility` column on the `clans` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `clan_activities` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `clan_activity_votes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `clan_analytics` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `clan_boost_events` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `clan_credit_events` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `clan_invitations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `clan_join_requests` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `clan_portfolio` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `clan_reviews` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `headId` to the `clans` table without a default value. This is not possible if the table is not empty.
  - Made the column `primaryCategory` on table `clans` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "clan_analytics" DROP CONSTRAINT "clan_analytics_clanId_fkey";

-- DropForeignKey
ALTER TABLE "clan_invitations" DROP CONSTRAINT "clan_invitations_clanId_fkey";

-- DropForeignKey
ALTER TABLE "clan_join_requests" DROP CONSTRAINT "clan_join_requests_clanId_fkey";

-- DropForeignKey
ALTER TABLE "clan_portfolio" DROP CONSTRAINT "clan_portfolio_clanId_fkey";

-- DropForeignKey
ALTER TABLE "clan_reviews" DROP CONSTRAINT "clan_reviews_clanId_fkey";

-- DropIndex
DROP INDEX "clans_clanHeadId_idx";

-- DropIndex
DROP INDEX "clans_slug_key";

-- AlterTable
ALTER TABLE "clan_members" DROP COLUMN "contributionScore",
DROP COLUMN "customRole",
DROP COLUMN "gigsParticipated",
DROP COLUMN "isCore",
DROP COLUMN "lastActiveAt",
DROP COLUMN "permissions",
DROP COLUMN "revenueGenerated",
DROP COLUMN "role",
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'MEMBER',
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "clans" DROP COLUMN "averageRating",
DROP COLUMN "clanHeadId",
DROP COLUMN "completedGigs",
DROP COLUMN "slug",
DROP COLUMN "totalGigs",
DROP COLUMN "totalRevenue",
ADD COLUMN     "admins" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "headId" TEXT NOT NULL,
ADD COLUMN     "memberCount" INTEGER NOT NULL DEFAULT 1,
DROP COLUMN "visibility",
ADD COLUMN     "visibility" TEXT NOT NULL DEFAULT 'PUBLIC',
ALTER COLUMN "maxMembers" SET DEFAULT 255,
ALTER COLUMN "primaryCategory" SET NOT NULL,
ALTER COLUMN "primaryCategory" SET DEFAULT 'General';

-- DropTable
DROP TABLE "clan_activities";

-- DropTable
DROP TABLE "clan_activity_votes";

-- DropTable
DROP TABLE "clan_analytics";

-- DropTable
DROP TABLE "clan_boost_events";

-- DropTable
DROP TABLE "clan_credit_events";

-- DropTable
DROP TABLE "clan_invitations";

-- DropTable
DROP TABLE "clan_join_requests";

-- DropTable
DROP TABLE "clan_portfolio";

-- DropTable
DROP TABLE "clan_reviews";

-- DropEnum
DROP TYPE "ClanPermission";

-- DropEnum
DROP TYPE "ClanRole";

-- DropEnum
DROP TYPE "ClanVisibility";

-- DropEnum
DROP TYPE "InvitationStatus";

-- DropEnum
DROP TYPE "MemberStatus";

-- DropEnum
DROP TYPE "PortfolioMediaType";

-- DropEnum
DROP TYPE "RequestStatus";

-- CreateTable
CREATE TABLE "clan_messages" (
    "id" TEXT NOT NULL,
    "clanId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "messageType" TEXT NOT NULL DEFAULT 'TEXT',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clan_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clan_messages_clanId_idx" ON "clan_messages"("clanId");

-- CreateIndex
CREATE INDEX "clan_messages_createdAt_idx" ON "clan_messages"("createdAt");

-- CreateIndex
CREATE INDEX "clan_messages_messageType_idx" ON "clan_messages"("messageType");

-- CreateIndex
CREATE INDEX "clan_members_status_idx" ON "clan_members"("status");

-- CreateIndex
CREATE INDEX "clans_isActive_idx" ON "clans"("isActive");

-- CreateIndex
CREATE INDEX "clans_visibility_idx" ON "clans"("visibility");

-- CreateIndex
CREATE INDEX "clans_location_idx" ON "clans"("location");

-- AddForeignKey
ALTER TABLE "clan_messages" ADD CONSTRAINT "clan_messages_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "clans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
