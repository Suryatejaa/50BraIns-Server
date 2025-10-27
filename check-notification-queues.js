#!/usr/bin/env node

/**
 * Check Notification Service Queue Status
 * 
 * This script checks if the notification service queues are properly set up and consuming
 */

const amqp = require('amqplib');

async function checkNotificationServiceQueues() {
    console.log('🔍 Checking Notification Service Queue Status...\n');

    let connection;
    let channel;

    try {
        const rabbitmqUrl = process.env.RABBITMQ_URL ||
            'amqps://mahifqgz:UTImWgOvCaa-95mb9DZL4X83mydMV9qt@armadillo.rmq.cloudamqp.com/mahifqgz';

        console.log('🔌 Connecting to RabbitMQ...');
        connection = await amqp.connect(rabbitmqUrl);
        channel = await connection.createChannel();

        // Check if the notification service queues exist and have consumers
        const queuesToCheck = [
            'notifications.user.events',
            'notifications.gig.events',
            'notifications.clan.events',
            'notifications.reputation.events',
            'notifications.credit.events'
        ];

        console.log('📋 Checking notification service queues...\n');

        for (const queueName of queuesToCheck) {
            try {
                // Try to inspect the queue
                const queueInfo = await channel.checkQueue(queueName);

                console.log(`✅ Queue: ${queueName}`);
                console.log(`   Messages: ${queueInfo.messageCount}`);
                console.log(`   Consumers: ${queueInfo.consumerCount}`);

                if (queueInfo.consumerCount === 0) {
                    console.log(`   ⚠️  No consumers active - notification service might not be running`);
                } else {
                    console.log(`   ✅ Active consumers detected`);
                }

                console.log('');

            } catch (queueError) {
                console.log(`❌ Queue: ${queueName} - NOT FOUND or ERROR`);
                console.log(`   Error: ${queueError.message}`);
                console.log('');
            }
        }

        // Test publishing a user.login event to see if it gets consumed
        console.log('🧪 Testing user.login event consumption...\n');

        // Create a test event
        const testLoginEvent = {
            id: 'queue-test-user-' + Date.now(),
            email: 'queuetest@example.com',
            username: 'queuetestuser',
            roles: ['USER'],
            loginAt: new Date().toISOString(),
            loginMethod: 'password',
            ipAddress: '127.0.0.1',
            userAgent: 'Queue Test',
            eventType: 'user.login',
            timestamp: new Date().toISOString(),
            eventId: `queue_test_${Date.now()}`,
            service: 'auth-service'
        };

        // Publish the test event
        await channel.publish('brains_events', 'user.login',
            Buffer.from(JSON.stringify(testLoginEvent)),
            { persistent: true }
        );

        console.log('📤 Published test user.login event');
        console.log('📊 Test User ID:', testLoginEvent.id);
        console.log('📧 Test Email:', testLoginEvent.email);

        // Wait to see if it gets consumed
        console.log('\n⏳ Waiting 10 seconds to see if notification service processes it...');
        await new Promise(resolve => setTimeout(resolve, 10000));

        // Check the user events queue again to see if message was consumed
        try {
            const userQueueInfo = await channel.checkQueue('notifications.user.events');
            console.log(`\n📊 User Events Queue Status After Test:`);
            console.log(`   Messages: ${userQueueInfo.messageCount}`);
            console.log(`   Consumers: ${userQueueInfo.consumerCount}`);

            if (userQueueInfo.messageCount > 0) {
                console.log('⚠️  Test message not consumed - notification service may not be processing');
            } else {
                console.log('✅ Test message consumed - notification service is active');
            }

        } catch (error) {
            console.log('❌ Could not check user events queue status');
        }

        console.log('\n💡 Next Steps:');
        console.log('1. If queues exist but have no consumers:');
        console.log('   - Restart the notification service');
        console.log('   - Check notification service logs for errors');
        console.log('');
        console.log('2. If queues don\'t exist:');
        console.log('   - Check notification service startup logs');
        console.log('   - Verify RabbitMQ connection in notification service');
        console.log('');
        console.log('3. If test message is not consumed:');
        console.log('   - Check if notification service is bound to correct exchange');
        console.log('   - Verify routing key bindings');

    } catch (error) {
        console.error('❌ Queue check failed:', error);
    } finally {
        if (channel) await channel.close();
        if (connection) await connection.close();
        console.log('\n🔌 Disconnected from RabbitMQ');
    }
}

if (require.main === module) {
    checkNotificationServiceQueues()
        .then(() => process.exit(0))
        .catch(error => {
            console.error('❌ Check execution failed:', error);
            process.exit(1);
        });
}

module.exports = { checkNotificationServiceQueues };