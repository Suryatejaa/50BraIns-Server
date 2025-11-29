-- URGENT ROLLBACK: Remove ONLY admin roles while preserving legitimate roles
-- This will keep USER + BRAND/INFLUENCER/CREW combinations intact

-- IMMEDIATE ROLLBACK - Run this NOW in production:
-- Remove only ADMIN, SUPER_ADMIN, MODERATOR from roles arrays
UPDATE public."authUsers" 
SET roles = array_remove(array_remove(array_remove(roles, 'ADMIN'), 'SUPER_ADMIN'), 'MODERATOR')
WHERE 'ADMIN' = ANY(roles) OR 'SUPER_ADMIN' = ANY(roles) OR 'MODERATOR' = ANY(roles);

-- Alternative: Reset ALL users to just USER role (safer approach)
-- UPDATE public."authUsers" 
-- SET roles = ARRAY['USER'];

-- Then manually grant admin roles ONLY to specific admin users:
-- Replace 'admin@yourdomain.com' with actual admin email addresses

-- Example: Set admin roles for specific admin users
-- UPDATE public."authUsers" 
-- SET roles = ARRAY['USER','ADMIN','SUPER_ADMIN','MODERATOR']
-- WHERE email IN (
--   'admin1@yourdomain.com',
--   'admin2@yourdomain.com',
--   'superadmin@yourdomain.com'
-- );

-- Example: Set brand roles for specific brand users
-- UPDATE public."authUsers" 
-- SET roles = ARRAY['USER','BRAND']
-- WHERE email IN (
--   'brand1@yourdomain.com',
--   'brand2@yourdomain.com'
-- );

-- Example: Set influencer roles for specific influencer users
-- UPDATE public."authUsers" 
-- SET roles = ARRAY['USER','INFLUENCER']
-- WHERE email IN (
--   'influencer1@yourdomain.com',
--   'influencer2@yourdomain.com'
-- );

-- Example: Set crew roles for specific crew users
-- UPDATE public."authUsers" 
-- SET roles = ARRAY['USER','CREW']
-- WHERE email IN (
--   'crew1@yourdomain.com',
--   'crew2@yourdomain.com'
-- );

-- Verify the rollback worked:
-- SELECT email, username, roles FROM public."authUsers" 
-- WHERE 'ADMIN' = ANY(roles) OR 'SUPER_ADMIN' = ANY(roles) OR 'MODERATOR' = ANY(roles);