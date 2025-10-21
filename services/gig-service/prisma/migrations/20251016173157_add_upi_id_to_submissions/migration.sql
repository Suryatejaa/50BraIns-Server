-- AddRequiredSubmissionUpiId
-- Add upiId column to submissions table
-- Handle existing records by adding column as nullable first, then updating, then making required

-- Step 1: Add the column as nullable
ALTER TABLE "submissions" ADD COLUMN "upiId" TEXT;

-- Step 2: Update existing records with placeholder values (if any exist)
UPDATE "submissions" SET "upiId" = 'placeholder@upi' WHERE "upiId" IS NULL;

-- Step 3: Make the column required
ALTER TABLE "submissions" ALTER COLUMN "upiId" SET NOT NULL;