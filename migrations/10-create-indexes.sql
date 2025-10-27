-- 10-CREATE-INDEXES.sql
-- Creates all indexes for performance optimization
-- Run after all service table migrations (01-09)

-- ============================================================================
-- CREATE ALL INDEXES
-- ============================================================================

-- Disable triggers temporarily
SET session_replication_role = replica;

-- ============================================================================
-- AUTH SERVICE INDEXES
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'authRefreshTokens') THEN
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'authRefreshTokens' AND column_name = 'token') THEN
            CREATE UNIQUE INDEX IF NOT EXISTS "authRefreshTokens_token_key" ON "authRefreshTokens"("token");
        END IF;
        
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'authRefreshTokens' AND column_name = 'expiresAt') THEN
            CREATE INDEX IF NOT EXISTS "idx_auth_refresh_tokens_expires_at" ON "authRefreshTokens"("expiresAt");
        END IF;
        
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'authRefreshTokens' AND column_name = 'userId') THEN
            CREATE INDEX IF NOT EXISTS "idx_auth_refresh_tokens_user_id" ON "authRefreshTokens"("userId");
        END IF;
    END IF;
END
$$;

-- ============================================================================
-- USER SERVICE INDEXES
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'userAnalytics') THEN
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'userAnalytics' AND column_name = 'userId') THEN
            CREATE UNIQUE INDEX IF NOT EXISTS "userAnalytics_userId_key" ON "userAnalytics"("userId");
        END IF;
        
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'userAnalytics' AND column_name = 'popularityScore') THEN
            CREATE INDEX IF NOT EXISTS "userAnalytics_popularityScore_idx" ON "userAnalytics"("popularityScore");
        END IF;
        
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'userAnalytics' AND column_name = 'engagementScore') THEN
            CREATE INDEX IF NOT EXISTS "userAnalytics_engagementScore_idx" ON "userAnalytics"("engagementScore");
        END IF;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'userFavorites') THEN
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'userFavorites' AND column_name = 'userId')
           AND EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'userFavorites' AND column_name = 'favoriteUserId') THEN
            CREATE UNIQUE INDEX IF NOT EXISTS "userFavorites_userId_favoriteUserId_key" ON "userFavorites"("userId", "favoriteUserId");
        END IF;
        
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'userFavorites' AND column_name = 'userId') THEN
            CREATE INDEX IF NOT EXISTS "userFavorites_userId_idx" ON "userFavorites"("userId");
        END IF;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'userBoostEvents') THEN
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'userBoostEvents' AND column_name = 'eventId') THEN
            CREATE UNIQUE INDEX IF NOT EXISTS "userBoostEvents_eventId_key" ON "userBoostEvents"("eventId");
        END IF;
        
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'userBoostEvents' AND column_name = 'userId') THEN
            CREATE INDEX IF NOT EXISTS "userBoostEvents_userId_idx" ON "userBoostEvents"("userId");
        END IF;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'userCreditEvents') THEN
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'userCreditEvents' AND column_name = 'eventId') THEN
            CREATE UNIQUE INDEX IF NOT EXISTS "userCreditEvents_eventId_key" ON "userCreditEvents"("eventId");
        END IF;
        
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'userCreditEvents' AND column_name = 'userId') THEN
            CREATE INDEX IF NOT EXISTS "userCreditEvents_userId_idx" ON "userCreditEvents"("userId");
        END IF;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'userEquipment') THEN
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'userEquipment' AND column_name = 'userId') THEN
            CREATE INDEX IF NOT EXISTS "userEquipment_userId_idx" ON "userEquipment"("userId");
        END IF;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'userSearchHistory') THEN
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'userSearchHistory' AND column_name = 'searchType') THEN
            CREATE INDEX IF NOT EXISTS "userSearchHistory_searchType_idx" ON "userSearchHistory"("searchType");
        END IF;
        
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'userSearchHistory' AND column_name = 'createdAt') THEN
            CREATE INDEX IF NOT EXISTS "userSearchHistory_createdAt_idx" ON "userSearchHistory"("createdAt");
        END IF;
    END IF;
END
$$;

-- ============================================================================
-- GIG SERVICE INDEXES
-- ============================================================================

