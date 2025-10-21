/*
  Warnings:

  - Added the required column `upiId` to the `applications` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable - Add column as nullable first
ALTER TABLE "applications" ADD COLUMN "upiId" TEXT;

-- Update existing records with a placeholder UPI ID
UPDATE "applications" SET "upiId" = 'placeholder@upi' WHERE "upiId" IS NULL;

-- Make the column NOT NULL after updating existing records
ALTER TABLE "applications" ALTER COLUMN "upiId" SET NOT NULL;
