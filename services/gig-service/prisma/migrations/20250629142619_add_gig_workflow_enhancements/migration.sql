/*
  Warnings:

  - You are about to drop the column `files` on the `submissions` table. All the data in the column will be lost.
  - You are about to drop the column `submitterId` on the `submissions` table. All the data in the column will be lost.
  - You are about to drop the column `submitterType` on the `submissions` table. All the data in the column will be lost.
  - Added the required column `submittedById` to the `submissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `submittedByType` to the `submissions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "rejectionReason" TEXT;

-- AlterTable
ALTER TABLE "submissions" DROP COLUMN "files",
DROP COLUMN "submitterId",
DROP COLUMN "submitterType",
ADD COLUMN     "applicationId" TEXT,
ADD COLUMN     "deliverables" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "rating" INTEGER,
ADD COLUMN     "submittedById" TEXT NOT NULL,
ADD COLUMN     "submittedByType" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
