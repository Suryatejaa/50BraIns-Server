/**
 * Script to create a test clan for WebSocket chat testing
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestClan() {
    try {
        console.log('🏛️ Creating test clan...');

        // Create a test clan
        const clan = await prisma.clan.create({
            data: {
                id: 'clan456', // Use the same ID from your test
                name: 'Test Clan for Chat',
                description: 'A test clan for testing WebSocket chat functionality',
                tagline: 'Testing Chat Features',
                visibility: 'PUBLIC',
                primaryCategory: 'Technology',
                location: 'Test City',
                headId: 'test-user-123', // This should be a valid user ID
                memberCount: 1
            }
        });

        console.log('✅ Test clan created successfully:', {
            id: clan.id,
            name: clan.name,
            headId: clan.headId
        });

        // Create a clan member (the head)
        const member = await prisma.clanMember.create({
            data: {
                userId: 'test-user-123',
                clanId: clan.id,
                role: 'OWNER',
                status: 'ACTIVE'
            }
        });

        console.log('✅ Clan member created:', {
            userId: member.userId,
            clanId: member.clanId,
            role: member.role
        });

        console.log('\n🎉 Test clan setup complete!');
        console.log('You can now test the chat with:');
        console.log('- Clan ID: clan456');
        console.log('- User ID: test-user-123 (or any other user ID)');

    } catch (error) {
        console.error('❌ Error creating test clan:', error.message);
        
        if (error.code === 'P2002') {
            console.log('⚠️  Clan already exists, skipping creation...');
        } else if (error.code === 'P2003') {
            console.log('⚠️  Foreign key constraint error. This might be because:');
            console.log('   1. The user ID "test-user-123" doesn\'t exist in your user service');
            console.log('   2. You need to create a user first or use an existing user ID');
        }
    } finally {
        await prisma.$disconnect();
    }
}

// Run the script
createTestClan();
