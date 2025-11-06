-- Add file metadata columns to gigDelivery table
-- Run this in Supabase SQL Editor after running the main delivery tables script

ALTER TABLE "gigDelivery" 
ADD COLUMN IF NOT EXISTS "fileNames" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "fileSizes" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN IF NOT EXISTS "mimeTypes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add comments for clarity
COMMENT ON COLUMN "gigDelivery"."fileNames" IS 'Original file names corresponding to files array';
COMMENT ON COLUMN "gigDelivery"."fileSizes" IS 'File sizes in bytes corresponding to files array';
COMMENT ON COLUMN "gigDelivery"."mimeTypes" IS 'MIME types corresponding to files array';

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'gigDelivery' 
ORDER BY ordinal_position;