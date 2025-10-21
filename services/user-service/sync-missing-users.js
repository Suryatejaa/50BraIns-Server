/**
 * Script to sync missing users from auth-service to user-service
 */

const { PrismaClient } = require('@prisma/client');

// Auth service connection
const authPrisma = new PrismaClient({
    datasources: {
        db: {
            url: 'postgresql://postgres:Surya@2001@localhost:5432/brains_auth?schema=public'
        }
    }
});

// User service connection
const userPrisma = new PrismaClient({
    datasources: {
        db: {
            url: 'postgresql://postgres:Surya@2001@localhost:5432/brains_user?schema=public'
        }
    }
});

async function syncMissingUsers() {
    try {
        console.log('🔍 Finding users that exist in auth-service but not in user-service...');

        // Get all users from auth-service
        const authUsers = await authPrisma.user.findMany({
            select: {
                id: true,
                email: true,
                username: true,
                roles: true,
                isActive: true,
                status: true,
                emailVerified: true,
                createdAt: true
            }
        });

        console.log(`Found ${authUsers.length} users in auth-service`);

        // Get all users from user-service
        const userServiceUsers = await userPrisma.user.findMany({
            select: {
                id: true,
                email: true,
                username: true
            }
        });

        console.log(`Found ${userServiceUsers.length} users in user-service`);

        // Find missing users
        const userServiceUserIds = new Set(userServiceUsers.map(u => u.id));
        const missingUsers = authUsers.filter(user => !userServiceUserIds.has(user.id));

        console.log(`Found ${missingUsers.length} missing users:`);
        missingUsers.forEach(user => {
            console.log(`  - ${user.username || 'N/A'} (${user.email})`);
        });

        if (missingUsers.length === 0) {
            console.log('✅ All users are already synced!');
            return;
        }

        // Sync missing users
        for (const user of missingUsers) {
            console.log(`👤 Syncing user ${user.username || user.email}...`);

            // Create user in user-service
            await userPrisma.user.create({
                data: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    roles: user.roles,
                    isActive: user.isActive,
                    status: user.status,
                    emailVerified: user.emailVerified,
                    createdAt: user.createdAt,
                    lastActiveAt: new Date()
                }
            });

            // Create analytics entry
            await userPrisma.userAnalytics.create({
                data: {
                    userId: user.id,
                    profileViews: 0,
                    searchAppearances: 0,
                    popularityScore: 0,
                    engagementScore: 0
                }
            });

            console.log(`   ✅ Synced ${user.username || user.email}`);
        }

        console.log(`🎉 Successfully synced ${missingUsers.length} missing users!`);

    } catch (error) {
        console.error('❌ Error syncing missing users:', error);
    } finally {
        await authPrisma.$disconnect();
        await userPrisma.$disconnect();
    }
}

// Run the sync
syncMissingUsers();
