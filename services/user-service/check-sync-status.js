const { PrismaClient } = require('@prisma/client');

async function checkSyncStatus() {
    const prisma = new PrismaClient();

    try {
        console.log('🔍 Checking sync status...\n');

        // Check specific test user
        const testUser = await prisma.user.findFirst({
            where: { email: 'test@example.com' }
        });

        let testUserAnalytics = null;
        if (testUser) {
            testUserAnalytics = await prisma.userAnalytics.findUnique({
                where: { userId: testUser.id }
            });
        }

        if (testUser) {
            console.log('✅ test@example.com user found in user-service:');
            console.log(`   - ID: ${testUser.id}`);
            console.log(`   - Username: ${testUser.username}`);
            console.log(`   - Email: ${testUser.email}`);
            console.log(`   - Analytics: ${testUserAnalytics ? 'Yes' : 'No'}`);
            if (testUserAnalytics) {
                console.log(`   - Profile Views: ${testUserAnalytics.profileViews}`);
                console.log(`   - Search Appearances: ${testUserAnalytics.searchAppearances}`);
            }
        } else {
            console.log('❌ test@example.com user not found');
        }

        console.log('\n📊 Overall sync stats:');

        // Count total users
        const totalUsers = await prisma.user.count();
        console.log(`   - Total users in user-service: ${totalUsers}`);

        // Count users with analytics
        const totalAnalytics = await prisma.userAnalytics.count();
        console.log(`   - Users with analytics: ${totalAnalytics}`);

        // Count users without analytics
        const usersWithoutAnalytics = totalUsers - totalAnalytics;
        console.log(`   - Users without analytics: ${usersWithoutAnalytics}`);

        if (usersWithoutAnalytics === 0) {
            console.log('\n🎉 Perfect! All users have analytics entries.');
        } else {
            console.log(`\n⚠️  ${usersWithoutAnalytics} users are missing analytics entries.`);
        }

        // Sample of recently synced users
        console.log('\n📋 Sample of recent users:');
        const sampleUsers = await prisma.user.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' }
        });

        for (const user of sampleUsers) {
            const analytics = await prisma.userAnalytics.findUnique({
                where: { userId: user.id }
            });
            console.log(`   - ${user.username} (${user.email}): ${analytics ? '✅' : '❌'}`);
        }

    } catch (error) {
        console.error('Error checking sync status:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkSyncStatus();
