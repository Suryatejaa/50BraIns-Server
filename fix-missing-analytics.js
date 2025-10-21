/**
 * Script to create missing userAnalytics entries for existing users
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: 'postgresql://postgres:Surya@2001@localhost:5432/brains_user?schema=public'
        }
    }
});

async function fixMissingAnalytics() {
    try {
        console.log('🔍 Checking for users without analytics entries...');

        // Get all users who don't have analytics entries
        const usersWithoutAnalytics = await prisma.user.findMany({
            where: {
                userAnalytics: null
            },
            select: {
                id: true,
                username: true,
                email: true
            }
        });

        console.log(`Found ${usersWithoutAnalytics.length} users without analytics entries:`);
        usersWithoutAnalytics.forEach(user => {
            console.log(`  - ${user.username} (${user.email})`);
        });

        if (usersWithoutAnalytics.length === 0) {
            console.log('✅ All users already have analytics entries!');
            return;
        }

        // Create analytics entries for users who don't have them
        for (const user of usersWithoutAnalytics) {
            console.log(`📊 Creating analytics for ${user.username}...`);

            await prisma.userAnalytics.create({
                data: {
                    userId: user.id,
                    profileViews: 0,
                    searchAppearances: 0,
                    popularityScore: 0,
                    engagementScore: 0
                }
            });

            console.log(`   ✅ Created analytics for ${user.username}`);
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
