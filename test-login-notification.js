#!/usr/bin/env node

/**
 * Test Login Notification
 * 
 * This script tests if login notifications are being created properly
 */

const amqp = require('amqplib');

async function testLoginNotification() {
    console.log('🧪 Testing Login Notification...\n');

    let connection;
    let channel;

    try {
        // Connect to RabbitMQ
        const rabbitmqUrl = process.env.RABBITMQ_URL ||
            'amqps://mahifqgz:UTImWgOvCaa-95mb9DZL4X83mydMV9qt@armadillo.rmq.cloudamqp.com/mahifqgz';

        connection = await amqp.connect(rabbitmqUrl);
        channel = await connection.createChannel();

        // Assert brains_events exchange exists
        await channel.assertExchange('brains_events', 'topic', { durable: true });
        console.log('✅ brains_events exchange exists');

        // Test publishing login event exactly as auth service does
        console.log('📤 Publishing test login event...\n');

        const testUserId = 'test-user-' + Date.now();
        const loginEventData = {
            id: testUserId,
            email: 'test@example.com',
            username: 'testuser',
            roles: ['USER'],
            loginAt: new Date().toISOString(),
            loginMethod: 'password',
            ipAddress: null,
            userAgent: null,
            // Additional fields that auth service includes automatically
            eventType: 'user.login',
            timestamp: new Date().toISOString(),
            eventId: `auth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            service: 'auth-service'
        };

        await channel.publish('brains_events', 'user.login', Buffer.from(JSON.stringify(loginEventData)), { persistent: true });

        console.log('✅ Published user.login event with data:', JSON.stringify(loginEventData, null, 2));
        console.log(`\n📊 Test User ID: ${testUserId}`);
        console.log('\n💡 Now check:');
        console.log('1. Notification service logs for event processing');
        console.log('2. Database for created notification record');
        console.log('3. WebSocket connections for real-time delivery');

        console.log('\n🔍 To check database:');
        console.log(`SELECT * FROM notifications WHERE "userId" = '${testUserId}' ORDER BY "createdAt" DESC LIMIT 5;`);

        // Wait for processing
        console.log('\n⏳ Waiting 3 seconds for event processing...');
        await new Promise(resolve => setTimeout(resolve, 3000));

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        if (channel) await channel.close();
        if (connection) await connection.close();
        console.log('\n🔌 Disconnected from RabbitMQ');
    }
}

// Check if notification service database is accessible
async function checkNotificationDatabase() {
    try {
        console.log('🔍 Checking notification service database...');

        // Try to connect to notification service database
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient({
            datasources: {
                db: {
                    url: process.env.NOTIFICATION_DATABASE_URL || process.env.DATABASE_URL
                }
            }
        });

        await prisma.$connect();
        console.log('✅ Notification service database connection successful');

        // Check recent notifications
        const recentNotifications = await prisma.notification.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                userId: true,
                title: true,
                type: true,
                status: true,
                createdAt: true
            }
        });

        console.log(`📊 Recent notifications (${recentNotifications.length}):`);
        recentNotifications.forEach(notification => {
            console.log(`  - ${notification.id}: ${notification.title} (${notification.type}, ${notification.status})`);
        });

        await prisma.$disconnect();

    } catch (error) {
        console.log('❌ Notification service database check failed:', error.message);
        console.log('💡 Make sure notification service is set up and running');
    }
}

// Run tests
async function runTests() {
    try {
        await checkNotificationDatabase();
        console.log('\n' + '='.repeat(60) + '\n');
        await testLoginNotification();
    } catch (error) {
        console.error('❌ Test execution failed:', error);
    }
}

if (require.main === module) {
    runTests()
        .then(() => process.exit(0))
        .catch(error => {
            console.error('❌ Test execution failed:', error);
            process.exit(1);
        });
}

module.exports = { testLoginNotification, checkNotificationDatabase };