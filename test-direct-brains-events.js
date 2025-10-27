#!/usr/bin/env node

/**
 * Test direct binding to brains_events exchange to catch user.login events
 */

const amqp = require('amqplib');

async function testDirectBinding() {
    console.log('🔍 Testing direct brains_events.user.login binding...\n');

    let connection;
    let channel;

    try {
        const rabbitmqUrl = process.env.RABBITMQ_URL ||
            'amqps://mahifqgz:UTImWgOvCaa-95mb9DZL4X83mydMV9qt@armadillo.rmq.cloudamqp.com/mahifqgz';

        console.log('🔌 Connecting to RabbitMQ...');
        connection = await amqp.connect(rabbitmqUrl);
        channel = await connection.createChannel();

        // Create a test queue that directly binds to the brains_events exchange
        const testQueue = await channel.assertQueue('test_direct_binding', {
            exclusive: false,
            autoDelete: true
        });

        console.log('📦 Created test queue:', testQueue.queue);

        // Bind to brains_events exchange with user.login routing key
        await channel.bindQueue(testQueue.queue, 'brains_events', 'user.login');
        console.log('🔗 Bound to brains_events.user.login');

        // Also bind to catch ALL events from brains_events
        await channel.bindQueue(testQueue.queue, 'brains_events', '#');
        console.log('🔗 Bound to brains_events.# (all events)');

        console.log('\n👂 Listening for events from brains_events exchange...');
        console.log('📧 Please login again with: raju@gmail.com / Surya@123');
        console.log('⏰ Monitoring for 60 seconds...\n');

        let eventCount = 0;

        const timeout = setTimeout(() => {
            console.log(`\n⏰ Timeout reached. Captured ${eventCount} events.`);
            if (eventCount === 0) {
                console.log('❌ No events received - auth service may not be publishing to brains_events exchange');
                console.log('💡 Check auth service RabbitMQ configuration');
            }
        }, 60000);

        channel.consume(testQueue.queue, (msg) => {
            if (msg) {
                eventCount++;
                clearTimeout(timeout);

                const eventData = JSON.parse(msg.content.toString());
                console.log(`\n🎉 EVENT #${eventCount} CAPTURED:`);
                console.log('📊 Routing Key:', msg.fields.routingKey);
                console.log('🏭 Exchange:', msg.fields.exchange);
                console.log('📧 User Email:', eventData.email || 'N/A');
                console.log('🆔 User ID:', eventData.id || 'N/A');
                console.log('🔑 Event ID:', eventData.eventId || 'N/A');
                console.log('⏰ Timestamp:', eventData.timestamp || eventData.loginAt || 'N/A');
                console.log('🔍 Event Type:', eventData.eventType || 'N/A');
                console.log('🏷️ Service:', eventData.service || 'N/A');
                console.log('📦 Full Event:', JSON.stringify(eventData, null, 2));

                channel.ack(msg);

                // Continue listening for more events
                setTimeout(() => {
                    console.log('\n👂 Still listening for more events...');
                }, 1000);
            }
        });

        await new Promise(resolve => setTimeout(resolve, 61000));

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        if (channel) await channel.close();
        if (connection) await connection.close();
        console.log('\n🔌 Disconnected from RabbitMQ');
    }
}

testDirectBinding()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('❌ Execution failed:', error);
        process.exit(1);
    });