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

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response headers:', error.response.headers);
        }
    }
}

// Run the test
testNotificationService().catch(console.error); 