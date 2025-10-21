#!/usr/bin/env node

/**
 * Test script to manually publish a user.registered event
 * This tests if the user service can receive events from auth service
 * Run with: node test-auth-event.js
 */

const amqp = require('amqplib');

async function testAuthEvent() {
    const url = process.env.RABBITMQ_URL || 'amqp://admin:admin123@localhost:5672';

    try {
        console.log('🔍 Testing auth event publishing...');

        // Connect to RabbitMQ
        const connection = await amqp.connect(url);
        console.log('✅ RabbitMQ connection successful');

        // Create channel
        const channel = await connection.createChannel();
        console.log('✅ Channel creation successful');

        // Ensure brains_events exchange exists
        await channel.assertExchange('brains_events', 'topic', { durable: true });
        console.log('✅ brains_events exchange exists');

        // Create test user data
        const testUser = {
            id: 'test-user-' + Date.now(),
            email: 'test@example.com',
            username: 'testuser',
            roles: ['USER'],
            isActive: true,
            status: 'ACTIVE',
            emailVerified: false,
            createdAt: new Date().toISOString()
        };

        // Publish user.registered event
        const message = JSON.stringify({
            ...testUser,
            eventType: 'user.registered',
            timestamp: new Date().toISOString(),
            eventId: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            service: 'auth-service'
        });

        await channel.publish('brains_events', 'user.registered', Buffer.from(message));
        console.log('✅ Published user.registered event to brains_events exchange');
        console.log('📤 Message:', message);

        // Wait a bit to see if user service processes it
        console.log('⏳ Waiting 5 seconds for user service to process...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Clean up
        await channel.close();
        await connection.close();
        console.log('✅ Test completed');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

// Run the test
testAuthEvent();
