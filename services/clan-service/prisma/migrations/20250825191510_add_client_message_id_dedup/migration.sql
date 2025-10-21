/*
  Warnings:

  - A unique constraint covering the columns `[clientMessageId]` on the table `clan_messages` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "clan_messages_messageType_idx";

-- AlterTable
ALTER TABLE "clan_messages" ADD COLUMN     "clientMessageId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "clan_messages_clientMessageId_key" ON "clan_messages"("clientMessageId");

-- CreateIndex
CREATE INDEX "clan_messages_isDeleted_idx" ON "clan_messages"("isDeleted");

-- CreateIndex
CREATE INDEX "clan_messages_clientMessageId_idx" ON "clan_messages"("clientMessageId");
