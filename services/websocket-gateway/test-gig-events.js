/**
 * Test Gig Events Routing
 * Verifies that gig events are properly routed to the Notification Service
 */

const amqp = require('amqplib');

async function testGigEvents() {
    console.log('🧪 Testing Gig Events Routing...\n');

    let connection = null;
    let channel = null;

    try {
        // Connect to RabbitMQ
        console.log('🔗 Connecting to RabbitMQ...');
        connection = await amqp.connect('amqp://admin:admin123@localhost:5672');
        channel = await connection.createChannel();
        console.log('✅ Connected to RabbitMQ');

        // Assert exchanges
        await channel.assertExchange('gig_events', 'topic', { durable: true });
        console.log('✅ Gig events exchange asserted');

        // Create a test queue to listen for gig events
        const testQueue = 'test_gig_events_' + Date.now();
        await channel.assertQueue(testQueue, { durable: false, autoDelete: true });
        console.log('✅ Test queue created');

        // Bind to specific gig events that should trigger notifications
        await channel.bindQueue(testQueue, 'gig_events', 'application_submitted');
        await channel.bindQueue(testQueue, 'gig_events', 'application_accepted');
        await channel.bindQueue(testQueue, 'gig_events', 'gig_created');
        console.log('✅ Test queue bound to gig events');

        // Start consuming
        console.log('\n📡 Listening for gig events...');
        await channel.consume(testQueue, (msg) => {
            if (msg) {
                try {
                    const content = JSON.parse(msg.content.toString());
                    console.log('📨 Received gig event:', {
                        routingKey: msg.fields.routingKey,
                        eventData: content,
                        timestamp: new Date().toISOString()
                    });

                    channel.ack(msg);
                    console.log('✅ Gig event processed successfully');

                } catch (error) {
                    console.log('❌ Error processing gig message:', error.message);
                    channel.nack(msg);
                }
            }
        });

        // Wait for events
        console.log('\n⏳ Waiting for gig events...');
        console.log('💡 Try applying for a gig or approving a gig in your application');
        console.log('💡 This should trigger application_submitted or application_accepted events');

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
testGigEvents().catch(console.error);
