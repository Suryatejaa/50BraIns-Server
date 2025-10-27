#!/usr/bin/env node

/**
 * Monitor Real Login Events
 * 
 * This script monitors the actual user.login events being published by auth service
 */

const amqp = require('amqplib');

async function monitorLoginEvents() {
    console.log('🔍 Monitoring Real Login Events from Auth Service...\n');

    let connection;
    let channel;

    try {
        // Connect to RabbitMQ with the same URL as services
        const rabbitmqUrl = process.env.RABBITMQ_URL ||
            'amqps://mahifqgz:UTImWgOvCaa-95mb9DZL4X83mydMV9qt@armadillo.rmq.cloudamqp.com/mahifqgz';

        console.log('🔌 Connecting to RabbitMQ...');
        connection = await amqp.connect(rabbitmqUrl);
        channel = await connection.createChannel();

        // Setup monitoring queue to intercept user.login events
        console.log('🎧 Setting up login event monitor...');

        const monitorQueue = await channel.assertQueue('login_monitor', {
            exclusive: true,
            autoDelete: true
        });

        // Bind to user.login events from brains_events exchange
        await channel.bindQueue(monitorQueue.queue, 'brains_events', 'user.login');

        console.log('✅ Login monitor setup complete');
        console.log('👂 Listening for real user.login events...\n');

        let eventCount = 0;

        await channel.consume(monitorQueue.queue, (msg) => {
            if (msg) {
                eventCount++;
                const routingKey = msg.fields.routingKey;
                const eventData = JSON.parse(msg.content.toString());

                console.log(`\n📨 [Login Event ${eventCount}] Captured: ${routingKey}`);
                console.log(`📊 Exchange: ${msg.fields.exchange}`);
                console.log(`🕐 Timestamp: ${new Date().toISOString()}`);
                console.log(`👤 User Email: ${eventData.email}`);
                console.log(`🆔 User ID: ${eventData.id}`);
                console.log(`🔑 Login Method: ${eventData.loginMethod}`);
                console.log(`📄 Full Event Data:`, JSON.stringify(eventData, null, 2));

                // Check if this event should trigger a notification
                if (eventData.id && eventData.email && eventData.loginAt) {
                    console.log('✅ Event has all required fields for notification creation');

                    // Log what notification should be created
                    console.log('\n📝 Expected Notification:');
                    console.log(`   Title: 🔐 Login Detected`);
                    console.log(`   Message: New login detected from ${eventData.loginMethod || 'unknown method'} on ${eventData.loginAt}`);
                    console.log(`   User ID: ${eventData.id}`);
                    console.log(`   Type: SYSTEM`);
                    console.log(`   Category: USER`);
                } else {
                    console.log('⚠️ Event is missing required fields for notification');
                    console.log(`   Missing: ${!eventData.id ? 'id ' : ''}${!eventData.email ? 'email ' : ''}${!eventData.loginAt ? 'loginAt' : ''}`);
                }

                console.log('\n' + '='.repeat(60));

                channel.ack(msg);
            }
        });

        // Keep monitoring for 2 minutes
        console.log('⏳ Monitoring for 2 minutes... Please login with the provided credentials now.\n');
        console.log('📧 Login with: raju@gmail.com');
        console.log('🔑 Password: Surya@123');
        console.log('\n💡 If you see events here but no notifications are created,');
        console.log('   then the notification service is not consuming the events properly.\n');

        // Wait for 2 minutes
        await new Promise(resolve => setTimeout(resolve, 120000));

        console.log(`\n📊 Summary:`);
        console.log(`📨 Total login events captured: ${eventCount}`);

        if (eventCount === 0) {
            console.log('\n❌ No login events were captured during monitoring');
            console.log('💡 Possible issues:');
            console.log('   1. Auth service is not publishing user.login events');
            console.log('   2. Events are being published to wrong exchange');
            console.log('   3. Routing key mismatch');
            console.log('   4. RabbitMQ connection issues');
        } else {
            console.log('\n✅ Login events are being published correctly');
            console.log('💡 Next steps:');
            console.log('   1. Check notification service logs for event processing');
            console.log('   2. Verify notification service queue bindings');
            console.log('   3. Check database for created notifications');
        }

    } catch (error) {
        console.error('❌ Monitor failed:', error);
    } finally {
        if (channel) await channel.close();
        if (connection) await connection.close();
        console.log('\n🔌 Disconnected from RabbitMQ');
    }
}

if (require.main === module) {
    monitorLoginEvents()
        .then(() => process.exit(0))
        .catch(error => {
            console.error('❌ Monitor execution failed:', error);
            process.exit(1);
        });
}

module.exports = { monitorLoginEvents };