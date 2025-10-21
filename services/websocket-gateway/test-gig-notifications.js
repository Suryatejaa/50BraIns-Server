/**
 * Test Gig Notifications Fix
 * Verifies that the Notification Service can now receive gig events from the Gig Service
 */

const amqp = require('amqplib');

async function testGigNotifications() {
    console.log('🧪 Testing Gig Notifications Fix...\n');

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
        await channel.assertExchange('brains_events', 'topic', { durable: true });
        console.log('✅ Exchanges asserted');

        // Create test queues to listen for gig events
        const gigTestQueue = 'test_gig_queue_' + Date.now();
        const clanTestQueue = 'test_clan_queue_' + Date.now();

        await channel.assertQueue(gigTestQueue, { durable: false, autoDelete: true });
        await channel.assertQueue(clanTestQueue, { durable: false, autoDelete: true });
        console.log('✅ Test queues created');

        // Bind to gig events
        await channel.bindQueue(gigTestQueue, 'gig_events', 'gig_created');
        await channel.bindQueue(gigTestQueue, 'gig_events', 'application_submitted');
        await channel.bindQueue(gigTestQueue, 'gig_events', 'gig_assigned');
        console.log('✅ Gig test queue bound to gig events');

        // Bind to clan events
        await channel.bindQueue(clanTestQueue, 'brains_events', 'clan.created');
        await channel.bindQueue(clanTestQueue, 'brains_events', 'clan.member.joined');
        console.log('✅ Clan test queue bound to clan events');

        // Start consuming from gig queue
        console.log('\n📡 Listening for gig events...');
        await channel.consume(gigTestQueue, (msg) => {
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

        // Start consuming from clan queue
        console.log('📡 Listening for clan events...');
        await channel.consume(clanTestQueue, (msg) => {
            if (msg) {
                try {
                    const content = JSON.parse(msg.content.toString());
                    console.log('📨 Received clan event:', {
                        routingKey: msg.fields.routingKey,
                        eventData: content,
                        timestamp: new Date().toISOString()
                    });

                    channel.ack(msg);
                    console.log('✅ Clan event processed successfully');

                } catch (error) {
                    console.log('❌ Error processing clan message:', error.message);
                    channel.nack(msg);
                }
            }
        });

        // Wait for events
        console.log('\n⏳ Waiting for events...');
        console.log('💡 Try creating a gig or clan in your application to trigger events');
        console.log('💡 Or wait for the test to complete');

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
testGigNotifications().catch(console.error);
