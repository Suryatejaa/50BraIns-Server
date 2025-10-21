-- AlterTable
ALTER TABLE "gigs" ADD COLUMN     "brandAvatar" TEXT,
ADD COLUMN     "brandName" TEXT,
ADD COLUMN     "brandUsername" TEXT,
ADD COLUMN     "brandVerified" BOOLEAN NOT NULL DEFAULT false;
