#!/usr/bin/env node

/**
 * Test Login Notification Fix
 * 
 * This script tests if the notification service is now properly consuming user.login events
 */

const amqp = require('amqplib');

async function testLoginNotificationFix() {
    console.log('🧪 Testing Login Notification Fix...\n');

    let connection;
    let channel;

    try {
        // Connect to RabbitMQ
        const rabbitmqUrl = process.env.RABBITMQ_URL ||
            'amqps://mahifqgz:UTImWgOvCaa-95mb9DZL4X83mydMV9qt@armadillo.rmq.cloudamqp.com/mahifqgz';

        console.log('🔌 Connecting to RabbitMQ...');
        connection = await amqp.connect(rabbitmqUrl);
        channel = await connection.createChannel();

        // Check if the notification service queues exist and are bound correctly
        console.log('🔍 Checking notification service queue bindings...');

        // Publish a test user.login event
        console.log('📤 Publishing test user.login event...\n');

        const testLoginEvent = {
            id: 'test-fix-user-' + Date.now(),
            email: 'testfix@example.com',
            username: 'testfixuser',
            roles: ['USER'],
            loginAt: new Date().toISOString(),
            loginMethod: 'password',
            ipAddress: '127.0.0.1',
            userAgent: 'Test Fix Browser',
            // Auth service adds these automatically
            eventType: 'user.login',
            timestamp: new Date().toISOString(),
            eventId: `auth_${Date.now()}_testfix`,
            service: 'auth-service'
        };

        // Publish to brains_events exchange with user.login routing key
        await channel.publish('brains_events', 'user.login',
            Buffer.from(JSON.stringify(testLoginEvent)),
            { persistent: true }
        );

        console.log('✅ Published test login event to brains_events.user.login');
        console.log('📊 Test User ID:', testLoginEvent.id);
        console.log('📄 Event Data:', JSON.stringify(testLoginEvent, null, 2));

        console.log('\n⏳ Waiting 5 seconds for notification processing...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        console.log('\n📋 To verify the fix worked:');
        console.log('1. Check notification service logs for processing messages');
        console.log('2. Look for "🔐 [Notification Service] Handling user_login event" in logs');
        console.log('3. Check database for new notification record:');
        console.log(`   SELECT * FROM notifications WHERE "userId" = '${testLoginEvent.id}' AND title LIKE '%Login Detected%';`);
        console.log('4. Verify WebSocket notification was sent');

        // Also test with multiple events to ensure it's working consistently
        console.log('\n🔄 Publishing additional test events...');

        for (let i = 1; i <= 3; i++) {
            const additionalEvent = {
                ...testLoginEvent,
                id: `test-fix-user-${Date.now()}-${i}`,
                email: `testfix${i}@example.com`,
                username: `testfixuser${i}`,
                eventId: `auth_${Date.now()}_testfix_${i}`
            };

            await channel.publish('brains_events', 'user.login',
                Buffer.from(JSON.stringify(additionalEvent)),
                { persistent: true }
            );

            console.log(`✅ Published test event ${i}/3 for user: ${additionalEvent.id}`);

            // Small delay between events
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log('\n⏳ Waiting for all events to process...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        console.log('\n🎉 Test completed!');
        console.log('💡 If the fix worked, you should see:');
        console.log('   - 4 total user.login events processed in notification service logs');
        console.log('   - 4 new notification records in the database');
        console.log('   - No error messages about unhandled events');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        if (channel) await channel.close();
        if (connection) await connection.close();
        console.log('\n🔌 Disconnected from RabbitMQ');
    }
}

// Also check notification service status
async function checkNotificationServiceStatus() {
    console.log('🏥 Checking notification service status...\n');

    try {
        const axios = require('axios');
        const healthUrl = 'http://localhost:4009/health';

        const response = await axios.get(healthUrl, { timeout: 3000 });

        console.log('✅ Notification service is running:');
        console.log(`   Status: ${response.data.status}`);
        console.log(`   RabbitMQ: ${response.data.dependencies?.rabbitmq}`);
        console.log(`   Database: ${response.data.dependencies?.database}`);

        if (response.data.dependencies?.rabbitmq !== 'connected') {
            console.log('⚠️ Warning: Notification service RabbitMQ not connected');
            console.log('💡 Restart the notification service to apply the queue binding fix');
        }

        return true;
    } catch (error) {
        console.log('❌ Notification service not accessible:');
        if (error.code === 'ECONNREFUSED') {
            console.log('   Service is not running');
            console.log('💡 Start the notification service: cd services/notification-service && npm run dev');
        } else {
            console.log(`   Error: ${error.message}`);
        }
        return false;
    }
}

// Run the test
async function runTest() {
    console.log('🚀 Login Notification Fix Test');
    console.log('='.repeat(50));

    const serviceRunning = await checkNotificationServiceStatus();

    if (!serviceRunning) {
        console.log('\n⚠️ Cannot test - notification service is not running');
        console.log('📝 Steps to fix:');
        console.log('1. Start notification service: cd services/notification-service && npm run dev');
        console.log('2. Wait for RabbitMQ connection to establish');
        console.log('3. Run this test again');
        return;
    }

    console.log('\n' + '='.repeat(50));
    await testLoginNotificationFix();
}

if (require.main === module) {
    runTest()
        .then(() => process.exit(0))
        .catch(error => {
            console.error('❌ Test execution failed:', error);
            process.exit(1);
        });
}

module.exports = { testLoginNotificationFix, checkNotificationServiceStatus };