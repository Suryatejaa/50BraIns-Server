-- 11-CREATE-FOREIGN-KEYS.sql
-- Creates all foreign key constraints
-- Run after all service table migrations and indexes (01-10)

-- ============================================================================
-- CREATE ALL FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Disable triggers temporarily
SET session_replication_role = replica;

-- ============================================================================
-- AUTH SERVICE FOREIGN KEYS
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'authRefreshTokens_userId_fkey') THEN
        ALTER TABLE "authRefreshTokens" ADD CONSTRAINT "authRefreshTokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "authUsers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'authAdminLogs_adminId_fkey') THEN
        ALTER TABLE "authAdminLogs" ADD CONSTRAINT "authAdminLogs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "authUsers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
    END IF;
END $$;

-- ============================================================================
-- USER SERVICE FOREIGN KEYS
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'userEquipment_userId_fkey') THEN
        ALTER TABLE "userEquipment" ADD CONSTRAINT "userEquipment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "authUsers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================================================
-- GIG SERVICE FOREIGN KEYS
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applications_gigId_fkey') THEN
        ALTER TABLE "applications" ADD CONSTRAINT "applications_gigId_fkey" FOREIGN KEY ("gigId") REFERENCES "gigs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'submissions_gigId_fkey') THEN
        ALTER TABLE "submissions" ADD CONSTRAINT "submissions_gigId_fkey" FOREIGN KEY ("gigId") REFERENCES "gigs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gigAssignments_gigId_fkey') THEN
        ALTER TABLE "gigAssignments" ADD CONSTRAINT "gigAssignments_gigId_fkey" FOREIGN KEY ("gigId") REFERENCES "gigs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gigMilestones_assignmentId_fkey') THEN
        ALTER TABLE "gigMilestones" ADD CONSTRAINT "gigMilestones_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "gigAssignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gigTasks_assignmentId_fkey') THEN
        ALTER TABLE "gigTasks" ADD CONSTRAINT "gigTasks_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "gigAssignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'application_work_history_applicationId_fkey') THEN
        ALTER TABLE "application_work_history" ADD CONSTRAINT "application_work_history_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'application_work_history_gigId_fkey') THEN
        ALTER TABLE "application_work_history" ADD CONSTRAINT "application_work_history_gigId_fkey" FOREIGN KEY ("gigId") REFERENCES "gigs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'campaign_history_gigId_fkey') THEN
        ALTER TABLE "campaign_history" ADD CONSTRAINT "campaign_history_gigId_fkey" FOREIGN KEY ("gigId") REFERENCES "gigs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================================================
-- CLAN SERVICE FOREIGN KEYS
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clanMembers_clanId_fkey') THEN
        ALTER TABLE "clanMembers" ADD CONSTRAINT "clanMembers_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "clans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clanMessages_clanId_fkey') THEN
        ALTER TABLE "clanMessages" ADD CONSTRAINT "clanMessages_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "clans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================================================
-- CREDIT SERVICE FOREIGN KEYS
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'creditTransactions_walletId_fkey') THEN
        ALTER TABLE "creditTransactions" ADD CONSTRAINT "creditTransactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "creditWallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'creditBoostRecords_walletId_fkey') THEN
        ALTER TABLE "creditBoostRecords" ADD CONSTRAINT "creditBoostRecords_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "creditWallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================================================
-- WORK HISTORY SERVICE FOREIGN KEYS
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workPortfolioItems_workRecordId_fkey') THEN
        ALTER TABLE "workPortfolioItems" ADD CONSTRAINT "workPortfolioItems_workRecordId_fkey" FOREIGN KEY ("workRecordId") REFERENCES "workRecords"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================================================
-- SOCIAL MEDIA SERVICE FOREIGN KEYS
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'socialMediaSnapshots_accountId_fkey') THEN
        ALTER TABLE "socialMediaSnapshots" ADD CONSTRAINT "socialMediaSnapshots_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "socialMediaAccounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================================================
-- NOTIFICATION SERVICE FOREIGN KEYS
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notificationLogs_notificationId_fkey') THEN
        ALTER TABLE "notificationLogs" ADD CONSTRAINT "notificationLogs_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Re-enable triggers
SET session_replication_role = DEFAULT;

SELECT 'SUCCESS: All foreign key constraints created!' as result;