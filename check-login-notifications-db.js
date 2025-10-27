#!/usr/bin/env node

/**
 * Check database for login notifications
 */

const { prisma } = require('./services/notification-service/src/config/database');

async function checkLoginNotifications() {
    console.log('🔍 Checking database for login notifications...\n');

    try {
        // Look for recent notifications for raju@gmail.com
        const recentNotifications = await prisma.notification.findMany({
            where: {
                OR: [
                    { title: { contains: 'login', mode: 'insensitive' } },
                    { message: { contains: 'login', mode: 'insensitive' } },
                    { message: { contains: 'raju@gmail.com' } },
                    { userId: 'raju@gmail.com' }, // in case userId is email
                ]
            },
            orderBy: { createdAt: 'desc' },
            take: 10
        });

        console.log(`📊 Found ${recentNotifications.length} login-related notifications`);

        if (recentNotifications.length > 0) {
            console.log('\n📝 Recent login notifications:');
            recentNotifications.forEach((notif, index) => {
                console.log(`\n${index + 1}. Notification ID: ${notif.id}`);
                console.log(`   User ID: ${notif.userId}`);
                console.log(`   Title: ${notif.title}`);
                console.log(`   Message: ${notif.message}`);
                console.log(`   Type: ${notif.type}`);
                console.log(`   Created: ${notif.createdAt}`);
                console.log(`   Read: ${notif.isRead}`);
            });
        } else {
            console.log('\n❌ No login notifications found in database');
        }

        // Also check for any notifications created in the last 5 minutes
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const recentAnyNotifications = await prisma.notification.findMany({
            where: {
                createdAt: { gte: fiveMinutesAgo }
            },
            orderBy: { createdAt: 'desc' },
            take: 5
        });

        console.log(`\n📊 Found ${recentAnyNotifications.length} notifications created in last 5 minutes`);

        if (recentAnyNotifications.length > 0) {
            console.log('\n📝 Recent notifications (any type):');
            recentAnyNotifications.forEach((notif, index) => {
                console.log(`\n${index + 1}. ID: ${notif.id}`);
                console.log(`   User: ${notif.userId}`);
                console.log(`   Title: ${notif.title}`);
                console.log(`   Type: ${notif.type}`);
                console.log(`   Created: ${notif.createdAt}`);
            });
        }

        // Check notification service logs in database if there's a logs table
        try {
            const logs = await prisma.$queryRaw`
                SELECT * FROM logs 
                WHERE message ILIKE '%login%' 
                   OR message ILIKE '%user.login%'
                   OR message ILIKE '%raju%'
                ORDER BY created_at DESC 
                LIMIT 5
            `;

            if (logs && logs.length > 0) {
                console.log(`\n📜 Found ${logs.length} relevant log entries:`);
                logs.forEach((log, index) => {
                    console.log(`\n${index + 1}. ${log.level}: ${log.message}`);
                    console.log(`   Time: ${log.created_at}`);
                });
            }
        } catch (logError) {
            console.log('\n📜 No logs table found or accessible');
        }

    } catch (error) {
        console.error('❌ Database check failed:', error);
    }
}

checkLoginNotifications()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('❌ Execution failed:', error);
        process.exit(1);
    });