const amqp = require('amqplib');
const logger = require('../utils/logger');

class RabbitMQService {
    constructor() {
        this.connection = null;
        this.channel = null;
        this.isConnected = false;
        this.exchangeName = process.env.RABBITMQ_EXCHANGE || 'brains_events';
        // Use admin credentials from environment
        this.url = process.env.RABBITMQ_URL || 'amqp://admin:admin123@localhost:5672';
    }

    async connect() {
        try {
            console.log('🐰 [User Service] Connecting to RabbitMQ...');

            // Create connection
            this.connection = await amqp.connect(this.url);
            console.log('✅ [User Service] RabbitMQ connection established');

            // Create channel
            this.channel = await this.connection.createChannel();
            console.log('✅ [User Service] RabbitMQ channel created');

            // Setup exchange
            await this.channel.assertExchange(this.exchangeName, 'topic', {
                durable: true
            });
            console.log(`✅ [User Service] Exchange '${this.exchangeName}' asserted`);

            this.isConnected = true;

            // Handle connection events
            this.connection.on('error', (err) => {
                console.error('❌ [User Service] RabbitMQ connection error:', err);
                this.isConnected = false;
            });

            this.connection.on('close', () => {
                console.log('🔌 [User Service] RabbitMQ connection closed');
                this.isConnected = false;
                // Attempt to reconnect after 5 seconds
                setTimeout(() => {
                    this.connect();
                }, 5000);
            });

        } catch (error) {
            console.error('❌ [User Service] Failed to connect to RabbitMQ:', error);
            this.isConnected = false;
            // Don't attempt to reconnect in development if RabbitMQ is not available
            if (process.env.NODE_ENV === 'development') {
                console.log('⚠️ [User Service] Running in development mode without RabbitMQ');
                return;
            }
            // Attempt to reconnect after 5 seconds
            setTimeout(() => {
                this.connect();
            }, 5000);
        }
    }

    async publishEvent(routingKey, eventData) {
        try {
            if (!this.isConnected) {
                console.warn('⚠️ [User Service] Not connected to RabbitMQ, skipping event publish');
                return;
            }

            const baseEvent = {
                ...eventData,
                eventType: routingKey, // Include the specific event type
                timestamp: new Date().toISOString(),
                eventId: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                service: 'user-service'
            };

            const message = JSON.stringify(baseEvent);
            await this.channel.publish(this.exchangeName, 'user.event', Buffer.from(message));
            console.log(`📤 [User Service] Published event to ${this.exchangeName}.user.event:`, baseEvent.eventId);

        } catch (error) {
            console.error('❌ [User Service] Error publishing event:', error);
            // Don't throw error in development mode to prevent service failures
            if (process.env.NODE_ENV === 'development') {
                console.log('⚠️ [User Service] Event publish failed but continuing in development mode');
                return;
            }
            throw error;
        }
    }

    async consumeQueue(queueName, handler) {
        try {
            if (!this.isConnected) {
                console.warn('⚠️ [User Service] Not connected to RabbitMQ, skipping queue consumption');
                return;
            }

            // Assert queue
            await this.channel.assertQueue(queueName, { durable: true });
            console.log(`✅ [User Service] Queue '${queueName}' asserted`);

            // Start consuming
            await this.channel.consume(queueName, async (msg) => {
                if (msg) {
                    try {
                        const content = JSON.parse(msg.content.toString());
                        console.log(`📥 [User Service] Received message from queue '${queueName}':`, content.eventId);

                        await handler(content);

                        // Acknowledge the message
                        this.channel.ack(msg);
                    } catch (error) {
                        console.error(`❌ [User Service] Error processing message from queue '${queueName}':`, error);
                        // Reject the message and don't requeue
                        this.channel.nack(msg, false, false);
                    }
                }
            });

            console.log(`🎧 [User Service] Started consuming from queue '${queueName}'`);
        } catch (error) {
            console.error(`❌ [User Service] Error setting up queue consumption for '${queueName}':`, error);
        }
    }

    async close() {
        try {
            if (this.channel) {
                await this.channel.close();
            }
            if (this.connection) {
                await this.connection.close();
            }
            console.log('🔌 [User Service] RabbitMQ connection closed');
        } catch (error) {
            console.error('❌ [User Service] Error closing RabbitMQ connection:', error);
        }
    }
}

// Export singleton instance
const rabbitmqService = new RabbitMQService();

// Export the consumeQueue function for backward compatibility
module.exports = {
    ...rabbitmqService,
    consumeQueue: (queueName, handler) => rabbitmqService.consumeQueue(queueName, handler)
};
