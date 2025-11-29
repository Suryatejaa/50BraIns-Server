-- Fix roles array update in Supabase
-- PostgreSQL requires proper array literal syntax

-- Option 1: Update all users to have all roles (if that's what you want)
UPDATE public."authUsers" 
SET roles = ARRAY['USER','BRAND','ADMIN','SUPER_ADMIN','MODERATOR','INFLUENCER','CREW'];

-- Option 2: Update specific user by email
-- UPDATE public."authUsers" 
-- SET roles = ARRAY['USER','BRAND','ADMIN','SUPER_ADMIN','MODERATOR','INFLUENCER','CREW']
-- WHERE email = 'your-email@example.com';

-- Option 3: Update specific user by id
-- UPDATE public."authUsers" 
-- SET roles = ARRAY['USER','BRAND','ADMIN','SUPER_ADMIN','MODERATOR','INFLUENCER','CREW']
-- WHERE id = 'your-user-id';

-- Option 4: Add roles to existing roles (append)
-- UPDATE public."authUsers" 
-- SET roles = array_cat(roles, ARRAY['BRAND','ADMIN','SUPER_ADMIN','MODERATOR','INFLUENCER','CREW'])
-- WHERE email = 'your-email@example.com';

-- Option 5: Set roles for admin users only
-- UPDATE public."authUsers" 
-- SET roles = ARRAY['USER','BRAND','ADMIN','SUPER_ADMIN','MODERATOR','INFLUENCER','CREW']
-- WHERE 'ADMIN' = ANY(roles);

-- Verify the update (optional)
-- SELECT id, email, username, roles FROM public."authUsers" LIMIT 10;