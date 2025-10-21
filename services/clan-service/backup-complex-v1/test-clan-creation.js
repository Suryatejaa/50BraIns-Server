const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testClanCreation() {
    try {
        // Test clan creation with owner
        const testUserId = 'cf2e0a3f-df3b-4cfb-ada5-c3dc6aa32117';
        const testClanData = {
            name: 'Test Clan with Owner',
            description: 'Testing automatic owner membership',
            primaryCategory: 'VIDEO_PRODUCTION',
            categories: ['VIDEO_PRODUCTION', 'PHOTOGRAPHY'],
            location: 'Test Location',
            visibility: 'PUBLIC'
        };

        // Generate slug
        const slug = testClanData.name
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '') + '-' + Date.now();

        // Create clan
        const newClan = await prisma.clan.create({
            data: {
                ...testClanData,
                slug,
                clanHeadId: testUserId,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });

        console.log('Created clan:', newClan.id);

        // Add owner as member
        await prisma.clanMember.create({
            data: {
                userId: testUserId,
                clanId: newClan.id,
                role: 'HEAD',
                isCore: true,
                joinedAt: new Date(),
                lastActiveAt: new Date()
            }
        });

        console.log('Added owner as member');

        // Verify the member was added
        const members = await prisma.clanMember.findMany({
            where: { clanId: newClan.id, status: 'ACTIVE' }
        });

        console.log('Clan members:', members);

        // Clean up
        await prisma.clanMember.deleteMany({
            where: { clanId: newClan.id }
        });

        await prisma.clan.delete({
            where: { id: newClan.id }
        });

        console.log('Test completed successfully');

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testClanCreation(); 