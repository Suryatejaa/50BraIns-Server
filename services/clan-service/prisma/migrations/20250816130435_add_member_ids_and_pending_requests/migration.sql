-- AlterTable
ALTER TABLE "clans" ADD COLUMN     "memberIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "pendingRequests" TEXT[] DEFAULT ARRAY[]::TEXT[];
