-- PRODUCTION SAFETY MEASURES FOR DATABASE OPERATIONS
-- Use these patterns to prevent catastrophic mistakes

-- 1. ALWAYS USE WHERE CLAUSES - Never run mass updates without WHERE
-- ❌ BAD: UPDATE users SET roles = ARRAY['ADMIN'];
-- ✅ GOOD: UPDATE users SET roles = ARRAY['ADMIN'] WHERE email = 'specific-user@domain.com';

-- 2. WRAP CRITICAL OPERATIONS IN TRANSACTIONS WITH ROLLBACK SAFETY
BEGIN;

-- Test your WHERE clause first with SELECT
SELECT id, email, username, roles 
FROM public."authUsers" 
WHERE email = 'admin@yourdomain.com';
-- ^ Verify this returns ONLY the users you want to modify

-- If the SELECT looks correct, then run the UPDATE
-- UPDATE public."authUsers" 
-- SET roles = ARRAY['USER','ADMIN','SUPER_ADMIN','MODERATOR']
-- WHERE email = 'admin@yourdomain.com';

-- Check the results before committing
-- SELECT id, email, username, roles 
-- FROM public."authUsers" 
-- WHERE email = 'admin@yourdomain.com';

-- If everything looks correct:
-- COMMIT;
-- If something went wrong:
ROLLBACK;

-- 3. USE STAGED ENVIRONMENTS
-- Always test dangerous operations in staging first:
-- staging -> test with real-like data -> then production

-- 4. CREATE BACKUPS BEFORE MAJOR OPERATIONS
-- pg_dump specific tables before mass updates:
-- pg_dump -h your-host -U your-user -t authUsers your-database > backup_authUsers_$(date +%Y%m%d_%H%M%S).sql

-- 5. USE LIMIT AND SPECIFIC CONDITIONS FOR TESTING
-- Test on small subset first:
-- UPDATE public."authUsers" 
-- SET roles = ARRAY['USER','ADMIN']
-- WHERE email = 'test-admin@domain.com' 
-- LIMIT 1;

-- 6. IMPLEMENT ROLE VALIDATION FUNCTIONS
CREATE OR REPLACE FUNCTION validate_user_roles(user_roles text[])
RETURNS boolean AS $$
BEGIN
    -- Prevent giving everyone admin roles
    IF array_length(user_roles, 1) > 3 THEN
        RAISE EXCEPTION 'Too many roles assigned. Maximum 3 roles allowed.';
    END IF;
    
    -- Prevent BRAND + INFLUENCER conflict
    IF 'BRAND' = ANY(user_roles) AND 'INFLUENCER' = ANY(user_roles) THEN
        RAISE EXCEPTION 'BRAND and INFLUENCER roles cannot be combined.';
    END IF;
    
    -- Ensure USER is always present
    IF NOT ('USER' = ANY(user_roles)) THEN
        RAISE EXCEPTION 'USER role must always be present.';
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 7. CREATE ADMIN ROLE ASSIGNMENT FUNCTION (SAFER)
CREATE OR REPLACE FUNCTION assign_admin_roles(user_email text, admin_roles text[])
RETURNS void AS $$
DECLARE
    user_count integer;
    current_roles text[];
BEGIN
    -- Check if user exists
    SELECT COUNT(*), roles INTO user_count, current_roles
    FROM public."authUsers" 
    WHERE email = user_email;
    
    IF user_count = 0 THEN
        RAISE EXCEPTION 'User with email % not found', user_email;
    END IF;
    
    IF user_count > 1 THEN
        RAISE EXCEPTION 'Multiple users found with email %. Database integrity issue.', user_email;
    END IF;
    
    -- Validate roles
    PERFORM validate_user_roles(admin_roles);
    
    -- Log the change (you should create an audit table)
    RAISE NOTICE 'Updating roles for %: % -> %', user_email, current_roles, admin_roles;
    
    -- Update the user
    UPDATE public."authUsers" 
    SET roles = admin_roles
    WHERE email = user_email;
    
    RAISE NOTICE 'Successfully updated roles for %', user_email;
END;
$$ LANGUAGE plpgsql;

-- 8. SAFE ADMIN ASSIGNMENT EXAMPLES:
-- SELECT assign_admin_roles('admin@yourdomain.com', ARRAY['USER','ADMIN','SUPER_ADMIN','MODERATOR']);
-- SELECT assign_admin_roles('brand@yourdomain.com', ARRAY['USER','BRAND']);

-- 9. CREATE EMERGENCY ROLLBACK FUNCTION
CREATE OR REPLACE FUNCTION emergency_role_rollback()
RETURNS void AS $$
BEGIN
    -- Remove admin roles from all users except specific admin emails
    UPDATE public."authUsers" 
    SET roles = ARRAY['USER']
    WHERE NOT (email = ANY(ARRAY[
        'your-admin-1@domain.com',
        'your-admin-2@domain.com',
        'your-super-admin@domain.com'
    ]))
    AND ('ADMIN' = ANY(roles) OR 'SUPER_ADMIN' = ANY(roles) OR 'MODERATOR' = ANY(roles));
    
    RAISE NOTICE 'Emergency rollback completed. Admin roles removed from non-admin users.';
END;
$$ LANGUAGE plpgsql;

-- 10. MONITORING QUERY - Run this regularly to detect anomalies
-- SELECT 
--     COUNT(*) as total_users,
--     COUNT(*) FILTER (WHERE 'ADMIN' = ANY(roles)) as admin_users,
--     COUNT(*) FILTER (WHERE 'SUPER_ADMIN' = ANY(roles)) as super_admin_users,
--     COUNT(*) FILTER (WHERE 'MODERATOR' = ANY(roles)) as moderator_users,
--     COUNT(*) FILTER (WHERE array_length(roles, 1) > 3) as users_with_too_many_roles
-- FROM public."authUsers";