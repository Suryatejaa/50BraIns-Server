const WebSocket = require('ws');
const amqp = require('amqplib');

// Test real-time notifications end-to-end
async function testRealtimeNotifications() {
    console.log('🚀 Testing real-time notifications...\n');

    // Step 1: Connect WebSocket client
    console.log('📡 Step 1: Connecting WebSocket client...');
    const userId = 'test-user-123';
    const wsUrl = `ws://localhost:4009?userId=${userId}`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.on('open', () => {
        console.log('✅ WebSocket connected successfully');
        
        // Step 2: Send test RabbitMQ message
        setTimeout(() => {
            console.log('\n📡 Step 2: Sending test RabbitMQ message...');
            sendTestRabbitMQMessage();
        }, 1000);
    });
    
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());
            console.log('📥 Received WebSocket message:', message);
            
            if (message.type === 'notification') {
                console.log('🎉 SUCCESS: Real-time notification received!');
                console.log('   Title:', message.data.title);
                console.log('   Message:', message.data.message);
                console.log('   Event Type:', message.data.data.eventType);
                
                // Close connection after receiving notification
                setTimeout(() => {
                    ws.close();
                    process.exit(0);
                }, 2000);
            }
        } catch (error) {
            console.log('📥 Raw message:', data.toString());
        }
    });
    
    ws.on('close', () => {
        console.log('🔌 WebSocket connection closed');
    });
    
    ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error.message);
    });
}

// Send a test message to RabbitMQ
async function sendTestRabbitMQMessage() {
    try {
        const connection = await amqp.connect('amqp://admin:admin123@localhost:5672');
        const channel = await connection.createChannel();
        
        // Ensure exchange exists
        await channel.assertExchange('brains_events', 'topic', { durable: true });
        
        // Create test event
        const testEvent = {
            eventType: 'gig_created',
            eventId: `test_${Date.now()}`,
            userId: 'test-user-123',
            postedById: 'test-user-123',
            title: 'Test Instagram Reel',
            description: 'This is a test gig for real-time notifications',
            budgetMin: 50,
            budgetMax: 200,
            category: 'content-creation',
            timestamp: new Date().toISOString(),
            service: 'test-service'
        };
        
        // Publish to RabbitMQ
        const message = JSON.stringify(testEvent);
        channel.publish('brains_events', 'gig.event', Buffer.from(message));
        
        console.log('✅ Test message sent to RabbitMQ');
        console.log('   Exchange: brains_events');
        console.log('   Routing Key: gig.event');
        console.log('   Event Type: gig_created');
        
        // Close connection
        setTimeout(() => {
            channel.close();
            connection.close();
        }, 1000);
        
    } catch (error) {
        console.error('❌ Error sending test message:', error.message);
    }
}

// Run the test
testRealtimeNotifications().catch(console.error); 