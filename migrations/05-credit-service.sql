-- 05-CREDIT-SERVICE.sql
-- Credit Service Migration - Creates credit service tables
-- Run after: 00-create-enums.sql

-- ============================================================================
-- CREDIT SERVICE TABLES
-- ============================================================================

-- Disable triggers temporarily
SET session_replication_role = replica;

-- Drop existing tables in reverse dependency order
DROP TABLE IF EXISTS "creditEvents";
DROP TABLE IF EXISTS "creditTransactions";
DROP TABLE IF EXISTS "creditWallets";

CREATE TABLE "creditWallets" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "ownerType" TEXT NOT NULL,
    "balance" INTEGER DEFAULT 0,
    "totalEarned" INTEGER DEFAULT 0,
    "totalSpent" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creditWallets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "creditTransactions" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceBefore" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "relatedId" TEXT,
    "relatedType" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "status" "TransactionStatus" DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creditTransactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "creditBoostRecords" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "boostType" "BoostType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "creditsCost" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "startTime" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMPTZ(6) NOT NULL,
    "isActive" BOOLEAN DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creditBoostRecords_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "creditPackages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION,
    "isActive" BOOLEAN DEFAULT true,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creditPackages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "creditPaymentRecords" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packageId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "credits" INTEGER NOT NULL,
    "paymentGateway" TEXT NOT NULL,
    "gatewayOrderId" TEXT,
    "gatewayPaymentId" TEXT,
    "status" "PaymentStatus" DEFAULT 'PENDING',
    "paymentData" JSONB,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creditPaymentRecords_pkey" PRIMARY KEY ("id")
);

-- Re-enable triggers
SET session_replication_role = DEFAULT;

SELECT 'SUCCESS: Credit service tables created!' as result;