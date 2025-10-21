-- CreateTable
CREATE TABLE "user_boost_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "boostType" TEXT NOT NULL,
    "boosterId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "duration" INTEGER NOT NULL,
    "eventId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_boost_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_credit_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "eventId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_credit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_boost_events_eventId_key" ON "user_boost_events"("eventId");

-- CreateIndex
CREATE INDEX "user_boost_events_userId_idx" ON "user_boost_events"("userId");

-- CreateIndex
CREATE INDEX "user_boost_events_isActive_idx" ON "user_boost_events"("isActive");

-- CreateIndex
CREATE INDEX "user_boost_events_expiresAt_idx" ON "user_boost_events"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_credit_events_eventId_key" ON "user_credit_events"("eventId");

-- CreateIndex
CREATE INDEX "user_credit_events_userId_idx" ON "user_credit_events"("userId");

-- CreateIndex
CREATE INDEX "user_credit_events_eventType_idx" ON "user_credit_events"("eventType");
