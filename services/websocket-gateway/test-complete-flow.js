/**
 * Test Complete Notification Flow
 * Tests the entire flow: RabbitMQ → Notification Service → WebSocket → Client
 */

const amqp = require('amqplib');
const WebSocket = require('ws');

async function testCompleteFlow() {
    console.log('🧪 Testing Complete Notification Flow...\n');

    let rabbitmqConnection = null;
    let rabbitmqChannel = null;
    let wsClient = null;

    try {
        // Step 1: Connect to RabbitMQ
        console.log('🔗 Step 1: Connecting to RabbitMQ...');
        rabbitmqConnection = await amqp.connect('amqp://admin:admin123@localhost:5672');
        rabbitmqChannel = await rabbitmqConnection.createChannel();
        console.log('✅ Connected to RabbitMQ');

        // Step 2: Assert exchanges
        await rabbitmqChannel.assertExchange('gig_events', 'topic', { durable: true });
        console.log('✅ Gig events exchange asserted');

        // Step 3: Connect to Notification Service WebSocket
        console.log('\n🔌 Step 2: Connecting to Notification Service WebSocket...');
        const userId = 'test-user-' + Date.now();
        const wsUrl = `ws://localhost:4009/ws?userId=${userId}`;

        wsClient = new WebSocket(wsUrl);

        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('WebSocket connection timeout'));
            }, 10000);

            wsClient.on('open', () => {
                clearTimeout(timeout);
                console.log('✅ WebSocket connected to Notification Service');
                resolve();
            });

            wsClient.on('error', (error) => {
                clearTimeout(timeout);
                reject(error);
            });
        });

        // Step 4: Listen for WebSocket messages
        let notificationReceived = false;
        wsClient.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                console.log('📨 Received WebSocket message:', message);

                if (message.type === 'notification') {
                    notificationReceived = true;
                    console.log('✅ Notification received via WebSocket!');
                    console.log('📋 Notification details:', {
                        title: message.data.title,
                        message: message.data.message,
                        category: message.data.category
                    });
                }
            } catch (error) {
                console.log('❌ Error parsing WebSocket message:', error.message);
            }
        });

        // Step 5: Publish a test event to RabbitMQ
        console.log('\n📤 Step 3: Publishing test event to RabbitMQ...');
        const testEvent = {
            gigId: 'test-gig-' + Date.now(),
            applicationId: 'test-application-' + Date.now(),
            applicantId: userId,
            applicantType: 'user',
            gigOwnerId: 'test-owner-' + Date.now(),
            quotedPrice: 100,
            eventType: 'application_submitted',
            timestamp: new Date().toISOString(),
            eventId: 'test_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            service: 'gig-service'
        };

        await rabbitmqChannel.publish('gig_events', 'gig.event', Buffer.from(JSON.stringify(testEvent)));
        console.log('✅ Test event published to RabbitMQ');
        console.log('📋 Event details:', {
            routingKey: 'gig.event',
            eventType: testEvent.eventType,
            applicantId: testEvent.applicantId
        });

        // Step 6: Wait for notification
        console.log('\n⏳ Step 4: Waiting for notification...');
        console.log('💡 The Notification Service should:');
        console.log('   1. Receive the RabbitMQ event');
        console.log('   2. Process it and create a notification');
        console.log('   3. Send it via WebSocket to the connected client');

        // Wait for up to 30 seconds
        await new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (notificationReceived) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 1000);

            setTimeout(() => {
                clearInterval(checkInterval);
                if (!notificationReceived) {
                    console.log('⚠️ No notification received within 30 seconds');
                }
                resolve();
            }, 30000);
        });

        // Step 7: Summary
        console.log('\n📊 Test Summary:');
        if (notificationReceived) {
            console.log('✅ SUCCESS: Complete notification flow working!');
            console.log('   RabbitMQ → Notification Service → WebSocket → Client');
        } else {
            console.log('❌ FAILED: Notification flow incomplete');
            console.log('   Check Notification Service logs for errors');
        }

    } catch (error) {
        console.log(`❌ Test failed: ${error.message}`);
        console.log('💡 Troubleshooting tips:');
        console.log('   • Make sure Notification Service is running on port 4009');
        console.log('   • Check Notification Service logs for errors');
        console.log('   • Verify RabbitMQ is running and accessible');
        console.log('   • Check if WebSocket server is properly initialized');
    } finally {
        // Cleanup
        if (wsClient) {
            wsClient.close();
            console.log('\n🔌 WebSocket client closed');
        }

        if (rabbitmqChannel) {
            try {
                await rabbitmqChannel.close();
                console.log('🔌 RabbitMQ channel closed');
            } catch (error) {
                console.log('❌ Error closing RabbitMQ channel:', error.message);
            }
        }

        if (rabbitmqConnection) {
            try {
                await rabbitmqConnection.close();
                console.log('🔌 RabbitMQ connection closed');
            } catch (error) {
                console.log('❌ Error closing RabbitMQ connection:', error.message);
            }
        }

        console.log('\n✅ Test completed');
    }
}

// Run the test
testCompleteFlow().catch(console.error);
