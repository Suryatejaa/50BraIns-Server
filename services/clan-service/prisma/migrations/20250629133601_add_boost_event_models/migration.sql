-- CreateTable
CREATE TABLE "clan_boost_events" (
    "id" TEXT NOT NULL,
    "clanId" TEXT NOT NULL,
    "boosterId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "duration" INTEGER NOT NULL,
    "eventId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clan_boost_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clan_credit_events" (
    "id" TEXT NOT NULL,
    "clanId" TEXT,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "eventId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clan_credit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clan_boost_events_eventId_key" ON "clan_boost_events"("eventId");

-- CreateIndex
CREATE INDEX "clan_boost_events_clanId_idx" ON "clan_boost_events"("clanId");

-- CreateIndex
CREATE INDEX "clan_boost_events_isActive_idx" ON "clan_boost_events"("isActive");

-- CreateIndex
CREATE INDEX "clan_boost_events_expiresAt_idx" ON "clan_boost_events"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "clan_credit_events_eventId_key" ON "clan_credit_events"("eventId");

-- CreateIndex
CREATE INDEX "clan_credit_events_clanId_idx" ON "clan_credit_events"("clanId");

-- CreateIndex
CREATE INDEX "clan_credit_events_userId_idx" ON "clan_credit_events"("userId");

-- CreateIndex
CREATE INDEX "clan_credit_events_eventType_idx" ON "clan_credit_events"("eventType");
