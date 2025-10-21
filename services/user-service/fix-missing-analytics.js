/**
 * Script to create missing userAnalytics entries for existing users
 */

const { prisma } = require('./src/config/database');
const logger = require('./src/utils/logger');

async function fixMissingAnalytics() {
    try {
        console.log('🔍 Checking for users without analytics entries...');

        // Get all users
        const allUsers = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                email: true
            }
        });

        console.log(`Found ${allUsers.length} total users`);

        // Get all existing analytics entries
        const existingAnalytics = await prisma.userAnalytics.findMany({
            select: {
                userId: true
            }
        });

        const existingUserIds = new Set(existingAnalytics.map(a => a.userId));
        console.log(`Found ${existingAnalytics.length} existing analytics entries`);

        // Find users without analytics
        const usersWithoutAnalytics = allUsers.filter(user => !existingUserIds.has(user.id));

        console.log(`Found ${usersWithoutAnalytics.length} users without analytics entries:`);
        usersWithoutAnalytics.forEach(user => {
            console.log(`  - ${user.username || 'N/A'} (${user.email})`);
        });

        if (usersWithoutAnalytics.length === 0) {
            console.log('✅ All users already have analytics entries!');
            return;
        }

        // Create analytics entries for users who don't have them
        for (const user of usersWithoutAnalytics) {
            console.log(`📊 Creating analytics for ${user.username || user.email}...`);

            await prisma.userAnalytics.create({
                data: {
                    userId: user.id,
                    profileViews: 0,
                    searchAppearances: 0,
                    popularityScore: 0,
                    engagementScore: 0
                }
            });

            console.log(`   ✅ Created analytics for ${user.username || user.email}`);
        }

        console.log(`🎉 Successfully created analytics for ${usersWithoutAnalytics.length} users!`);

    } catch (error) {
        console.error('❌ Error fixing missing analytics:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the fix
fixMissingAnalytics();
