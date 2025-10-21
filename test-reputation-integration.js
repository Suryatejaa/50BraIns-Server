const amqp = require('amqplib');

async function testReputationIntegration() {
    console.log('🧪 Testing Reputation Service Integration...\n');

    let connection;
    let channel;

    try {
        // Connect to RabbitMQ
        connection = await amqp.connect('amqp://localhost:5672');
        channel = await connection.createChannel();

        // Assert reputation_events exchange exists
        await channel.assertExchange('reputation_events', 'topic', { durable: true });
        console.log('✅ reputation_events exchange exists');

        // Create temporary queue to listen for reputation events
        const testQueue = await channel.assertQueue('', { exclusive: true });

        // Bind to all reputation events
        await channel.bindQueue(testQueue.queue, 'reputation_events', 'gig.*');
        console.log('✅ Test queue bound to reputation events');

        // Listen for events
        const receivedEvents = [];
        console.log('🎧 Listening for reputation events...\n');

        await channel.consume(testQueue.queue, (msg) => {
            if (msg) {
                const routingKey = msg.fields.routingKey;
                const eventData = JSON.parse(msg.content.toString());

                console.log(`📨 Received event: ${routingKey}`);
                console.log('   Data:', JSON.stringify(eventData, null, 2));
                console.log('');

                receivedEvents.push({ routingKey, eventData });
                channel.ack(msg);
            }
        });

        // Test publishing events to reputation service
        console.log('📤 Publishing test events to reputation service...\n');

        // Test 1: Gig Posted Event
        await channel.publish('reputation_events', 'gig.posted', Buffer.from(JSON.stringify({
            gigId: 'test-gig-1',
            clientId: 'test-user-1',
            gigData: {
                title: 'Test Gig for Reputation',
                category: 'testing',
                budgetAmount: 100,
                postedAt: new Date().toISOString()
            }
        })), { persistent: true });
        console.log('✅ Published gig.posted event');

        // Test 2: Gig Completed Event
        await channel.publish('reputation_events', 'gig.completed', Buffer.from(JSON.stringify({
            gigId: 'test-gig-1',
            creatorId: 'test-creator-1',
            clientId: 'test-user-1',
            rating: 4.8,
            completedAt: new Date().toISOString(),
            gigData: {
                title: 'Test Gig for Reputation',
                category: 'testing',
                budgetAmount: 100
            }
        })), { persistent: true });
        console.log('✅ Published gig.completed event');

        // Test 3: Gig Rated Event
        await channel.publish('reputation_events', 'gig.rated', Buffer.from(JSON.stringify({
            gigId: 'test-gig-1',
            ratedUserId: 'test-creator-1',
            rating: 4.8,
            feedback: 'Excellent work!',
            ratedAt: new Date().toISOString()
        })), { persistent: true });
        console.log('✅ Published gig.rated event');

        // Test 4: Application Accepted Event
        await channel.publish('reputation_events', 'gig.application.accepted', Buffer.from(JSON.stringify({
            applicationId: 'test-app-1',
            applicantId: 'test-creator-1',
            gigId: 'test-gig-1',
            clientId: 'test-user-1',
            acceptedAt: new Date().toISOString(),
            quotedPrice: 100
        })), { persistent: true });
        console.log('✅ Published gig.application.accepted event');

        // Wait for events to be processed
        console.log('\n⏳ Waiting 5 seconds for events to be processed...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        console.log(`\n📊 Total events received: ${receivedEvents.length}`);

        if (receivedEvents.length > 0) {
            console.log('✅ Reputation service is receiving events from gig service!');
        } else {
            console.log('❌ Reputation service is not receiving events. Check:');
            console.log('   - Is reputation service running?');
            console.log('   - Is RabbitMQ running?');
            console.log('   - Are the exchanges properly configured?');
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        if (channel) await channel.close();
        if (connection) await connection.close();
    }
}

// Check if reputation service is running
async function checkReputationService() {
    try {
        console.log('🔍 Checking if reputation service is running...');

        // Try to connect to reputation service database
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();

        await prisma.$connect();
        console.log('✅ Reputation service database connection successful');

        // Check if reputation tables exist
        const tables = await prisma.$queryRaw`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('ReputationScore', 'ScoreHistory', 'ActivityLog');
        `;

        console.log('📊 Reputation service tables:', tables.map(t => t.table_name));

        await prisma.$disconnect();

    } catch (error) {
        console.log('❌ Reputation service database check failed:', error.message);
        console.log('💡 Make sure reputation service is set up and running');
    }
}

// Run tests
async function runTests() {
    await checkReputationService();
    console.log('\n' + '='.repeat(60) + '\n');
    await testReputationIntegration();
}

runTests().catch(console.error);