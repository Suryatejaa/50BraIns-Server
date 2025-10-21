-- AlterTable
ALTER TABLE "clan_messages" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" TEXT,
ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isDelivered" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "readAt" JSONB[] DEFAULT ARRAY[]::JSONB[],
ADD COLUMN     "readBy" JSONB[] DEFAULT ARRAY[]::JSONB[];

-- CreateIndex
CREATE INDEX "clan_messages_userId_idx" ON "clan_messages"("userId");
