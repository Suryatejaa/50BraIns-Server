#!/usr/bin/env node

/**
 * Check Notification Database
 * 
 * This script checks if notifications are being created in the database
 */

async function checkNotificationDatabase() {
    console.log('🔍 Checking Notification Database...\n');

    try {
        // Connect to the database using the notification service's connection
        const { PrismaClient } = require('@prisma/client');

        // Use the notification service database URL
        const databaseUrl = process.env.NOTIFICATION_DATABASE_URL ||
            process.env.DATABASE_URL ||
            'postgresql://postgres:password@localhost:5432/50brains_notifications';

        console.log('🔌 Connecting to notification database...');

        const prisma = new PrismaClient({
            datasources: {
                db: { url: databaseUrl }
            },
            log: ['error', 'warn']
        });

        await prisma.$connect();
        console.log('✅ Database connection successful\n');

        // Check recent notifications
        console.log('📊 Checking recent notifications...');
        const recentNotifications = await prisma.notification.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                userId: true,
                title: true,
                type: true,
                status: true,
                createdAt: true,
                metadata: true
            }
        });

        console.log(`Found ${recentNotifications.length} recent notifications:`);

        if (recentNotifications.length === 0) {
            console.log('❌ No notifications found in database');
            console.log('💡 This suggests the notification service is not creating notifications');
        } else {
            recentNotifications.forEach((notification, index) => {
                console.log(`\n${index + 1}. ${notification.title}`);
                console.log(`   ID: ${notification.id}`);
                console.log(`   User: ${notification.userId}`);
                console.log(`   Type: ${notification.type}`);
                console.log(`   Status: ${notification.status}`);
                console.log(`   Created: ${notification.createdAt}`);
                if (notification.metadata?.isLogin) {
                    console.log(`   🔐 LOGIN NOTIFICATION - Method: ${notification.metadata.loginMethod}`);
                }
            });
        }

        // Check for login notifications specifically
        console.log('\n🔐 Checking for login notifications...');
        const loginNotifications = await prisma.notification.findMany({
            where: {
                title: {
                    contains: 'Login Detected'
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 5
        });

        console.log(`Found ${loginNotifications.length} login notifications:`);

        if (loginNotifications.length === 0) {
            console.log('❌ No login notifications found');
            console.log('💡 The handleUserLogin method is not creating notifications');
        } else {
            loginNotifications.forEach((notification, index) => {
                console.log(`\n${index + 1}. User: ${notification.userId}`);
                console.log(`   Created: ${notification.createdAt}`);
                console.log(`   Metadata:`, notification.metadata);
            });
        }

        // Test creating a notification directly
        console.log('\n🧪 Testing direct notification creation...');
        try {
            const testNotification = await prisma.notification.create({
                data: {
                    userId: 'test-db-user-' + Date.now(),
                    type: 'SYSTEM',
                    title: '🧪 Database Test Notification',
                    message: 'This is a test notification created directly in the database.',
                    status: 'SENT',
                    priority: 1,
                    metadata: {
                        test: true,
                        createdBy: 'debug-script'
                    }
                }
            });

            console.log('✅ Direct notification creation successful:', testNotification.id);

            // Clean up test notification
            await prisma.notification.delete({
                where: { id: testNotification.id }
            });
            console.log('🧹 Test notification cleaned up');

        } catch (dbError) {
            console.error('❌ Direct notification creation failed:', dbError);
            console.log('💡 There might be a database schema issue');
        }

        // Check database table structure
        console.log('\n🏗️ Checking database schema...');
        try {
            const tableInfo = await prisma.$queryRaw`
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = 'notifications' 
                ORDER BY ordinal_position;
            `;

            console.log('📋 Notifications table structure:');
            tableInfo.forEach(column => {
                console.log(`   ${column.column_name}: ${column.data_type} ${column.is_nullable === 'NO' ? '(required)' : ''}`);
            });

        } catch (schemaError) {
            console.log('⚠️ Could not check schema:', schemaError.message);
        }

        await prisma.$disconnect();
        console.log('\n✅ Database check completed');

    } catch (error) {
        console.error('❌ Database check failed:', error);

        if (error.code === 'P1001') {
            console.log('💡 Database connection failed - check DATABASE_URL');
        } else if (error.code === 'P2002') {
            console.log('💡 Unique constraint violation');
        } else if (error.code === 'P2025') {
            console.log('💡 Record not found');
        } else {
            console.log('💡 Unknown database error - check notification service logs');
        }
    }
}

// Also check notification service environment
async function checkNotificationServiceConfig() {
    console.log('\n⚙️ Checking Notification Service Configuration...\n');

    try {
        // Try to read notification service .env file
        const fs = require('fs');
        const path = require('path');

        const envPath = path.join(__dirname, 'services', 'notification-service', '.env');

        if (fs.existsSync(envPath)) {
            console.log('📄 Found notification service .env file');
            const envContent = fs.readFileSync(envPath, 'utf8');

            // Check important environment variables
            const lines = envContent.split('\n');
            const config = {};

            lines.forEach(line => {
                if (line.includes('=') && !line.startsWith('#')) {
                    const [key, value] = line.split('=', 2);
                    config[key.trim()] = value?.trim();
                }
            });

            console.log('🔧 Key configuration:');
            console.log(`   NODE_ENV: ${config.NODE_ENV || 'not set'}`);
            console.log(`   DATABASE_URL: ${config.DATABASE_URL ? 'set' : 'not set'}`);
            console.log(`   RABBITMQ_URL: ${config.RABBITMQ_URL ? 'set' : 'not set'}`);
            console.log(`   ENABLE_IN_APP_NOTIFICATIONS: ${config.ENABLE_IN_APP_NOTIFICATIONS || 'not set'}`);

        } else {
            console.log('⚠️ No .env file found for notification service');
        }

    } catch (configError) {
        console.log('⚠️ Could not check notification service configuration:', configError.message);
    }
}

// Run all checks
async function runAllChecks() {
    console.log('🚀 Starting Notification Database Debug');
    console.log('='.repeat(60));

    await checkNotificationServiceConfig();
    console.log('\n' + '='.repeat(60));
    await checkNotificationDatabase();
}

if (require.main === module) {
    runAllChecks()
        .then(() => process.exit(0))
        .catch(error => {
            console.error('❌ Debug execution failed:', error);
            process.exit(1);
        });
}

module.exports = { checkNotificationDatabase, checkNotificationServiceConfig };