/*
  Warnings:

  - You are about to drop the column `budget` on the `gigs` table. All the data in the column will be lost.
  - Added the required column `experienceLevel` to the `gigs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "gigs" DROP COLUMN "budget",
ADD COLUMN     "budgetMax" DOUBLE PRECISION,
ADD COLUMN     "budgetMin" DOUBLE PRECISION,
ADD COLUMN     "experienceLevel" TEXT NOT NULL;