-- Only create indexes if tables exist
DO $$
BEGIN
    -- Gigs table indexes
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'gigs') THEN
        -- Check each column exists before creating index
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'gigs' AND column_name = 'postedById') THEN
            CREATE INDEX IF NOT EXISTS "gigs_postedById_idx" ON "gigs"("postedById");
        END IF;
        
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'gigs' AND column_name = 'status') THEN
            CREATE INDEX IF NOT EXISTS "gigs_status_idx" ON "gigs"("status");
        END IF;
        
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'gigs' AND column_name = 'category') THEN
            CREATE INDEX IF NOT EXISTS "gigs_category_idx" ON "gigs"("category");
        END IF;
        
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'gigs' AND column_name = 'gigType') THEN
            CREATE INDEX IF NOT EXISTS "gigs_gigType_idx" ON "gigs"("gigType");
        END IF;
        
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'gigs' AND column_name = 'assignedToId') THEN
            CREATE INDEX IF NOT EXISTS "gigs_assignedToId_idx" ON "gigs"("assignedToId");
        END IF;
    END IF;

    -- Applications table indexes
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'applications') THEN
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'applications' AND column_name = 'applicantId') 
           AND EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'applications' AND column_name = 'gigId') THEN
            CREATE UNIQUE INDEX IF NOT EXISTS "applications_applicantId_gigId_key" ON "applications"("applicantId", "gigId");
        END IF;
        
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'applications' AND column_name = 'gigId') THEN
            CREATE INDEX IF NOT EXISTS "applications_gigId_idx" ON "applications"("gigId");
        END IF;
        
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'applications' AND column_name = 'status') THEN
            CREATE INDEX IF NOT EXISTS "applications_status_idx" ON "applications"("status");
        END IF;
    END IF;

    -- Submissions table indexes
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'submissions') THEN
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'gigId') THEN
            CREATE INDEX IF NOT EXISTS "submissions_gigId_idx" ON "submissions"("gigId");
        END IF;
        
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'applicationId') THEN
            CREATE INDEX IF NOT EXISTS "submissions_applicationId_idx" ON "submissions"("applicationId");
        END IF;
        
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'status') THEN
            CREATE INDEX IF NOT EXISTS "submissions_status_idx" ON "submissions"("status");
        END IF;
    END IF;
END
$$;

