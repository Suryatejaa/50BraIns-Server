const axios = require('axios');

async function testNotificationService() {
    console.log('🧪 Testing Notification Service...\n');

    try {
        // Test 1: Check service health
        console.log('1. Checking notification service health...');
        const healthResponse = await axios.get('http://localhost:4005/health');
        console.log('✅ Notification service is healthy:', healthResponse.data.status);

        // Test 2: Try to create a notification directly
        console.log('\n2. Creating a test notification...');
        const createResponse = await axios.post('http://localhost:4005/notifications', {
            userId: 'test-user-123',
            type: 'TRANSACTIONAL',
            category: 'SYSTEM',
            title: 'Test Notification',
            message: 'This is a test notification to verify the system is working',
            metadata: { test: true, timestamp: new Date().toISOString() }
        });
        console.log('✅ Notification created successfully:', createResponse.data.success);

        // Test 3: Check if the notification appears in the list
        console.log('\n3. Checking if notification appears in list...');
        const listResponse = await axios.get('http://localhost:4005/notifications/test-user-123');
        console.log('📋 Notifications for test user:', listResponse.data);

        // Test 4: Check notification count
        console.log('\n4. Checking notification count...');
        const countResponse = await axios.get('http://localhost:4005/notifications/count/test-user-123');
        console.log('📊 Notification count:', countResponse.data);

        // Test 5: Check other services are running
        console.log('\n5. Checking other services...');
        const services = [
            { name: 'Clan Service', url: 'http://localhost:4003/health' },
            { name: 'Gig Service', url: 'http://localhost:4004/health' },
            { name: 'Credit Service', url: 'http://localhost:4006/health' }
        ];

        for (const service of services) {
            try {
                const response = await axios.get(service.url);
                console.log(`✅ ${service.name} is running`);
            } catch (error) {
                console.log(`❌ ${service.name} is not running`);
            }
        }

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response headers:', error.response.headers);
        }
    }
}

// Test the notification consumer directly
async function testNotificationConsumer() {
    console.log('\n🧪 Testing Notification Consumer...\n');

    try {
        // Import the notification consumer
        const { NotificationConsumer } = require('./src/consumers/notificationConsumer');
        const consumer = new NotificationConsumer();

        // Test creating a notification directly through the consumer
        console.log('📤 Creating notification through consumer...');
        const notification = await consumer.createAndSendNotification({
            userId: 'test-consumer-user',
            type: 'TRANSACTIONAL',
            category: 'SYSTEM',
            title: 'Consumer Test Notification',
            message: 'This notification was created directly through the consumer',
            metadata: { test: true, method: 'consumer' }
        });

        console.log('✅ Notification created through consumer:', notification.id);

        // Check if it appears in the list
        const listResponse = await axios.get('http://localhost:4005/notifications/test-consumer-user');
        console.log('📋 Notifications after consumer test:', listResponse.data);

    } catch (error) {
        console.error('❌ Consumer test failed:', error.message);
    }
}

// Test event handlers
async function testEventHandlers() {
    console.log('\n🧪 Testing Event Handlers...\n');

    try {
        const { NotificationConsumer } = require('./src/consumers/notificationConsumer');
        const consumer = new NotificationConsumer();

        // Test gig completed event
        console.log('📤 Testing gig.completed event handler...');
        await consumer.handleGigCompleted({
            gigId: 'test-gig-123',
            userId: 'test-user-123',
            clientId: 'test-client-123',
            gigData: {
                title: 'Test Gig',
                description: 'Test gig for notification testing',
                category: 'CREATIVE'
            },
            completionData: {
                completedAt: new Date().toISOString(),
                rating: 5,
                feedback: 'Great work!'
            }
        });
        console.log('✅ Gig completed event handled');

        // Test clan joined event
        console.log('📤 Testing clan.member.joined event handler...');
        await consumer.handleClanJoined({
            clanId: 'test-clan-123',
            userId: 'test-user-123',
            clanName: 'Test Clan',
            role: 'MEMBER'
        });
        console.log('✅ Clan joined event handled');

        // Test credit event
        console.log('📤 Testing boost.event handler...');
        await consumer.handleBoostEvent({
            userId: 'test-user-123',
            boostType: 'GIG_BOOST',
            targetId: 'test-gig-123',
            duration: 24,
            creditsSpent: 50
        });
        console.log('✅ Boost event handled');

        // Check notifications
        const notificationsResponse = await axios.get('http://localhost:4005/notifications/test-user-123');
        console.log('📋 Notifications after event handlers:', notificationsResponse.data);

    } catch (error) {
        console.error('❌ Event handlers test failed:', error.message);
    }
}

// Run all tests
async function runAllTests() {
    console.log('🚀 Starting Notification Service Tests...\n');
    
    await testNotificationService();
    await testNotificationConsumer();
    await testEventHandlers();
    
    console.log('\n✨ All tests completed!');
}

runAllTests().catch(console.error); 