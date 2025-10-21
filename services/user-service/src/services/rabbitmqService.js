const amqp = require('amqplib');

class RabbitMQService {
    constructor() {
        this.connection = null;
        this.channel = null;
        this.isConnected = false;
        this.exchangeName = process.env.RABBITMQ_EXCHANGE || 'user_events';
        this.queueName = process.env.RABBITMQ_QUEUE || 'user_service_queue';
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
            console.log('✅ [User Service] Channel created');

            // Setup user service exchange
            await this.channel.assertExchange(this.exchangeName, 'topic', {
                durable: true
            });
            console.log(`✅ [User Service] Exchange '${this.exchangeName}' asserted`);

            // Setup queue for user service events
            await this.channel.assertQueue(this.queueName, {
                durable: true
            });
            console.log(`✅ [User Service] Queue '${this.queueName}' asserted`);

            // Bind queue to listen for user service events
            await this.channel.bindQueue(this.queueName, this.exchangeName, 'user.profile.created');
            await this.channel.bindQueue(this.queueName, this.exchangeName, 'user.profile.updated');
            await this.channel.bindQueue(this.queueName, this.exchangeName, 'user.profile.deleted');
            console.log('✅ [User Service] Queue bindings established for user events');

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

    async startConsumer(messageHandler) {
        if (!this.isConnected || !this.channel) {
            console.log('⚠️ [User Service] RabbitMQ not connected, cannot start consumer');
            return;
        }

        try {
            // Start consuming messages
            await this.channel.consume(this.queueName, async (message) => {
                if (message) {
                    try {
                        const content = JSON.parse(message.content.toString());
                        const routingKey = message.fields.routingKey;
                        console.log(`📨 [User Service] Received message with routing key '${routingKey}':`, content);

                        // Process the message
                        await messageHandler(content, routingKey);

                        // Acknowledge the message
                        this.channel.ack(message);
                        console.log('✅ [User Service] Message processed successfully');

                    } catch (error) {
                        console.error('❌ [User Service] Error processing message:', error);
                        // Reject the message and don't requeue it
                        this.channel.nack(message, false, false);
                    }
                }
            });

            console.log('🎧 [User Service] Started consuming messages from RabbitMQ');

        } catch (error) {
            console.error('❌ [User Service] Error starting consumer:', error);
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
                eventType: routingKey,
                timestamp: new Date().toISOString(),
                eventId: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                service: 'user-service'
            };

            const message = JSON.stringify(baseEvent);
            await this.channel.publish(this.exchangeName, routingKey, Buffer.from(message));
            console.log(`📤 [User Service] Published event to ${this.exchangeName}.${routingKey}:`, baseEvent.eventId);

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

    async close() {
        try {
            if (this.channel) {
                await this.channel.close();
                console.log('✅ [User Service] RabbitMQ channel closed');
            }
            if (this.connection) {
                await this.connection.close();
                console.log('✅ [User Service] RabbitMQ connection closed');
            }
            this.isConnected = false;
        } catch (error) {
            console.error('❌ [User Service] Error closing RabbitMQ connection:', error);
        }
    }
}

module.exports = new RabbitMQService();
