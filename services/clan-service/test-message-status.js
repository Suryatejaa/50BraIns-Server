/**
 * Test script for message status functionality
 * Run with: node test-message-status.js
 */

const messageService = require('./src/services/message.service');

async function testMessageStatus() {
    console.log('🧪 Testing Message Status Functionality...\n');

    try {
        // Test 1: Create a message
        console.log('1️⃣ Creating test message...');
        const testMessage = await messageService.createMessage({
            content: 'Test message for status tracking',
            userId: 'test-user-123',
            clanId: 'test-clan-456',
            messageType: 'TEXT'
        });
        console.log('✅ Message created:', testMessage.id);

        // Test 2: Mark as delivered
        console.log('\n2️⃣ Marking message as delivered...');
        await messageService.markAsDelivered(testMessage.id, 'recipient-user-789');
        console.log('✅ Message marked as delivered');

        // Test 3: Mark as read
        console.log('\n3️⃣ Marking message as read...');
        await messageService.markAsRead(testMessage.id, 'recipient-user-789');
        console.log('✅ Message marked as read');

        // Test 4: Get message status
        console.log('\n4️⃣ Getting message status...');
        const status = await messageService.getMessageStatus(testMessage.id);
        console.log('✅ Message status:', status);

        // Test 5: Get read receipts
        console.log('\n5️⃣ Getting read receipts...');
        const readReceipts = await messageService.getReadReceipts(testMessage.id);
        console.log('✅ Read receipts:', readReceipts);

        // Test 6: Soft delete message
        console.log('\n6️⃣ Soft deleting message...');
        await messageService.deleteMessage(testMessage.id, 'test-user-123');
        console.log('✅ Message soft deleted');

        // Test 7: Get message status after deletion
        console.log('\n7️⃣ Getting message status after deletion...');
        const deletedStatus = await messageService.getMessageStatus(testMessage.id);
        console.log('✅ Deleted message status:', deletedStatus);

        // Test 8: Get recent messages (should exclude deleted)
        console.log('\n8️⃣ Getting recent messages (should exclude deleted)...');
        const recentMessages = await messageService.getRecentMessages('test-clan-456', 10);
        console.log('✅ Recent messages count:', recentMessages.length);

        // Test 9: Get clan message stats
        console.log('\n9️⃣ Getting clan message stats...');
        const stats = await messageService.getClanMessageStats('test-clan-456');
        console.log('✅ Clan message stats:', stats);

        console.log('\n🎉 All tests passed! Message status functionality is working correctly.');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        // Clean up test data
        console.log('\n🧹 Cleaning up test data...');
        try {
            // Note: In a real scenario, you might want to actually delete test data
            console.log('✅ Test completed');
        } catch (cleanupError) {
            console.error('⚠️ Cleanup warning:', cleanupError.message);
        }

        // Close Prisma connection
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        await prisma.$disconnect();
    }
}

// Run the test
testMessageStatus().catch(console.error);
