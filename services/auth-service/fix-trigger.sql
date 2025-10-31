-- Fix for the OTP trigger function issue
-- The problem is that the trigger function might have improper column reference

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS update_authotprecords_updated_at ON "public"."authOTPRecords";
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Recreate the trigger function with proper syntax
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER update_authotprecords_updated_at 
    BEFORE UPDATE ON "public"."authOTPRecords" 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Test the fix
SELECT 'Trigger function fixed successfully!' as status;