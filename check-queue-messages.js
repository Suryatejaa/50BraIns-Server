#!/usr/bin/env node

/**
 * Check for messages in notification queues
 */

const amqp = require('amqplib');

async function checkQueueMessages() {
    console.log('📊 Checking queue messages...\n');

    let connection;
    let channel;

    try {
        const rabbitmqUrl = process.env.RABBITMQ_URL ||
            'amqps://mahifqgz:UTImWgOvCaa-95mb9DZL4X83mydMV9qt@armadillo.rmq.cloudamqp.com/mahifqgz';

        connection = await amqp.connect(rabbitmqUrl);
        channel = await connection.createChannel();

        // Check the user events queue specifically
        const queueInfo = await channel.checkQueue('notifications.user.events');

        console.log(`📋 notifications.user.events Queue Status:`);
        console.log(`   Messages: ${queueInfo.messageCount}`);
        console.log(`   Consumers: ${queueInfo.consumerCount}`);

        if (queueInfo.messageCount > 0) {
            console.log('\n📬 There are unprocessed messages in the queue!');
            console.log('This suggests the notification service is not processing them properly.');
        } else {
            console.log('\n✅ No messages in queue - they were processed or never arrived');
        }

        // Also check the main brains_events exchange
        console.log('\n🔍 Checking if we can see recent events in brains_events exchange...');

        // Create a temporary queue to check for new events
        const tempQueue = await channel.assertQueue('', { exclusive: true, autoDelete: true });
        await channel.bindQueue(tempQueue.queue, 'brains_events', 'user.login');

        console.log('👂 Listening for new user.login events for 5 seconds...');

        let eventReceived = false;

        const timeout = setTimeout(() => {
            if (!eventReceived) {
                console.log('⏰ No new events received in 5 seconds');
            }
        }, 5000);

        channel.consume(tempQueue.queue, (msg) => {
            if (msg) {
                eventReceived = true;
                clearTimeout(timeout);

                const eventData = JSON.parse(msg.content.toString());
                console.log('\n🎉 LIVE EVENT CAPTURED:');
                console.log('📧 User Email:', eventData.email);
                console.log('🆔 User ID:', eventData.id);
                console.log('⏰ Event Time:', eventData.timestamp);
                console.log('📦 Full Event:', JSON.stringify(eventData, null, 2));

                channel.ack(msg);
            }
        });

        await new Promise(resolve => setTimeout(resolve, 6000));

    } catch (error) {
        console.error('❌ Error checking queue messages:', error);
    } finally {
        if (channel) await channel.close();
        if (connection) await connection.close();
        console.log('\n🔌 Disconnected from RabbitMQ');
    }
}

checkQueueMessages()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('❌ Execution failed:', error);
        process.exit(1);
    });