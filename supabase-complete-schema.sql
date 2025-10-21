-- 50BraIns Complete Database Schema for Supabase
-- Run this entire script in Supabase SQL Editor to create all tables for all services

-- ============================================================================
-- 0. DATABASE CLEANUP - REMOVE ALL EXISTING TABLES
-- ============================================================================

-- Disable triggers temporarily to avoid issues during cleanup
SET session_replication_role = replica;

-- Drop all existing tables in the correct order (handling foreign key dependencies)
DROP TABLE IF EXISTS social_media_snapshots CASCADE;
DROP TABLE IF EXISTS social_media_accounts CASCADE;
DROP TABLE IF EXISTS work_events CASCADE;
DROP TABLE IF EXISTS work_skill_proficiencies CASCADE;
DROP TABLE IF EXISTS work_summaries CASCADE;
DROP TABLE IF EXISTS work_achievements CASCADE;
DROP TABLE IF EXISTS work_portfolio_items CASCADE;
DROP TABLE IF EXISTS work_records CASCADE;
DROP TABLE IF EXISTS reputation_score_config CASCADE;
DROP TABLE IF EXISTS reputation_leaderboard_cache CASCADE;
DROP TABLE IF EXISTS reputation_activity_logs CASCADE;
DROP TABLE IF EXISTS reputation_score_history CASCADE;
DROP TABLE IF EXISTS reputation_clan_reputations CASCADE;
DROP TABLE IF EXISTS reputation_scores CASCADE;
DROP TABLE IF EXISTS notification_logs CASCADE;
DROP TABLE IF EXISTS notification_preferences CASCADE;
DROP TABLE IF EXISTS notification_email_templates CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS credit_payment_records CASCADE;
DROP TABLE IF EXISTS credit_packages CASCADE;
DROP TABLE IF EXISTS credit_boost_records CASCADE;
DROP TABLE IF EXISTS credit_transactions CASCADE;
DROP TABLE IF EXISTS credit_wallets CASCADE;
DROP TABLE IF EXISTS clan_messages CASCADE;
DROP TABLE IF EXISTS clan_members CASCADE;
DROP TABLE IF EXISTS clans CASCADE;
DROP TABLE IF EXISTS gig_tasks CASCADE;
DROP TABLE IF EXISTS gig_milestones CASCADE;
DROP TABLE IF EXISTS gig_assignments CASCADE;
DROP TABLE IF EXISTS gig_credit_events CASCADE;
DROP TABLE IF EXISTS gig_boost_events CASCADE;
DROP TABLE IF EXISTS gig_submissions CASCADE;
DROP TABLE IF EXISTS gig_applications CASCADE;
DROP TABLE IF EXISTS gigs CASCADE;
DROP TABLE IF EXISTS user_equipment CASCADE;
DROP TABLE IF EXISTS user_credit_events CASCADE;
DROP TABLE IF EXISTS user_boost_events CASCADE;
DROP TABLE IF EXISTS user_favorites CASCADE;
DROP TABLE IF EXISTS user_search_history CASCADE;
DROP TABLE IF EXISTS user_analytics CASCADE;
DROP TABLE IF EXISTS auth_admin_logs CASCADE;
DROP TABLE IF EXISTS auth_refresh_tokens CASCADE;
DROP TABLE IF EXISTS auth_users CASCADE;
-- Legacy tables without prefixes
DROP TABLE IF EXISTS skill_proficiencies CASCADE;
DROP TABLE IF EXISTS achievements CASCADE;
DROP TABLE IF EXISTS portfolio_items CASCADE;
DROP TABLE IF EXISTS score_config CASCADE;
DROP TABLE IF EXISTS leaderboard_cache CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS score_history CASCADE;
DROP TABLE IF EXISTS clan_reputations CASCADE;
DROP TABLE IF EXISTS reputation_scores CASCADE;
DROP TABLE IF EXISTS email_templates CASCADE;
DROP TABLE IF EXISTS payment_records CASCADE;
DROP TABLE IF EXISTS boost_records CASCADE;
DROP TABLE IF EXISTS submissions CASCADE;
DROP TABLE IF EXISTS applications CASCADE;
DROP TABLE IF EXISTS equipment CASCADE;
DROP TABLE IF EXISTS search_history CASCADE;
DROP TABLE IF EXISTS admin_logs CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop any remaining tables that might exist from previous migrations
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all remaining tables in public schema
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE 'pg_%' AND tablename NOT LIKE 'sql_%')
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
    
    -- Drop all sequences
    FOR r IN (SELECT sequencename FROM pg_sequences WHERE schemaname = 'public')
    LOOP
        EXECUTE 'DROP SEQUENCE IF EXISTS ' || quote_ident(r.sequencename) || ' CASCADE';
    END LOOP;
    
    -- Drop all views
    FOR r IN (SELECT viewname FROM pg_views WHERE schemaname = 'public')
    LOOP
        EXECUTE 'DROP VIEW IF EXISTS ' || quote_ident(r.viewname) || ' CASCADE';
    END LOOP;
    
    -- Drop all functions (except system functions)
    FOR r IN (SELECT proname, oidvectortypes(proargtypes) as argtypes 
              FROM pg_proc 
              INNER JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid 
              WHERE pg_namespace.nspname = 'public' 
              AND proname NOT LIKE 'pg_%'
              AND proname NOT LIKE 'sql_%')
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || quote_ident(r.proname) || '(' || r.argtypes || ') CASCADE';
    END LOOP;
