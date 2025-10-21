-- 02-USER-SERVICE.sql
-- User Service Migration - Creates user service tables
-- Run after: 00-create-enums.sql

-- ============================================================================
-- USER SERVICE TABLES
-- ============================================================================

-- Disable triggers temporarily
SET session_replication_role = replica;

-- Drop existing tables in reverse dependency order
DROP TABLE IF EXISTS "userEquipment";
DROP TABLE IF EXISTS "userCreditEvents";
DROP TABLE IF EXISTS "userBoostEvents";
DROP TABLE IF EXISTS "userFavorites";
DROP TABLE IF EXISTS "userSearchHistory";
DROP TABLE IF EXISTS "userAnalytics";

CREATE TABLE "userAnalytics" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profileViews" INTEGER DEFAULT 0,
    "searchAppearances" INTEGER DEFAULT 0,
    "lastViewedAt" TIMESTAMPTZ(6),
    "popularityScore" DOUBLE PRECISION DEFAULT 0,
    "engagementScore" DOUBLE PRECISION DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "userAnalytics_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "userSearchHistory" (
    "id" TEXT NOT NULL,
    "searchQuery" TEXT NOT NULL,
    "searchType" TEXT NOT NULL,
    "filters" JSONB,
    "resultCount" INTEGER NOT NULL,
    "searcherId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "userSearchHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "userFavorites" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "favoriteUserId" TEXT NOT NULL,
    "favoriteType" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "userFavorites_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "userBoostEvents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "boostType" TEXT NOT NULL,
    "boosterId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "duration" INTEGER NOT NULL,
    "eventId" TEXT NOT NULL,
    "isActive" BOOLEAN DEFAULT true,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "userBoostEvents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "userCreditEvents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "eventId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "userCreditEvents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "userEquipment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "description" TEXT,
    "condition" "EquipmentCondition" DEFAULT 'GOOD',
    "purchaseDate" TIMESTAMPTZ(6),
    "purchasePrice" DOUBLE PRECISION,
    "currentValue" DOUBLE PRECISION,
    "isAvailable" BOOLEAN DEFAULT true,
    "isIncludedInBids" BOOLEAN DEFAULT true,
    "specifications" JSONB,
    "images" TEXT[] DEFAULT ARRAY[]::"text"[],
    "lastServiceDate" TIMESTAMPTZ(6),
    "nextServiceDue" TIMESTAMPTZ(6),
    "location" TEXT,
    "serialNumber" TEXT,
    "insuranceValue" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "userEquipment_pkey" PRIMARY KEY ("id")
);

-- Re-enable triggers
SET session_replication_role = DEFAULT;

SELECT 'SUCCESS: User service tables created!' as result;