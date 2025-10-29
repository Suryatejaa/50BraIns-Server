-- User Service Database Indexes for Performance Optimization
-- Apply these indexes to improve query performance for frequently accessed fields

-- Index for user lookups by ID (primary key already indexed)
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_id ON public.users(id);

-- Index for username searches (unique constraint already creates index)
-- CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_users_username ON public.users(username);

-- Index for role-based queries (frequently used in search and filtering)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_roles ON public.users USING GIN(roles);

-- Index for active user queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active_status ON public.users(is_active, status) WHERE is_active = true;

-- Index for email verification status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_verified ON public.users(email_verified) WHERE email_verified = true;

-- Composite index for search optimization (most common query pattern)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_search_active ON public.users(is_active, email_verified, last_activity_at DESC) WHERE is_active = true;

-- Index for location-based searches
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_location ON public.users(location) WHERE location IS NOT NULL;

-- Index for full-text search on user names and bio
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_search_text ON public.users USING gin(
    to_tsvector('english', 
        COALESCE(first_name, '') || ' ' || 
        COALESCE(last_name, '') || ' ' || 
        COALESCE(username, '') || ' ' || 
        COALESCE(company_name, '') || ' ' ||
        COALESCE(bio, '')
    )
);

-- Index for created_at ordering (common in pagination)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at ON public.users(created_at DESC);

-- Index for last_activity_at ordering (preferred ordering field)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_last_activity_at ON public.users(last_activity_at DESC NULLS LAST);

-- Composite index for role-specific searches with activity
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_roles_activity ON public.users USING gin(roles) INCLUDE (last_activity_at, is_active);

-- Index for public profile queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_public_profiles ON public.users(is_active, email_verified, show_contact) 
WHERE is_active = true AND email_verified = true;

-- Performance optimization: Partial indexes for specific roles
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_influencers ON public.users(last_activity_at DESC, primary_niche, primary_platform) 
WHERE 'INFLUENCER' = ANY(roles) AND is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_brands ON public.users(last_activity_at DESC, industry, company_type) 
WHERE 'BRAND' = ANY(roles) AND is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_crew ON public.users(last_activity_at DESC, experience_level, availability) 
WHERE 'CREW' = ANY(roles) AND is_active = true;

-- Index for case-insensitive username searches
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_username_lower ON public.users(lower(username));

-- Index for case-insensitive name searches
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_name_search ON public.users(lower(first_name), lower(last_name));

-- Index for analytics and dashboard queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_analytics ON public.users(created_at, last_activity_at, is_active) 
WHERE is_active = true;

-- Covering index for getUserById queries (includes most commonly accessed fields)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_profile_data ON public.users(id) 
INCLUDE (username, first_name, last_name, company_name, profile_picture, email_verified, roles, status, created_at, last_activity_at);

-- Add statistics update for better query planning
-- ANALYZE public.users;

-- Performance tips:
-- 1. Use CONCURRENTLY to avoid locking during index creation
-- 2. Monitor index usage with pg_stat_user_indexes
-- 3. Consider dropping unused indexes to improve write performance
-- 4. Regularly run ANALYZE to update table statistics

-- Query to check index usage:
-- SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch 
-- FROM pg_stat_user_indexes 
-- WHERE tablename = 'users' 
-- ORDER BY idx_tup_read DESC;