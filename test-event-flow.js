const axios = require('axios');
const amqp = require('amqplib');

// Test the complete event flow
async function testEventFlow() {
    console.log('🧪 Testing Complete Event Flow...\n');

    try {
        // Test 1: Check all services are running
        console.log('1. Checking service health...');
        
        const services = [
            { name: 'Clan Service', url: 'http://localhost:4003/health' },
            { name: 'Gig Service', url: 'http://localhost:4004/health' },
            { name: 'Notification Service', url: 'http://localhost:4005/health' },
            { name: 'Credit Service', url: 'http://localhost:4006/health' },
            { name: 'Auth Service', url: 'http://localhost:4001/health' }
        ];

        for (const service of services) {
            try {
                const response = await axios.get(service.url);
                console.log(`✅ ${service.name} is running`);
            } catch (error) {
                console.log(`❌ ${service.name} is not running`);
            }
        }

        // Test 2: Check RabbitMQ exchanges
        console.log('\n2. Checking RabbitMQ exchanges...');
        await checkRabbitMQExchanges();

        // Test 3: Test direct event publishing
        console.log('\n3. Testing direct event publishing...');
        await testDirectEventPublishing();

        // Test 4: Test notification service directly
        console.log('\n4. Testing notification service directly...');
        await testNotificationServiceDirectly();

        // Test 5: Check current notifications
        console.log('\n5. Checking current notifications...');
        await checkCurrentNotifications();

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

async function checkRabbitMQExchanges() {
    try {
        const connection = await amqp.connect('amqp://localhost:5672');
        const channel = await connection.createChannel();

        const exchanges = [
            'gig_events',
            'brains_events', 
            'credit_events',
            'reputation_events',
            'notifications'
        ];

        for (const exchange of exchanges) {
            try {
                await channel.checkExchange(exchange);
                console.log(`✅ Exchange '${exchange}' exists`);
            } catch (err) {
                console.log(`❌ Exchange '${exchange}' does not exist`);
            }
        }

        await connection.close();
    } catch (error) {
        console.error('❌ RabbitMQ check failed:', error.message);
    }
}

async function testDirectEventPublishing() {
    try {
        const connection = await amqp.connect('amqp://localhost:5672');
        const channel = await connection.createChannel();

        // Test 1: Publish a gig event
        console.log('📤 Publishing gig.completed event...');
        const gigEvent = {
            gigId: 'test-gig-123',
            userId: 'test-user-123',
            clientId: 'test-client-123',
            gigData: {
                title: 'Test Gig',
                description: 'Test gig for notification testing',
                category: 'CREATIVE',
                skills: ['design', 'illustration'],
                budgetRange: '100-500',
                roleRequired: 'DESIGNER'
            },
            completionData: {
                completedAt: new Date().toISOString(),
                rating: 5,
                feedback: 'Great work!',
                withinBudget: true,
                actualAmount: 300
            },
            deliveryData: {
                onTime: true,
                deliveryTime: '2 days',
                portfolioItems: []
            },
            timestamp: new Date().toISOString(),
            eventId: `gig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            service: 'gig-service'
        };

        await channel.publish('gig_events', 'gig.completed', Buffer.from(JSON.stringify(gigEvent)));
        console.log('✅ Gig event published');

        // Test 2: Publish a clan event
        console.log('📤 Publishing clan.member.joined event...');
        const clanEvent = {
            clanId: 'test-clan-123',
            userId: 'test-user-123',
            clanName: 'Test Clan',
            role: 'MEMBER',
            joinedAt: new Date().toISOString(),
            timestamp: new Date().toISOString(),
            eventId: `clan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            service: 'clan-service'
        };

        await channel.publish('brains_events', 'clan.member.joined', Buffer.from(JSON.stringify(clanEvent)));
        console.log('✅ Clan event published');

        // Test 3: Publish a credit event
        console.log('📤 Publishing boost.event...');
        const creditEvent = {
            userId: 'test-user-123',
            boostType: 'GIG_BOOST',
            targetId: 'test-gig-123',
            duration: 24,
            creditsSpent: 50,
            timestamp: new Date().toISOString(),
            eventId: `credit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            service: 'credit-service'
        };

        await channel.publish('credit_events', 'boost.event', Buffer.from(JSON.stringify(creditEvent)));
        console.log('✅ Credit event published');

        await connection.close();

        // Wait for events to be processed
        console.log('⏳ Waiting for events to be processed...');
        await new Promise(resolve => setTimeout(resolve, 3000));

    } catch (error) {
        console.error('❌ Direct event publishing failed:', error.message);
    }
}

async function testNotificationServiceDirectly() {
    try {
        // Test creating a notification directly via API
        console.log('📤 Creating notification directly...');
        const createResponse = await axios.post('http://localhost:4005/notifications', {
            userId: 'test-user-123',
            type: 'TRANSACTIONAL',
            category: 'SYSTEM',
            title: 'Direct Test Notification',
            message: 'This is a test notification created directly via API',
            metadata: { test: true, timestamp: new Date().toISOString() }
        });
        console.log('✅ Direct notification created:', createResponse.data.success);

    } catch (error) {
        console.error('❌ Direct notification test failed:', error.response?.data || error.message);
    }
}

async function checkCurrentNotifications() {
    try {
        // Check notifications for test user
        const notificationsResponse = await axios.get('http://localhost:4005/notifications/test-user-123');
        console.log('📋 Current notifications:', notificationsResponse.data);

        // Check notification count
        const countResponse = await axios.get('http://localhost:4005/notifications/count/test-user-123');
        console.log('📊 Notification count:', countResponse.data);

    } catch (error) {
        console.error('❌ Notification check failed:', error.response?.data || error.message);
    }
}

// Test specific service events
async function testServiceEvents() {
    console.log('\n🧪 Testing Service-Specific Events...\n');

    try {
        // Test Gig Service events
        console.log('1. Testing Gig Service events...');
        await testGigServiceEvents();

        // Test Clan Service events
        console.log('\n2. Testing Clan Service events...');
        await testClanServiceEvents();

        // Test Credit Service events
        console.log('\n3. Testing Credit Service events...');
        await testCreditServiceEvents();

    } catch (error) {
        console.error('❌ Service events test failed:', error.message);
    }
}

async function testGigServiceEvents() {
    try {
        // Test gig application submission
        const applicationEvent = {
            gigId: 'test-gig-456',
            userId: 'test-user-456',
            applicationId: 'test-app-456',
            proposal: 'I can help with this project',
            quotedPrice: 250,
            estimatedTime: '3 days',
            applicantType: 'user',
            timestamp: new Date().toISOString(),
            eventId: `gig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            service: 'gig-service'
        };

        const connection = await amqp.connect('amqp://localhost:5672');
        const channel = await connection.createChannel();
        
        await channel.publish('gig_events', 'gig.application.submitted', Buffer.from(JSON.stringify(applicationEvent)));
        console.log('✅ Gig application event published');
        
        await connection.close();
        
        // Wait for processing
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check notifications
        const notificationsResponse = await axios.get('http://localhost:4005/notifications/test-user-456');
        console.log('📋 Notifications after gig event:', notificationsResponse.data);

    } catch (error) {
        console.error('❌ Gig service events test failed:', error.message);
    }
}

async function testClanServiceEvents() {
    try {
        // Test clan join request
        const joinRequestEvent = {
            clanId: 'test-clan-456',
            userId: 'test-user-456',
            clanName: 'Test Clan 456',
            message: 'I would like to join this clan',
            timestamp: new Date().toISOString(),
            eventId: `clan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            service: 'clan-service'
        };

        const connection = await amqp.connect('amqp://localhost:5672');
        const channel = await connection.createChannel();
        
        await channel.publish('brains_events', 'clan.join_request.submitted', Buffer.from(JSON.stringify(joinRequestEvent)));
        console.log('✅ Clan join request event published');
        
        await connection.close();
        
        // Wait for processing
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check notifications
        const notificationsResponse = await axios.get('http://localhost:4005/notifications/test-user-456');
        console.log('📋 Notifications after clan event:', notificationsResponse.data);

    } catch (error) {
        console.error('❌ Clan service events test failed:', error.message);
    }
}

async function testCreditServiceEvents() {
    try {
        // Test credit purchase
        const creditEvent = {
            userId: 'test-user-456',
            eventType: 'CREDITS_PURCHASED',
            amount: 100,
            newBalance: 150,
            timestamp: new Date().toISOString(),
            eventId: `credit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            service: 'credit-service'
        };

        const connection = await amqp.connect('amqp://localhost:5672');
        const channel = await connection.createChannel();
        
        await channel.publish('credit_events', 'credit.event', Buffer.from(JSON.stringify(creditEvent)));
        console.log('✅ Credit event published');
        
        await connection.close();
        
        // Wait for processing
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check notifications
        const notificationsResponse = await axios.get('http://localhost:4005/notifications/test-user-456');
        console.log('📋 Notifications after credit event:', notificationsResponse.data);

    } catch (error) {
        console.error('❌ Credit service events test failed:', error.message);
    }
}

// Run all tests
async function runAllTests() {
    console.log('🚀 Starting Complete Event Flow Tests...\n');
    
    await testEventFlow();
    await testServiceEvents();
    
    console.log('\n✨ All tests completed!');
}

runAllTests().catch(console.error); 