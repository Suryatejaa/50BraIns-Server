/**
 * Test Notification Service Fix
 * Tests if the notification service can now receive user.login events
 */

const amqp = require('amqplib');

async function testNotificationFix() {
    console.log('🧪 Testing Notification Service Fix...\n');

    let connection = null;
    let channel = null;

    try {
        // Connect to RabbitMQ
        console.log('🔗 Connecting to RabbitMQ...');
        connection = await amqp.connect('amqp://admin:admin123@localhost:5672');
        channel = await connection.createChannel();
        console.log('✅ Connected to RabbitMQ');

        // Assert exchange
        await channel.assertExchange('brains_events', 'topic', { durable: true });
        console.log('✅ Exchange asserted');

        // Create a test queue to listen for notifications
        const testQueue = 'test_notification_queue_' + Date.now();
        await channel.assertQueue(testQueue, { durable: false, autoDelete: true });
        console.log('✅ Test queue created');

        // Bind to user.login events
        await channel.bindQueue(testQueue, 'brains_events', 'user.login');
        console.log('✅ Queue bound to user.login routing key');

        // Start consuming
        console.log('\n📡 Listening for user.login events...');
        await channel.consume(testQueue, (msg) => {
            if (msg) {
                try {
                    const content = JSON.parse(msg.content.toString());
                    console.log('📨 Received user.login event:', {
                        routingKey: msg.fields.routingKey,
                        eventData: content
                    });

                    // Acknowledge the message
                    channel.ack(msg);
                    console.log('✅ Event processed successfully');

                } catch (error) {
                    console.log('❌ Error processing message:', error.message);
                    channel.nack(msg);
                }
            }
        });

        // Wait for events
        console.log('\n⏳ Waiting for user.login events...');
        console.log('💡 Try logging in to your application to trigger an event');

        // Keep listening for 30 seconds
        await new Promise(resolve => setTimeout(resolve, 30000));

    } catch (error) {
        console.log(`❌ Test failed: ${error.message}`);
    } finally {
        if (channel) {
            try {
                await channel.close();
                console.log('\n🔌 Channel closed');
            } catch (error) {
                console.log('❌ Error closing channel:', error.message);
            }
        }

        if (connection) {
            try {
                await connection.close();
                console.log('🔌 Connection closed');
            } catch (error) {
                console.log('❌ Error closing connection:', error.message);
            }
        }

        console.log('\n✅ Test completed');
    }
}

// Run the test
testNotificationFix().catch(console.error);
