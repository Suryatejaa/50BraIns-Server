#!/usr/bin/env node

/**
 * Debug Login Notification Flow
 * 
 * This script helps debug the complete flow from auth service to notification service
 */

const amqp = require('amqplib');

async function debugLoginNotificationFlow() {
    console.log('🔍 Debugging Login Notification Flow...\n');

    let connection;
    let channel;

    try {
        // Connect to RabbitMQ with the same URL as services
        const rabbitmqUrl = process.env.RABBITMQ_URL ||
            'amqps://mahifqgz:UTImWgOvCaa-95mb9DZL4X83mydMV9qt@armadillo.rmq.cloudamqp.com/mahifqgz';

        console.log('🔌 Connecting to RabbitMQ...');
        connection = await amqp.connect(rabbitmqUrl);
        channel = await connection.createChannel();

        // Setup monitoring queue to see what's being processed
        console.log('🎧 Setting up monitoring...');

        const monitorQueue = await channel.assertQueue('debug_monitor', {
            exclusive: true,
            autoDelete: true
        });

        // Bind to the same events notification service listens to
        await channel.bindQueue(monitorQueue.queue, 'brains_events', 'user.login');
        await channel.bindQueue(monitorQueue.queue, 'notifications', 'user.*'); // In case it publishes here

        console.log('✅ Monitor queue setup complete\n');

        // Start monitoring
        let eventCount = 0;
        console.log('👂 Listening for user.login events...');

        await channel.consume(monitorQueue.queue, (msg) => {
            if (msg) {
                eventCount++;
                const routingKey = msg.fields.routingKey;
                const eventData = JSON.parse(msg.content.toString());

                console.log(`\n📨 [Event ${eventCount}] Captured: ${routingKey}`);
                console.log(`📊 Exchange: ${msg.fields.exchange}`);
                console.log(`🏷️ Routing Key: ${routingKey}`);
                console.log(`📄 Event Data:`, JSON.stringify(eventData, null, 2));

                // Check if this looks like what notification service expects
                if (eventData.id && eventData.email && eventData.loginAt) {
                    console.log('✅ Event has required fields for notification service');
                } else {
                    console.log('⚠️ Event might be missing required fields');
                }

                channel.ack(msg);
            }
        });

        // Simulate auth service login event
        console.log('📤 Publishing test user.login event...\n');

        const testLoginEvent = {
            id: 'debug-user-' + Date.now(),
            email: 'debug@test.com',
            username: 'debuguser',
            roles: ['USER'],
            loginAt: new Date().toISOString(),
            loginMethod: 'password',
            ipAddress: '127.0.0.1',
            userAgent: 'Debug Test',
            // Auth service adds these automatically
            eventType: 'user.login',
            timestamp: new Date().toISOString(),
            eventId: `auth_${Date.now()}_debug`,
            service: 'auth-service'
        };

        await channel.publish('brains_events', 'user.login',
            Buffer.from(JSON.stringify(testLoginEvent)),
            { persistent: true }
        );

        console.log('✅ Published test login event');
        console.log('📊 Test User ID:', testLoginEvent.id);

        // Wait and see what happens
        console.log('\n⏳ Waiting 10 seconds to capture events...');
        await new Promise(resolve => setTimeout(resolve, 10000));

        if (eventCount === 0) {
            console.log('\n❌ No events were captured!');
            console.log('💡 Possible issues:');
            console.log('   1. Notification service is not running');
            console.log('   2. RabbitMQ bindings are incorrect');
            console.log('   3. Wrong exchange or routing key');
            console.log('   4. Auth service is not publishing to correct exchange');

            // Check if we can see the event on the exchange directly
            console.log('\n🔍 Checking exchange bindings...');

            // List queues (this won\'t work in CloudAMQP but useful for local)
            try {
                // We can\'t list queues in CloudAMQP, so just recommend checking
                console.log('📋 To debug further:');
                console.log('   1. Check if notification service is running: pm2 list');
                console.log('   2. Check notification service logs for errors');
                console.log('   3. Verify notification service RabbitMQ connection');
                console.log('   4. Test notification service health endpoint');
            } catch (e) {
                // Expected in CloudAMQP
            }
        } else {
            console.log(`\n✅ Captured ${eventCount} event(s)`);
            console.log('💡 Events are flowing through RabbitMQ correctly');
            console.log('🔍 Check notification service logs to see if they\'re being processed');
        }

    } catch (error) {
        console.error('❌ Debug failed:', error);
    } finally {
        if (channel) await channel.close();
        if (connection) await connection.close();
        console.log('\n🔌 Disconnected from RabbitMQ');
    }
}

// Additional function to test notification service health
async function checkNotificationServiceHealth() {
    console.log('\n🏥 Checking Notification Service Health...');

    try {
        const axios = require('axios');
        const healthUrl = process.env.NOTIFICATION_SERVICE_URL
            ? `${process.env.NOTIFICATION_SERVICE_URL}/health`
            : 'http://localhost:4009/health';

        console.log(`📡 Checking: ${healthUrl}`);

        const response = await axios.get(healthUrl, { timeout: 5000 });

        console.log('✅ Notification service is running:');
        console.log(`   Status: ${response.data.status}`);
        console.log(`   Database: ${response.data.dependencies?.database}`);
        console.log(`   RabbitMQ: ${response.data.dependencies?.rabbitmq}`);
        console.log(`   Uptime: ${Math.floor(response.data.uptime)}s`);

        return true;
    } catch (error) {
        console.log('❌ Notification service health check failed:');
        if (error.code === 'ECONNREFUSED') {
            console.log('   Service is not running or not accessible');
        } else if (error.code === 'ETIMEDOUT') {
            console.log('   Service is not responding (timeout)');
        } else {
            console.log(`   Error: ${error.message}`);
        }
        return false;
    }
}

// Run the debug
async function runDebug() {
    console.log('🚀 Starting Login Notification Debug Session');
    console.log('='.repeat(60));

    const serviceHealthy = await checkNotificationServiceHealth();

    if (!serviceHealthy) {
        console.log('\n⚠️ Notification service appears to be down.');
        console.log('💡 Start the notification service first:');
        console.log('   cd services/notification-service && npm run dev');
        console.log('\n   OR check if it\'s running in production/PM2');
    }

    console.log('\n' + '='.repeat(60));
    await debugLoginNotificationFlow();
}

if (require.main === module) {
    runDebug()
        .then(() => process.exit(0))
        .catch(error => {
            console.error('❌ Debug execution failed:', error);
            process.exit(1);
        });
}

module.exports = { debugLoginNotificationFlow, checkNotificationServiceHealth };