-- Other gig service table indexes
DO $$
BEGIN
    -- GigBoostEvents table indexes
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'gigBoostEvents') THEN
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'gigBoostEvents' AND column_name = 'eventId') THEN
            CREATE UNIQUE INDEX IF NOT EXISTS "gigBoostEvents_eventId_key" ON "gigBoostEvents"("eventId");
        END IF;
        
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'gigBoostEvents' AND column_name = 'gigId') THEN
            CREATE INDEX IF NOT EXISTS "gigBoostEvents_gigId_idx" ON "gigBoostEvents"("gigId");
        END IF;
        
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'gigBoostEvents' AND column_name = 'isActive') THEN
            CREATE INDEX IF NOT EXISTS "gigBoostEvents_isActive_idx" ON "gigBoostEvents"("isActive");
        END IF;
        
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'gigBoostEvents' AND column_name = 'expiresAt') THEN
            CREATE INDEX IF NOT EXISTS "gigBoostEvents_expiresAt_idx" ON "gigBoostEvents"("expiresAt");
        END IF;
    END IF;

    -- GigCreditEvents table indexes
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'gigCreditEvents') THEN
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'gigCreditEvents' AND column_name = 'eventId') THEN
            CREATE UNIQUE INDEX IF NOT EXISTS "gigCreditEvents_eventId_key" ON "gigCreditEvents"("eventId");
        END IF;
        
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'gigCreditEvents' AND column_name = 'gigId') THEN
            CREATE INDEX IF NOT EXISTS "gigCreditEvents_gigId_idx" ON "gigCreditEvents"("gigId");
        END IF;
        
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'gigCreditEvents' AND column_name = 'userId') THEN
            CREATE INDEX IF NOT EXISTS "gigCreditEvents_userId_idx" ON "gigCreditEvents"("userId");
        END IF;
        
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'gigCreditEvents' AND column_name = 'eventType') THEN
            CREATE INDEX IF NOT EXISTS "gigCreditEvents_eventType_idx" ON "gigCreditEvents"("eventType");
        END IF;
    END IF;

    -- GigAssignments table indexes
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'gigAssignments') THEN
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'gigAssignments' AND column_name = 'gigId') THEN
            CREATE UNIQUE INDEX IF NOT EXISTS "gigAssignments_gigId_key" ON "gigAssignments"("gigId");
        END IF;
        
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'gigAssignments' AND column_name = 'applicationId') THEN
            CREATE UNIQUE INDEX IF NOT EXISTS "gigAssignments_applicationId_key" ON "gigAssignments"("applicationId");
        END IF;
        
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'gigAssignments' AND column_name = 'assigneeId') THEN
            CREATE INDEX IF NOT EXISTS "gigAssignments_assigneeId_idx" ON "gigAssignments"("assigneeId");
        END IF;
        
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'gigAssignments' AND column_name = 'status') THEN
            CREATE INDEX IF NOT EXISTS "gigAssignments_status_idx" ON "gigAssignments"("status");
        END IF;
    END IF;

    -- GigMilestones table indexes
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'gigMilestones') THEN
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'gigMilestones' AND column_name = 'assignmentId') THEN
            CREATE INDEX IF NOT EXISTS "gigMilestones_assignmentId_idx" ON "gigMilestones"("assignmentId");
        END IF;
        
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'gigMilestones' AND column_name = 'status') THEN
            CREATE INDEX IF NOT EXISTS "gigMilestones_status_idx" ON "gigMilestones"("status");
        END IF;
        
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'gigMilestones' AND column_name = 'dueAt') THEN
            CREATE INDEX IF NOT EXISTS "gigMilestones_dueAt_idx" ON "gigMilestones"("dueAt");
        END IF;
    END IF;

    -- GigTasks table indexes
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'gigTasks') THEN
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'gigTasks' AND column_name = 'assignmentId') THEN
            CREATE INDEX IF NOT EXISTS "gigTasks_assignmentId_idx" ON "gigTasks"("assignmentId");
        END IF;
        
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'gigTasks' AND column_name = 'milestoneId') THEN
            CREATE INDEX IF NOT EXISTS "gigTasks_milestoneId_idx" ON "gigTasks"("milestoneId");
        END IF;
        
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'gigTasks' AND column_name = 'assigneeUserId') THEN
            CREATE INDEX IF NOT EXISTS "gigTasks_assigneeUserId_idx" ON "gigTasks"("assigneeUserId");
        END IF;
        
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'gigTasks' AND column_name = 'status') THEN
            CREATE INDEX IF NOT EXISTS "gigTasks_status_idx" ON "gigTasks"("status");
        END IF;
    END IF;

    -- ApplicationWorkHistory table indexes
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'application_work_history') THEN
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'application_work_history' AND column_name = 'applicationId') THEN
            CREATE UNIQUE INDEX IF NOT EXISTS "application_work_history_applicationId_key" ON "application_work_history"("applicationId");
        END IF;
        
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'application_work_history' AND column_name = 'applicantId') THEN
            CREATE INDEX IF NOT EXISTS "application_work_history_applicantId_idx" ON "application_work_history"("applicantId");
        END IF;
        
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'application_work_history' AND column_name = 'gigOwnerId') THEN
            CREATE INDEX IF NOT EXISTS "application_work_history_gigOwnerId_idx" ON "application_work_history"("gigOwnerId");
        END IF;
        
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'application_work_history' AND column_name = 'gigId') THEN
            CREATE INDEX IF NOT EXISTS "application_work_history_gigId_idx" ON "application_work_history"("gigId");
        END IF;
        
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'application_work_history' AND column_name = 'applicationStatus') THEN
            CREATE INDEX IF NOT EXISTS "application_work_history_applicationStatus_idx" ON "application_work_history"("applicationStatus");
        END IF;
        
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'application_work_history' AND column_name = 'paymentStatus') THEN
            CREATE INDEX IF NOT EXISTS "application_work_history_paymentStatus_idx" ON "application_work_history"("paymentStatus");
        END IF;
    END IF;

    -- CampaignHistory table indexes
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'campaign_history') THEN
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'campaign_history' AND column_name = 'gigId') THEN
            CREATE UNIQUE INDEX IF NOT EXISTS "campaign_history_gigId_key" ON "campaign_history"("gigId");
        END IF;
        
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'campaign_history' AND column_name = 'brandId') THEN
            CREATE INDEX IF NOT EXISTS "campaign_history_brandId_idx" ON "campaign_history"("brandId");
        END IF;
        
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'campaign_history' AND column_name = 'status') THEN
            CREATE INDEX IF NOT EXISTS "campaign_history_status_idx" ON "campaign_history"("status");
        END IF;
        
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'campaign_history' AND column_name = 'createdAt') THEN
            CREATE INDEX IF NOT EXISTS "campaign_history_createdAt_idx" ON "campaign_history"("createdAt");
        END IF;
    END IF;
END
$$;

