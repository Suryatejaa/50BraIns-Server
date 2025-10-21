#!/usr/bin/env node

/**
 * Test script to verify RabbitMQ integration
 * Run with: node test-rabbitmq-integration.js
 */

const amqp = require('amqplib');

async function testRabbitMQConnection() {
    const url = process.env.RABBITMQ_URL || 'amqp://admin:admin123@localhost:5672';

    try {
        console.log('🔍 Testing RabbitMQ connection...');

        // Test connection
        const connection = await amqp.connect(url);
        console.log('✅ RabbitMQ connection successful');

        // Test channel creation
        const channel = await connection.createChannel();
        console.log('✅ Channel creation successful');

        // Test exchange assertion
        await channel.assertExchange('brains_events', 'topic', { durable: true });
        console.log('✅ brains_events exchange exists');

        await channel.assertExchange('user_events', 'topic', { durable: true });
        console.log('✅ user_events exchange exists');

        // Test queue creation
        const testQueue = 'test_user_service_queue';
        await channel.assertQueue(testQueue, { durable: true });
        console.log('✅ Queue creation successful');

        // Test message publishing
        const testMessage = {
            id: 'test-user-123',
            email: 'test@example.com',
            username: 'testuser',
            roles: ['USER'],
            isActive: true,
            status: 'ACTIVE',
            emailVerified: false,
            createdAt: new Date().toISOString()
        };

        await channel.publish('brains_events', 'user.registered', Buffer.from(JSON.stringify(testMessage)));
        console.log('✅ Message published to brains_events exchange');

        // Test message consumption
        await channel.consume(testQueue, (msg) => {
            if (msg) {
                const content = JSON.parse(msg.content.toString());
                console.log('📨 Received test message:', content);
                channel.ack(msg);
                console.log('✅ Message acknowledged');
            }
        });

        // Clean up
        setTimeout(async () => {
            await channel.close();
            await connection.close();
            console.log('✅ Test completed successfully');
            process.exit(0);
        }, 2000);

    } catch (error) {
        console.error('❌ RabbitMQ test failed:', error.message);
        process.exit(1);
    }
}

// Run the test
testRabbitMQConnection();
