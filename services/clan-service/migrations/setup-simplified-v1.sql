-- Simplified Clan Service V1 Database Setup
-- This creates the essential tables for V1 clan functionality

-- Drop existing clan tables if they exist
DROP TABLE IF EXISTS clan_messages CASCADE;
DROP TABLE IF EXISTS clan_members CASCADE;
DROP TABLE IF EXISTS clans CASCADE;

-- Create clans table with all frontend-required fields
CREATE TABLE clans (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    description TEXT,
    tagline TEXT,
    visibility TEXT NOT NULL DEFAULT 'PUBLIC',
    is_verified BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    email TEXT,
    website TEXT,
    instagram_handle TEXT,
    twitter_handle TEXT,
    linkedin_handle TEXT,
    requires_approval BOOLEAN NOT NULL DEFAULT true,
    is_paid_membership BOOLEAN NOT NULL DEFAULT false,
    membership_fee DECIMAL(10,2),
    max_members INTEGER NOT NULL DEFAULT 50,
    primary_category TEXT NOT NULL DEFAULT 'General',
    categories TEXT[] DEFAULT '{}',
    skills TEXT[] DEFAULT '{}',
    location TEXT,
    timezone TEXT,
    member_count INTEGER NOT NULL DEFAULT 1,
    reputation_score INTEGER NOT NULL DEFAULT 0,
    portfolio_images TEXT[] DEFAULT '{}',
    portfolio_videos TEXT[] DEFAULT '{}',
    showcase_projects TEXT[] DEFAULT '{}',
    clan_head_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create clan_members table
CREATE TABLE clan_members (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    clan_id TEXT NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'MEMBER',
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, clan_id)
);

-- Create clan_messages table
CREATE TABLE clan_messages (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    clan_id TEXT NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'TEXT',
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_clans_reputation_score ON clans(reputation_score);
CREATE INDEX idx_clans_primary_category ON clans(primary_category);
CREATE INDEX idx_clans_is_active ON clans(is_active);
CREATE INDEX idx_clans_visibility ON clans(visibility);
CREATE INDEX idx_clans_location ON clans(location);

CREATE INDEX idx_clan_members_user_id ON clan_members(user_id);
CREATE INDEX idx_clan_members_clan_id ON clan_members(clan_id);
CREATE INDEX idx_clan_members_status ON clan_members(status);

CREATE INDEX idx_clan_messages_clan_id ON clan_messages(clan_id);
CREATE INDEX idx_clan_messages_created_at ON clan_messages(created_at);
CREATE INDEX idx_clan_messages_message_type ON clan_messages(message_type);

-- Insert sample data for testing
INSERT INTO clans (id, name, description, tagline, primary_category, clan_head_id, member_count, reputation_score, visibility, is_verified) VALUES
('clan_1', 'Web Warriors', 'A group of web developers helping each other find gigs', 'Code. Create. Collaborate.', 'Web Development', 'user_1', 1, 0, 'PUBLIC', false),
('clan_2', 'Design Masters', 'Creative designers sharing opportunities', 'Design with purpose', 'Design', 'user_2', 1, 0, 'PUBLIC', false),
('clan_3', 'Mobile Devs', 'Mobile app developers community', 'Building the future, one app at a time', 'Mobile Development', 'user_3', 1, 0, 'PUBLIC', false);

-- Insert sample members
INSERT INTO clan_members (user_id, clan_id, role, status) VALUES
('user_1', 'clan_1', 'OWNER', 'ACTIVE'),
('user_2', 'clan_2', 'OWNER', 'ACTIVE'),
('user_3', 'clan_3', 'OWNER', 'ACTIVE');

-- Insert sample messages
INSERT INTO clan_messages (clan_id, user_id, content, message_type) VALUES
('clan_1', 'user_1', 'Welcome to Web Warriors! Let''s help each other find great gigs.', 'TEXT'),
('clan_2', 'user_2', 'Design Masters is now open for business!', 'TEXT'),
('clan_3', 'user_3', 'Mobile developers unite! 🚀', 'TEXT');

COMMIT;