END $$;

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- Clean up message
DO $$
BEGIN
    RAISE NOTICE '🧹 Database cleanup completed! All existing tables, sequences, views, and functions have been removed.';
    RAISE NOTICE '🔄 Starting fresh schema creation...';
END $$;

-- ============================================================================
-- 1. AUTH SERVICE TABLES
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (shared between auth-service and user-service)
CREATE TABLE IF NOT EXISTS auth_users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT,
    roles TEXT[] DEFAULT ARRAY['USER'],
    status TEXT DEFAULT 'PENDING_VERIFICATION',
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    email_verified_at TIMESTAMPTZ,
    
    -- Additional user profile fields (for user-service compatibility)
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    bio TEXT,
    location TEXT,
    profile_picture TEXT,
    cover_image TEXT,
    
    -- Social media handles
    instagram_handle TEXT,
    twitter_handle TEXT,
    linkedin_handle TEXT,
    youtube_handle TEXT,
    website TEXT,
    
    -- Role-specific fields
    content_categories TEXT[] DEFAULT ARRAY[]::TEXT[],
    primary_niche TEXT,
    primary_platform TEXT,
    estimated_followers INTEGER,
    company_name TEXT,
    company_type TEXT,
    industry TEXT,
    gst_number TEXT,
    company_website TEXT,
    marketing_budget TEXT,
    target_audience TEXT[] DEFAULT ARRAY[]::TEXT[],
    campaign_types TEXT[] DEFAULT ARRAY[]::TEXT[],
    designation_title TEXT,
    crew_skills TEXT[] DEFAULT ARRAY[]::TEXT[],
    experience_level TEXT,
    equipment_owned TEXT[] DEFAULT ARRAY[]::TEXT[],
    portfolio_url TEXT,
    hourly_rate INTEGER,
    availability TEXT,
    work_style TEXT,
    specializations TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Security
    two_factor_secret TEXT,
    two_factor_enabled BOOLEAN DEFAULT false,
    password_reset_token TEXT,
    password_reset_expires TIMESTAMPTZ,
    email_verification_token TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ban information
    is_banned BOOLEAN DEFAULT false,
    ban_reason TEXT,
    ban_expires_at TIMESTAMPTZ,
    banned_at TIMESTAMPTZ,
    banned_by TEXT,
    
    -- Privacy settings
    show_contact BOOLEAN DEFAULT false
);

-- Refresh tokens
CREATE TABLE IF NOT EXISTS auth_refresh_tokens (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    token TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address TEXT,
    user_agent TEXT
);

