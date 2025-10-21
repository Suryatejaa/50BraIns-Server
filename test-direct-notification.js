const axios = require('axios');

async function testDirectNotification() {
    console.log('🧪 Testing Direct Notification Creation...\n');

    try {
        // Test 1: Check if notification service is responding
        console.log('1. Checking notification service health...');
        const healthResponse = await axios.get('http://localhost:4005/health');
        console.log('✅ Notification service is healthy:', healthResponse.data);

        // Test 2: Try to create a notification directly
        console.log('\n2. Creating a test notification...');
        const createResponse = await axios.post('http://localhost:4005/notifications', {
            userId: 'test-user-123',
            type: 'ALERT',
            category: 'SYSTEM',
            title: 'Test Notification',
            message: 'This is a test notification to verify the system is working',
            metadata: { test: true, timestamp: new Date().toISOString() }
        });
        console.log('✅ Notification created:', createResponse.data);

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

// Test RabbitMQ connection
async function testRabbitMQConnection() {
    console.log('\n🧪 Testing RabbitMQ Connection...\n');

    try {
        const amqp = require('amqplib');
        
        // Connect to RabbitMQ
        const connection = await amqp.connect('amqp://localhost:5672');
        console.log('✅ Connected to RabbitMQ');
        
        const channel = await connection.createChannel();
        console.log('✅ Channel created');
        
        // Check if exchanges exist
        const exchanges = ['brains_events', 'gig_events', 'credit_events', 'reputation_events'];
        for (const exchange of exchanges) {
            try {
                await channel.checkExchange(exchange);
                console.log(`✅ Exchange '${exchange}' exists`);
            } catch (err) {
                console.log(`❌ Exchange '${exchange}' does not exist`);
            }
        }
        
        await connection.close();
        console.log('✅ RabbitMQ connection closed');
        
    } catch (error) {
        console.error('❌ RabbitMQ test failed:', error.message);
    }
}

// Test database connection
async function testDatabaseConnection() {
    console.log('\n🧪 Testing Database Connection...\n');

    try {
        // Try to connect to the notification service database
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        
        // Test database connection
        await prisma.$connect();
        console.log('✅ Database connection successful');
        
        // Try to create a test notification
        const testNotification = await prisma.notification.create({
            data: {
                userId: 'test-db-user',
                type: 'SYSTEM',
                category: 'SYSTEM',
                title: 'Database Test',
                message: 'Testing database connection and write operations',
                metadata: { test: true }
            }
        });
        console.log('✅ Database write successful:', testNotification.id);
        
        // Clean up
        await prisma.notification.delete({
            where: { id: testNotification.id }
        });
        console.log('✅ Database cleanup successful');
        
        await prisma.$disconnect();
        console.log('✅ Database connection closed');
        
    } catch (error) {
        console.error('❌ Database test failed:', error.message);
    }
}

// Run all tests
async function runAllTests() {
    console.log('🚀 Starting Direct Notification Tests...\n');
    
    await testDirectNotification();
    await testRabbitMQConnection();
    await testDatabaseConnection();
    
    console.log('\n✨ All tests completed!');
}

runAllTests().catch(console.error); 