-- Add Gig Chat tables for simple messaging between gig owners and approved applicants
-- Migration: Add Gig Chat Feature

-- Create GigChat table
CREATE TABLE IF NOT EXISTS "gigChats" (
    "id" TEXT NOT NULL,
    "gigId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "gigOwnerId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gigChats_pkey" PRIMARY KEY ("id")
);

-- Create GigChatMessage table
CREATE TABLE IF NOT EXISTS "gigChatMessages" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "messageType" TEXT NOT NULL DEFAULT 'text',
    "fileUrl" TEXT,
    "fileName" TEXT,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gigChatMessages_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint for one chat per application
CREATE UNIQUE INDEX IF NOT EXISTS "gigChats_applicationId_key" ON "gigChats"("applicationId");

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_gigChats_gigId" ON "gigChats"("gigId");
CREATE INDEX IF NOT EXISTS "idx_gigChats_gigOwnerId" ON "gigChats"("gigOwnerId");
CREATE INDEX IF NOT EXISTS "idx_gigChats_applicantId" ON "gigChats"("applicantId");

CREATE INDEX IF NOT EXISTS "idx_gigChatMessages_chatId" ON "gigChatMessages"("chatId");
CREATE INDEX IF NOT EXISTS "idx_gigChatMessages_senderId" ON "gigChatMessages"("senderId");
CREATE INDEX IF NOT EXISTS "idx_gigChatMessages_createdAt" ON "gigChatMessages"("createdAt");

-- Add foreign key constraints
ALTER TABLE "gigChats" 
ADD CONSTRAINT "gigChats_gigId_fkey" 
FOREIGN KEY ("gigId") REFERENCES "gigs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "gigChats" 
ADD CONSTRAINT "gigChats_applicationId_fkey" 
FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "gigChatMessages" 
ADD CONSTRAINT "gigChatMessages_chatId_fkey" 
FOREIGN KEY ("chatId") REFERENCES "gigChats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add trigger to update updatedAt timestamp on gigChats
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_gigChats_updated_at ON "gigChats";
CREATE TRIGGER update_gigChats_updated_at
    BEFORE UPDATE ON "gigChats"
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_gigChatMessages_updated_at ON "gigChatMessages";
CREATE TRIGGER update_gigChatMessages_updated_at
    BEFORE UPDATE ON "gigChatMessages"
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE "gigChats" IS 'Chat sessions between gig owners and approved applicants';
COMMENT ON TABLE "gigChatMessages" IS 'Individual messages within gig chats';

COMMENT ON COLUMN "gigChats"."isActive" IS 'False when application is closed - makes chat read-only';
COMMENT ON COLUMN "gigChatMessages"."senderType" IS 'Either gig_owner or applicant';
COMMENT ON COLUMN "gigChatMessages"."messageType" IS 'Type of message: text, file, image';

-- Verify tables were created
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('gigChats', 'gigChatMessages')
ORDER BY table_name, ordinal_position;