-- Admin logs
CREATE TABLE IF NOT EXISTS auth_admin_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    admin_id TEXT NOT NULL REFERENCES auth_users(id),
    target_id TEXT REFERENCES auth_users(id),
    action TEXT NOT NULL,
    details JSONB,
    reason TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. USER SERVICE TABLES
-- ============================================================================

-- User analytics
CREATE TABLE IF NOT EXISTS user_analytics (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT UNIQUE NOT NULL,
    profile_views INTEGER DEFAULT 0,
    search_appearances INTEGER DEFAULT 0,
    last_viewed_at TIMESTAMPTZ,
    popularity_score REAL DEFAULT 0,
    engagement_score REAL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Search history
CREATE TABLE IF NOT EXISTS user_search_history (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    search_query TEXT NOT NULL,
    search_type TEXT NOT NULL,
    filters JSONB,
    result_count INTEGER NOT NULL,
    searcher_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User favorites
CREATE TABLE IF NOT EXISTS user_favorites (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    favorite_user_id TEXT NOT NULL,
    favorite_type TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, favorite_user_id)
);

-- User boost events
CREATE TABLE IF NOT EXISTS user_boost_events (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    boost_type TEXT NOT NULL,
    booster_id TEXT NOT NULL,
    amount REAL NOT NULL,
    duration INTEGER NOT NULL,
    event_id TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User credit events
CREATE TABLE IF NOT EXISTS user_credit_events (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    amount REAL NOT NULL,
    description TEXT,
    event_id TEXT UNIQUE NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Equipment
CREATE TABLE IF NOT EXISTS user_equipment (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    brand TEXT,
    model TEXT,
    condition TEXT DEFAULT 'GOOD',
    purchase_date DATE,
    purchase_price REAL,
    current_value REAL,
    description TEXT,
    specifications JSONB,
    is_available_for_rent BOOLEAN DEFAULT false,
    daily_rent_price REAL,
    location TEXT,
    images TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. GIG SERVICE TABLES
-- ============================================================================

-- Gigs
CREATE TABLE IF NOT EXISTS gigs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    posted_by_id TEXT NOT NULL,
    posted_by_type TEXT DEFAULT 'user',
    brand_name TEXT,
    brand_username TEXT,
    brand_avatar TEXT,
    brand_verified BOOLEAN DEFAULT false,
    budget_min REAL,
    budget_max REAL,
    experience_level TEXT DEFAULT 'intermediate',
    budget_type TEXT DEFAULT 'fixed',
    role_required TEXT NOT NULL,
    skills_required TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_clan_allowed BOOLEAN DEFAULT true,
    location TEXT,
    duration TEXT,
    urgency TEXT DEFAULT 'normal',
    status TEXT NOT NULL,
    category TEXT NOT NULL,
    deliverables TEXT[] DEFAULT ARRAY[]::TEXT[],
    requirements TEXT,
    deadline TIMESTAMPTZ,
    assigned_to_id TEXT,
    assigned_to_type TEXT,
    completed_at TIMESTAMPTZ,
    gig_type TEXT DEFAULT 'REMOTE',
    address TEXT,
    latitude REAL,
    longitude REAL,
    max_applications INTEGER,
    platform_requirements TEXT[] DEFAULT ARRAY[]::TEXT[],
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    follower_requirements JSONB[] DEFAULT ARRAY[]::JSONB[],
    location_requirements TEXT[] DEFAULT ARRAY[]::TEXT[],
    campaign_duration TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Applications
CREATE TABLE IF NOT EXISTS gig_applications (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    gig_id TEXT NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
    applicant_id TEXT NOT NULL,
    applicant_type TEXT NOT NULL,
    clan_id TEXT,
    proposal TEXT,
    quoted_price REAL,
    estimated_time TEXT,
    portfolio TEXT[] DEFAULT ARRAY[]::TEXT[],
    status TEXT DEFAULT 'PENDING',
    upi_id TEXT NOT NULL,
    address TEXT,
    latitude REAL,
    longitude REAL,
    team_plan JSONB,
    milestone_plan JSONB,
    payout_split JSONB,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    rejection_reason TEXT,
    UNIQUE(applicant_id, gig_id)
);

-- Submissions
CREATE TABLE IF NOT EXISTS gig_submissions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    gig_id TEXT NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
    application_id TEXT REFERENCES gig_applications(id),
    submitted_by_id TEXT NOT NULL,
    submitted_by_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    upi_id TEXT NOT NULL,
    deliverables TEXT[] DEFAULT ARRAY[]::TEXT[],
    notes TEXT,
    status TEXT DEFAULT 'PENDING',
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    feedback TEXT,
    rating INTEGER
);

-- Gig boost events
CREATE TABLE IF NOT EXISTS gig_boost_events (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    gig_id TEXT NOT NULL,
    booster_id TEXT NOT NULL,
    amount REAL NOT NULL,
    duration INTEGER NOT NULL,
    event_id TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gig credit events
CREATE TABLE IF NOT EXISTS gig_credit_events (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    gig_id TEXT,
    user_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    amount REAL NOT NULL,
    description TEXT,
    event_id TEXT UNIQUE NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gig assignments
CREATE TABLE IF NOT EXISTS gig_assignments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    gig_id TEXT UNIQUE NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
    application_id TEXT UNIQUE REFERENCES gig_applications(id),
    assignee_type TEXT NOT NULL,
    assignee_id TEXT NOT NULL,
    clan_id TEXT,
    team_plan_snapshot JSONB,
    milestone_plan_snapshot JSONB,
    payout_split_snapshot JSONB,
    status TEXT DEFAULT 'ACTIVE',
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Gig milestones
CREATE TABLE IF NOT EXISTS gig_milestones (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    gig_id TEXT NOT NULL,
    assignment_id TEXT NOT NULL REFERENCES gig_assignments(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    due_at TIMESTAMPTZ NOT NULL,
    amount REAL NOT NULL,
    deliverables TEXT[] DEFAULT ARRAY[]::TEXT[],
    status TEXT DEFAULT 'PENDING',
    submitted_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    feedback TEXT
);

-- Gig tasks
CREATE TABLE IF NOT EXISTS gig_tasks (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    gig_id TEXT NOT NULL,
    assignment_id TEXT NOT NULL REFERENCES gig_assignments(id) ON DELETE CASCADE,
    milestone_id TEXT REFERENCES gig_milestones(id),
    title TEXT NOT NULL,
    description TEXT,
    assignee_user_id TEXT NOT NULL,
    status TEXT DEFAULT 'TODO',
    estimated_hours REAL,
    actual_hours REAL,
    deliverables TEXT[] DEFAULT ARRAY[]::TEXT[],
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. CLAN SERVICE TABLES
-- ============================================================================

-- Clans
CREATE TABLE IF NOT EXISTS clans (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    description TEXT,
    tagline TEXT,
    visibility TEXT DEFAULT 'PUBLIC',
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    email TEXT,
    website TEXT,
    instagram_handle TEXT,
    twitter_handle TEXT,
    linkedin_handle TEXT,
    requires_approval BOOLEAN DEFAULT true,
    is_paid_membership BOOLEAN DEFAULT false,
    membership_fee REAL,
    max_members INTEGER DEFAULT 255,
    primary_category TEXT DEFAULT 'General',
    categories TEXT[] DEFAULT ARRAY[]::TEXT[],
    skills TEXT[] DEFAULT ARRAY[]::TEXT[],
    location TEXT,
    timezone TEXT,
    member_count INTEGER DEFAULT 1,
    reputation_score INTEGER DEFAULT 0,
    portfolio_images TEXT[] DEFAULT ARRAY[]::TEXT[],
    portfolio_videos TEXT[] DEFAULT ARRAY[]::TEXT[],
    showcase_projects TEXT[] DEFAULT ARRAY[]::TEXT[],
    head_id TEXT NOT NULL,
    admins TEXT[] DEFAULT ARRAY[]::TEXT[],
    member_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
    pending_requests TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clan members
CREATE TABLE IF NOT EXISTS clan_members (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    clan_id TEXT NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'MEMBER',
    status TEXT DEFAULT 'ACTIVE',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, clan_id)
);

-- Clan messages
CREATE TABLE IF NOT EXISTS clan_messages (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    clan_id TEXT NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'TEXT',
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    client_message_id TEXT UNIQUE,
    is_delivered BOOLEAN DEFAULT false,
    delivered_at TIMESTAMPTZ,
    read_by JSONB[] DEFAULT ARRAY[]::JSONB[],
    read_at JSONB[] DEFAULT ARRAY[]::JSONB[],
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by TEXT
);

-- ============================================================================
-- 5. CREDIT SERVICE TABLES
-- ============================================================================

-- Credit wallets
CREATE TABLE IF NOT EXISTS credit_wallets (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    owner_id TEXT UNIQUE NOT NULL,
    owner_type TEXT NOT NULL,
    balance INTEGER DEFAULT 0,
    total_earned INTEGER DEFAULT 0,
    total_spent INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Credit transactions
CREATE TABLE IF NOT EXISTS credit_transactions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    wallet_id TEXT NOT NULL REFERENCES credit_wallets(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    amount INTEGER NOT NULL,
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    related_id TEXT,
    related_type TEXT,
    description TEXT,
    metadata JSONB,
    status TEXT DEFAULT 'COMPLETED',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Boost records
CREATE TABLE IF NOT EXISTS credit_boost_records (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    wallet_id TEXT NOT NULL REFERENCES credit_wallets(id) ON DELETE CASCADE,
    boost_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    target_type TEXT NOT NULL,
    credits_cost INTEGER NOT NULL,
    duration INTEGER NOT NULL,
    start_time TIMESTAMPTZ DEFAULT NOW(),
    end_time TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Credit packages
CREATE TABLE IF NOT EXISTS credit_packages (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    credits INTEGER NOT NULL,
    price REAL NOT NULL,
    discount REAL,
    is_active BOOLEAN DEFAULT true,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment records
CREATE TABLE IF NOT EXISTS credit_payment_records (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    package_id TEXT,
    amount REAL NOT NULL,
    credits INTEGER NOT NULL,
    payment_gateway TEXT NOT NULL,
    gateway_order_id TEXT,
    gateway_payment_id TEXT,
    status TEXT DEFAULT 'PENDING',
    payment_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 6. NOTIFICATION SERVICE TABLES
-- ============================================================================

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    read BOOLEAN DEFAULT false,
    sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    priority TEXT DEFAULT 'MEDIUM',
    channel TEXT DEFAULT 'IN_APP',
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    scheduled_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email templates
CREATE TABLE IF NOT EXISTS notification_email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    subject TEXT NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT,
    variables JSONB,
    category TEXT NOT NULL,
    language TEXT DEFAULT 'en',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT UNIQUE NOT NULL,
    email_enabled BOOLEAN DEFAULT true,
    in_app_enabled BOOLEAN DEFAULT true,
    push_enabled BOOLEAN DEFAULT true,
    sms_enabled BOOLEAN DEFAULT false,
    gig_notifications BOOLEAN DEFAULT true,
    clan_notifications BOOLEAN DEFAULT true,
    credit_notifications BOOLEAN DEFAULT true,
    system_notifications BOOLEAN DEFAULT true,
    marketing_notifications BOOLEAN DEFAULT false,
    instant_notifications BOOLEAN DEFAULT true,
    daily_digest BOOLEAN DEFAULT true,
    weekly_digest BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification logs
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id UUID NOT NULL,
    channel TEXT NOT NULL,
    status TEXT NOT NULL,
    error TEXT,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 7. REPUTATION SERVICE TABLES
-- ============================================================================

-- Create ReputationTier enum
DO $$ BEGIN
    CREATE TYPE reputation_tier AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'LEGEND');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Reputation scores
CREATE TABLE IF NOT EXISTS reputation_scores (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT UNIQUE NOT NULL,
    user_type TEXT DEFAULT 'individual',
    gigs_completed INTEGER DEFAULT 0,
    gigs_posted INTEGER DEFAULT 0,
    boosts_received INTEGER DEFAULT 0,
    boosts_given INTEGER DEFAULT 0,
    credits_spent REAL DEFAULT 0,
    credits_earned REAL DEFAULT 0,
    total_rating REAL DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    average_rating REAL DEFAULT 0,
    profile_views INTEGER DEFAULT 0,
    connections_made INTEGER DEFAULT 0,
    clan_contributions INTEGER DEFAULT 0,
    application_success REAL DEFAULT 0,
    response_time REAL DEFAULT 0,
    completion_rate REAL DEFAULT 0,
    base_score REAL DEFAULT 0,
    bonus_score REAL DEFAULT 0,
    penalty_score REAL DEFAULT 0,
    final_score REAL DEFAULT 0,
    tier reputation_tier DEFAULT 'BRONZE',
    badges TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_verified BOOLEAN DEFAULT false,
    is_suspended BOOLEAN DEFAULT false,
    admin_override REAL,
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clan reputation
CREATE TABLE IF NOT EXISTS reputation_clan_reputations (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    clan_id TEXT UNIQUE NOT NULL,
    member_count INTEGER DEFAULT 0,
    average_score REAL DEFAULT 0,
    total_gigs_completed INTEGER DEFAULT 0,
    total_revenue REAL DEFAULT 0,
    clan_boosts_received INTEGER DEFAULT 0,
    collaboration_rate REAL DEFAULT 0,
    member_retention REAL DEFAULT 0,
    clan_score REAL DEFAULT 0,
    clan_tier reputation_tier DEFAULT 'BRONZE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Score history
CREATE TABLE IF NOT EXISTS reputation_score_history (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    previous_score REAL NOT NULL,
    new_score REAL NOT NULL,
    score_delta REAL NOT NULL,
    change_reason TEXT NOT NULL,
    event_id TEXT,
    event_data JSONB,
    calculated_by TEXT DEFAULT 'system',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity logs
CREATE TABLE IF NOT EXISTS reputation_activity_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_source TEXT NOT NULL,
    event_id TEXT NOT NULL,
    score_impact REAL DEFAULT 0,
    description TEXT,
    metadata JSONB,
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leaderboard cache
CREATE TABLE IF NOT EXISTS reputation_leaderboard_cache (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    board_type TEXT NOT NULL,
    board_key TEXT NOT NULL,
    rankings JSONB NOT NULL,
    total_users INTEGER DEFAULT 0,
    valid_until TIMESTAMPTZ NOT NULL,
    last_calculated TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(board_type, board_key)
);

-- Score config
CREATE TABLE IF NOT EXISTS reputation_score_config (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    config_key TEXT UNIQUE NOT NULL,
    config_value REAL NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    updated_by TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 8. WORK HISTORY SERVICE TABLES
-- ============================================================================

-- Work records
CREATE TABLE IF NOT EXISTS work_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    gig_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    skills TEXT[] DEFAULT ARRAY[]::TEXT[],
    completed_at TIMESTAMPTZ NOT NULL,
    delivery_time INTEGER NOT NULL,
    budget_range TEXT NOT NULL,
    actual_budget REAL,
    client_rating REAL,
    client_feedback TEXT,
    on_time_delivery BOOLEAN DEFAULT false,
    within_budget BOOLEAN DEFAULT true,
    verified BOOLEAN DEFAULT false,
    verified_by TEXT,
    verification_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Portfolio items
CREATE TABLE IF NOT EXISTS work_portfolio_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_record_id UUID NOT NULL REFERENCES work_records(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    file_size INTEGER,
    format TEXT,
    is_public BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Achievements
CREATE TABLE IF NOT EXISTS work_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT,
    metric TEXT,
    value REAL,
    threshold REAL,
    icon_url TEXT,
    badge_url TEXT,
    color TEXT,
    verified BOOLEAN DEFAULT false,
    verified_by TEXT,
    achieved_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Skill proficiencies
CREATE TABLE IF NOT EXISTS work_skill_proficiencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    skill TEXT NOT NULL,
    level TEXT NOT NULL,
    score REAL NOT NULL,
    project_count INTEGER DEFAULT 0,
    total_rating REAL DEFAULT 0,
    average_rating REAL DEFAULT 0,
    last_used TIMESTAMPTZ,
    recent_projects TEXT[] DEFAULT ARRAY[]::TEXT[],
    improvement_rate REAL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, skill)
);

-- Work summaries
CREATE TABLE IF NOT EXISTS work_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT UNIQUE NOT NULL,
    total_projects INTEGER DEFAULT 0,
    active_projects INTEGER DEFAULT 0,
    completed_projects INTEGER DEFAULT 0,
    average_rating REAL DEFAULT 0,
    total_ratings INTEGER DEFAULT 0,
    five_star_count INTEGER DEFAULT 0,
    four_star_count INTEGER DEFAULT 0,
    on_time_delivery_rate REAL DEFAULT 0,
    average_delivery_time REAL DEFAULT 0,
    fastest_delivery INTEGER,
    total_earnings REAL DEFAULT 0,
    average_project_value REAL DEFAULT 0,
    highest_project_value REAL DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_completion_date TIMESTAMPTZ,
    top_skills TEXT[] DEFAULT ARRAY[]::TEXT[],
    top_categories TEXT[] DEFAULT ARRAY[]::TEXT[],
    last_active_date TIMESTAMPTZ,
    projects_this_month INTEGER DEFAULT 0,
    projects_this_year INTEGER DEFAULT 0,
    verification_level TEXT DEFAULT 'unverified',
    verified_project_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Work events
CREATE TABLE IF NOT EXISTS work_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    work_record_id TEXT,
    event_type TEXT NOT NULL,
    event_data JSONB NOT NULL,
    source TEXT NOT NULL,
    reputation_impact REAL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 9. SOCIAL MEDIA SERVICE TABLES
-- ============================================================================

-- Social media accounts
CREATE TABLE IF NOT EXISTS social_media_accounts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    username TEXT NOT NULL,
    profile_url TEXT UNIQUE NOT NULL,
    followers INTEGER DEFAULT 0,
    following INTEGER DEFAULT 0,
    posts INTEGER DEFAULT 0,
    engagement REAL,
    verified BOOLEAN DEFAULT false,
    last_synced TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, platform)
);

-- Social media snapshots
CREATE TABLE IF NOT EXISTS social_media_snapshots (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    account_id TEXT NOT NULL REFERENCES social_media_accounts(id) ON DELETE CASCADE,
    followers INTEGER NOT NULL,
    following INTEGER NOT NULL,
    posts INTEGER NOT NULL,
    engagement REAL,
    platform_metrics JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Auth service indexes
CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth_users(email);
CREATE INDEX IF NOT EXISTS idx_auth_users_username ON auth_users(username);
CREATE INDEX IF NOT EXISTS idx_auth_users_status ON auth_users(status);
CREATE INDEX IF NOT EXISTS idx_auth_refresh_tokens_user_id ON auth_refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_refresh_tokens_expires_at ON auth_refresh_tokens(expires_at);

-- User service indexes
CREATE INDEX IF NOT EXISTS idx_user_analytics_user_id ON user_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_analytics_popularity_score ON user_analytics(popularity_score);
CREATE INDEX IF NOT EXISTS idx_user_search_history_search_type ON user_search_history(search_type);
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_boost_events_user_id ON user_boost_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_boost_events_expires_at ON user_boost_events(expires_at);

-- Gig service indexes
CREATE INDEX IF NOT EXISTS idx_gigs_status ON gigs(status);
CREATE INDEX IF NOT EXISTS idx_gigs_category ON gigs(category);
CREATE INDEX IF NOT EXISTS idx_gigs_posted_by_id ON gigs(posted_by_id);
CREATE INDEX IF NOT EXISTS idx_gigs_created_at ON gigs(created_at);
CREATE INDEX IF NOT EXISTS idx_gig_applications_gig_id ON gig_applications(gig_id);
CREATE INDEX IF NOT EXISTS idx_gig_applications_applicant_id ON gig_applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_gig_applications_status ON gig_applications(status);
CREATE INDEX IF NOT EXISTS idx_gig_boost_events_gig_id ON gig_boost_events(gig_id);
CREATE INDEX IF NOT EXISTS idx_gig_boost_events_expires_at ON gig_boost_events(expires_at);

-- Clan service indexes
CREATE INDEX IF NOT EXISTS idx_clans_reputation_score ON clans(reputation_score);
CREATE INDEX IF NOT EXISTS idx_clans_visibility ON clans(visibility);
CREATE INDEX IF NOT EXISTS idx_clan_members_user_id ON clan_members(user_id);
CREATE INDEX IF NOT EXISTS idx_clan_members_clan_id ON clan_members(clan_id);
CREATE INDEX IF NOT EXISTS idx_clan_messages_clan_id ON clan_messages(clan_id);
CREATE INDEX IF NOT EXISTS idx_clan_messages_created_at ON clan_messages(created_at);

-- Credit service indexes
CREATE INDEX IF NOT EXISTS idx_credit_wallets_owner_id ON credit_wallets(owner_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_wallet_id ON credit_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_credit_boost_records_target_id ON credit_boost_records(target_id);
CREATE INDEX IF NOT EXISTS idx_credit_boost_records_end_time ON credit_boost_records(end_time);

-- Notification service indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_type_category ON notifications(type, category);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Reputation service indexes
CREATE INDEX IF NOT EXISTS idx_reputation_scores_user_id ON reputation_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_reputation_scores_final_score ON reputation_scores(final_score);
CREATE INDEX IF NOT EXISTS idx_reputation_scores_tier ON reputation_scores(tier);
CREATE INDEX IF NOT EXISTS idx_reputation_score_history_user_id ON reputation_score_history(user_id);
CREATE INDEX IF NOT EXISTS idx_reputation_activity_logs_user_id ON reputation_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_reputation_activity_logs_processed ON reputation_activity_logs(processed);

-- Work history service indexes
CREATE INDEX IF NOT EXISTS idx_work_records_user_id ON work_records(user_id);
CREATE INDEX IF NOT EXISTS idx_work_records_completed_at ON work_records(completed_at);
CREATE INDEX IF NOT EXISTS idx_work_portfolio_items_work_record_id ON work_portfolio_items(work_record_id);
CREATE INDEX IF NOT EXISTS idx_work_achievements_user_id ON work_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_work_skill_proficiencies_user_id ON work_skill_proficiencies(user_id);

-- Social media service indexes
CREATE INDEX IF NOT EXISTS idx_social_media_accounts_user_id ON social_media_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_media_accounts_platform ON social_media_accounts(platform);
CREATE INDEX IF NOT EXISTS idx_social_media_snapshots_account_id ON social_media_snapshots(account_id);

-- ============================================================================
-- ADDITIONAL SETUP
-- ============================================================================

-- Enable Row Level Security (RLS) on sensitive tables
ALTER TABLE auth_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers to tables that need them
CREATE TRIGGER update_auth_users_updated_at BEFORE UPDATE ON auth_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_analytics_updated_at BEFORE UPDATE ON user_analytics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_gigs_updated_at BEFORE UPDATE ON gigs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clans_updated_at BEFORE UPDATE ON clans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_credit_wallets_updated_at BEFORE UPDATE ON credit_wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_equipment_updated_at BEFORE UPDATE ON user_equipment FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

-- Success message
DO $$
BEGIN
    RAISE NOTICE '🎉 50BraIns Complete Database Schema Created Successfully!';
    RAISE NOTICE '📊 Total Tables Created: %', (
        SELECT COUNT(*) 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name NOT LIKE 'pg_%'
        AND table_name NOT LIKE 'sql_%'
    );
    RAISE NOTICE '🔧 All services are now ready to connect to Supabase!';
END $$;