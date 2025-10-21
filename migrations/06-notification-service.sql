-- 06-NOTIFICATION-SERVICE.sql
-- Notification Service Migration - Creates notification service tables
-- Run after: 00-create-enums.sql

-- ============================================================================
-- NOTIFICATION SERVICE TABLES
-- ============================================================================

-- Disable triggers temporarily
SET session_replication_role = replica;

-- Drop existing tables in reverse dependency order
DROP TABLE IF EXISTS "notificationLogs";
DROP TABLE IF EXISTS "notificationPreferences";
DROP TABLE IF EXISTS "notificationEmailTemplates";
DROP TABLE IF EXISTS "notifications";

CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "status" "NotificationStatus" DEFAULT 'SENT',
    "readAt" TIMESTAMPTZ(6),
    "actionUrl" TEXT,
    "metadata" JSONB,
    "relatedId" TEXT,
    "relatedType" TEXT,
    "priority" INTEGER DEFAULT 1,
    "expiresAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notificationEmailTemplates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "bodyText" TEXT,
    "variables" TEXT[] DEFAULT ARRAY[]::"text"[],
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificationEmailTemplates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notificationPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailNotifications" BOOLEAN DEFAULT true,
    "pushNotifications" BOOLEAN DEFAULT true,
    "gigUpdates" BOOLEAN DEFAULT true,
    "clanUpdates" BOOLEAN DEFAULT true,
    "creditUpdates" BOOLEAN DEFAULT true,
    "marketingEmails" BOOLEAN DEFAULT false,
    "frequency" TEXT DEFAULT 'immediate',
    "quietHoursStart" TEXT,
    "quietHoursEnd" TEXT,
    "timezone" TEXT DEFAULT 'UTC',
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificationPreferences_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notificationLogs" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL,
    "sentAt" TIMESTAMPTZ(6),
    "deliveredAt" TIMESTAMPTZ(6),
    "failureReason" TEXT,
    "retryCount" INTEGER DEFAULT 0,
    "metadata" JSONB,

    CONSTRAINT "notificationLogs_pkey" PRIMARY KEY ("id")
);

-- Re-enable triggers
SET session_replication_role = DEFAULT;

SELECT 'SUCCESS: Notification service tables created!' as result;