-- ============================================================================
-- CLAN SERVICE INDEXES
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'clans') THEN
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'clans' AND column_name = 'reputationScore') THEN
            CREATE INDEX IF NOT EXISTS "clans_reputationScore_idx" ON "clans"("reputationScore");
        END IF;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'clanMembers') THEN
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'clanMembers' AND column_name = 'userId')
           AND EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'clanMembers' AND column_name = 'clanId') THEN
            CREATE UNIQUE INDEX IF NOT EXISTS "clanMembers_userId_clanId_key" ON "clanMembers"("userId", "clanId");
        END IF;
    END IF;
END
$$;

-- ============================================================================
-- CREDIT SERVICE INDEXES
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'creditWallets') THEN
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'creditWallets' AND column_name = 'ownerId') THEN
            CREATE UNIQUE INDEX IF NOT EXISTS "creditWallets_ownerId_key" ON "creditWallets"("ownerId");
        END IF;
    END IF;
END
$$;

-- ============================================================================
-- NOTIFICATION SERVICE INDEXES
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications') THEN
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'userId') THEN
            CREATE INDEX IF NOT EXISTS "notifications_userId_idx" ON "notifications"("userId");
        END IF;
        
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'type') THEN
            CREATE INDEX IF NOT EXISTS "notifications_type_idx" ON "notifications"("type");
        END IF;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notificationEmailTemplates') THEN
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notificationEmailTemplates' AND column_name = 'name') THEN
            CREATE UNIQUE INDEX IF NOT EXISTS "notificationEmailTemplates_name_key" ON "notificationEmailTemplates"("name");
        END IF;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notificationPreferences') THEN
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notificationPreferences' AND column_name = 'userId') THEN
            CREATE UNIQUE INDEX IF NOT EXISTS "notificationPreferences_userId_key" ON "notificationPreferences"("userId");
        END IF;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notificationLogs') THEN
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notificationLogs' AND column_name = 'notificationId') THEN
            CREATE INDEX IF NOT EXISTS "notificationLogs_notificationId_idx" ON "notificationLogs"("notificationId");
        END IF;
    END IF;
END
$$;

-- ============================================================================
-- REPUTATION SERVICE INDEXES
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'reputationScores') THEN
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'reputationScores' AND column_name = 'userId') THEN
            CREATE UNIQUE INDEX IF NOT EXISTS "reputationScores_userId_key" ON "reputationScores"("userId");
        END IF;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'reputationClanReputations') THEN
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'reputationClanReputations' AND column_name = 'clanId') THEN
            CREATE UNIQUE INDEX IF NOT EXISTS "reputationClanReputations_clanId_key" ON "reputationClanReputations"("clanId");
        END IF;
    END IF;
END
$$;

-- ============================================================================
-- WORK HISTORY SERVICE INDEXES
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'workRecords') THEN
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'workRecords' AND column_name = 'userId') THEN
            CREATE INDEX IF NOT EXISTS "workRecords_userId_idx" ON "workRecords"("userId");
        END IF;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'workAchievements') THEN
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'workAchievements' AND column_name = 'user_id') THEN
            CREATE INDEX IF NOT EXISTS "workAchievements_user_id_idx" ON "workAchievements"("user_id");
        END IF;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'workSummaries') THEN
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'workSummaries' AND column_name = 'userId') THEN
            CREATE UNIQUE INDEX IF NOT EXISTS "workSummaries_userId_key" ON "workSummaries"("userId");
        END IF;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'workSkillProficiencies') THEN
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'workSkillProficiencies' AND column_name = 'user_id')
           AND EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'workSkillProficiencies' AND column_name = 'skill') THEN
            CREATE UNIQUE INDEX IF NOT EXISTS "workSkillProficiencies_user_id_skill_key" ON "workSkillProficiencies"("user_id", "skill");
        END IF;
    END IF;
END
$$;

-- ============================================================================
-- SOCIAL MEDIA SERVICE INDEXES
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'socialMediaAccounts') THEN
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'socialMediaAccounts' AND column_name = 'userId') THEN
            CREATE INDEX IF NOT EXISTS "socialMediaAccounts_userId_idx" ON "socialMediaAccounts"("userId");
        END IF;
        
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'socialMediaAccounts' AND column_name = 'userId')
           AND EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'socialMediaAccounts' AND column_name = 'platform') THEN
            CREATE UNIQUE INDEX IF NOT EXISTS "socialMediaAccounts_userId_platform_key" ON "socialMediaAccounts"("userId", "platform");
        END IF;
    END IF;
END
$$;

-- Re-enable triggers
SET session_replication_role = DEFAULT;

SELECT 'SUCCESS: All indexes created!' as result;