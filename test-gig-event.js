const amqp = require('amqplib');

async function testGigEvent() {
    try {
        console.log('🧪 Testing Gig Event Publishing...\n');

        // Connect to RabbitMQ
        const connection = await amqp.connect('amqp://localhost:5672');
        const channel = await connection.createChannel();

        // Assert the exchange
        await channel.assertExchange('gig_events', 'topic', { durable: true });
        console.log('✅ Connected to RabbitMQ and asserted gig_events exchange');

        // Create test gig event
        const gigEvent = {
            gigId: 'test-gig-' + Date.now(),
            gigTitle: 'Test Gig for Notification',
            postedById: 'test-user-123',
            category: 'CREATIVE',
            budgetMin: 100,
            budgetMax: 500,
            roleRequired: 'DESIGNER',
            timestamp: new Date().toISOString(),
            eventId: `gig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            service: 'gig-service'
        };

        console.log('📤 Publishing gig_created event:', gigEvent);

        // Publish the event
        await channel.publish('gig_events', 'gig_created', Buffer.from(JSON.stringify(gigEvent)));
        console.log('✅ Event published successfully');

        // Wait a moment for processing
        console.log('⏳ Waiting for event processing...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Check if notification was created by calling the notification service API
        const axios = require('axios');
        try {
            const response = await axios.get('http://localhost:4009/notifications/test-user-123');
            console.log('📋 Notifications for test user:', response.data);
        } catch (error) {
            console.log('❌ Could not fetch notifications:', error.response?.data || error.message);
        }

        await connection.close();
        console.log('✅ Test completed');

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testGigEvent().catch(console.error); 