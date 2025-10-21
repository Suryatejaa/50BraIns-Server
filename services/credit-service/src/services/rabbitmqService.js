const amqp = require('amqplib');

class RabbitMQService {
    constructor() {
        this.connection = null;
        this.channel = null;
        this.isConnected = false;
        this.exchangeName = process.env.RABBITMQ_EXCHANGE || 'credit_events';
        this.queueName = process.env.RABBITMQ_QUEUE || 'credit_queue';
        this.url = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
    }

    async connect() {
        try {
            console.log('🐰 Connecting to RabbitMQ...');

            // Create connection
            this.connection = await amqp.connect(this.url);
            console.log('✅ RabbitMQ connection established');

            // Create channel
            this.channel = await this.connection.createChannel();
            console.log('✅ RabbitMQ channel created');

            // Setup exchange
            await this.channel.assertExchange(this.exchangeName, 'topic', {
                durable: true
            });
            console.log(`✅ Exchange '${this.exchangeName}' asserted`);

            // Setup queue
            await this.channel.assertQueue(this.queueName, {
                durable: true
            });
            console.log(`✅ Queue '${this.queueName}' asserted`);

            // Bind queue to exchange
            await this.channel.bindQueue(this.queueName, this.exchangeName, 'boost.event');
            await this.channel.bindQueue(this.queueName, this.exchangeName, 'credit.event');
            console.log('✅ Queue bindings established');

            this.isConnected = true;

            // Handle connection events
            this.connection.on('error', (err) => {
                console.error('❌ RabbitMQ connection error:', err);
                this.isConnected = false;
            });

            this.connection.on('close', () => {
                console.log('🔌 RabbitMQ connection closed');
                this.isConnected = false;
            });

            console.log('🚀 RabbitMQ service initialized successfully');

        } catch (error) {
            console.error('❌ Failed to connect to RabbitMQ:', error);
            this.isConnected = false;

            // For development, don't fail if RabbitMQ is not available
            if (process.env.NODE_ENV === 'development') {
                console.log('⚠️ Running in development mode without RabbitMQ');
                return;
            }

            throw error;
        }
    }

    async close() {
        try {
            if (this.channel) {
                await this.channel.close();
                console.log('✅ RabbitMQ channel closed');
            }

            if (this.connection) {
                await this.connection.close();
                console.log('✅ RabbitMQ connection closed');
            }

            this.isConnected = false;
        } catch (error) {
            console.error('❌ Error closing RabbitMQ connection:', error);
        }
    }

    isConnected() {
        return this.isConnected;
    }

    async publishBoostEvent(eventData) {
        if (!this.isConnected || !this.channel) {
            console.warn('⚠️ RabbitMQ not connected, skipping boost event publication');
            return;
        }

        try {
            const baseEvent = {
                ...eventData,
                eventType: 'boost.event', // Include the specific event type
                timestamp: eventData.timestamp || new Date().toISOString(),
                eventId: `boost_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                service: 'credit-service'
            };

            const messageBuffer = Buffer.from(JSON.stringify(baseEvent));

            await this.channel.publish(
                this.exchangeName,
                'boost.event',
                messageBuffer,
                {
                    persistent: true,
                    headers: {
                        eventType: baseEvent.eventType,
                        boostType: eventData.boostType,
                        targetType: eventData.targetType
                    }
                }
            );

            console.log(`📤 Published boost event: ${baseEvent.eventType} for ${eventData.boostType}`);
        } catch (error) {
            console.error('❌ Failed to publish boost event:', error);
            throw error;
        }
    }

    async publishCreditEvent(eventData) {
        if (!this.isConnected || !this.channel) {
            console.warn('⚠️ RabbitMQ not connected, skipping credit event publication');
            return;
        }

        try {
            const baseEvent = {
                ...eventData,
                eventType: 'credit.event', // Include the specific event type
                timestamp: eventData.timestamp || new Date().toISOString(),
                eventId: `credit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                service: 'credit-service'
            };

            const messageBuffer = Buffer.from(JSON.stringify(baseEvent));

            await this.channel.publish(
                this.exchangeName,
                'credit.event',
                messageBuffer,
                {
                    persistent: true,
                    headers: {
                        eventType: baseEvent.eventType
                    }
                }
            );

            console.log(`📤 Published credit event: ${baseEvent.eventType}`);
        } catch (error) {
            console.error('❌ Failed to publish credit event:', error);
            throw error;
        }
    }

    // For testing - consume messages
    async consumeMessages(callback) {
        if (!this.isConnected || !this.channel) {
            throw new Error('RabbitMQ not connected');
        }

        try {
            await this.channel.consume(this.queueName, (message) => {
                if (message) {
                    const content = JSON.parse(message.content.toString());
                    console.log('📥 Received message:', content);

                    if (callback) {
                        callback(content);
                    }

                    // Acknowledge the message
                    this.channel.ack(message);
                }
            });

            console.log(`👂 Listening for messages on queue: ${this.queueName}`);
        } catch (error) {
            console.error('❌ Failed to consume messages:', error);
            throw error;
        }
    }
}

// Export singleton instance
module.exports = new RabbitMQService();
