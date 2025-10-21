const amqp = require('amqplib');

class RabbitMQService {
    constructor() {
        this.connection = null;
        this.channel = null;
        this.isConnected = false;
    }

    async connect() {
        try {
            const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
            console.log('🐰 Connecting to RabbitMQ...', rabbitmqUrl);

            this.connection = await amqp.connect(rabbitmqUrl);
            this.channel = await this.connection.createChannel();
            this.isConnected = true;

            // Setup exchanges
            await this.setupExchanges();

            // Setup queues
            await this.setupQueues();

            console.log('✅ RabbitMQ connected successfully');

            // Handle connection errors
            this.connection.on('error', (err) => {
                console.error('❌ RabbitMQ connection error:', err);
                this.isConnected = false;
            });

            this.connection.on('close', () => {
                console.log('🔌 RabbitMQ connection closed');
                this.isConnected = false;
                // Attempt to reconnect after 5 seconds
                setTimeout(() => this.connect(), 5000);
            });

        } catch (error) {
            console.error('❌ Failed to connect to RabbitMQ:', error);
            this.isConnected = false;
            // Retry connection after 5 seconds
            setTimeout(() => this.connect(), 5000);
        }
    }

    async setupExchanges() {
        const exchangeName = process.env.RABBITMQ_EXCHANGE || '50brains-events';

        // Create main exchange for all platform events
        await this.channel.assertExchange(exchangeName, 'topic', {
            durable: true
        });

        console.log(`📡 Exchange "${exchangeName}" ready`);
    }

    async setupQueues() {
        const boostQueue = process.env.RABBITMQ_BOOST_QUEUE || 'boost-events';
        const creditQueue = process.env.RABBITMQ_CREDIT_QUEUE || 'credit-events';

        // Boost events queue
        await this.channel.assertQueue(boostQueue, {
            durable: true,
            arguments: {
                'x-message-ttl': 24 * 60 * 60 * 1000 // 24 hours TTL
            }
        });

        // Credit events queue
        await this.channel.assertQueue(creditQueue, {
            durable: true,
            arguments: {
                'x-message-ttl': 24 * 60 * 60 * 1000 // 24 hours TTL
            }
        });

        console.log(`📬 Queues "${boostQueue}" and "${creditQueue}" ready`);
    }

    async publishBoostEvent(event) {
        if (!this.isConnected || !this.channel) {
            console.warn('⚠️ RabbitMQ not connected, skipping event:', event.event);
            return false;
        }

        try {
            const queue = process.env.RABBITMQ_BOOST_QUEUE || 'boost-events';
            const message = {
                ...event,
                timestamp: new Date().toISOString(),
                service: 'credit-service'
            };

            const sent = this.channel.sendToQueue(
                queue,
                Buffer.from(JSON.stringify(message)),
                {
                    persistent: true,
                    messageId: `boost-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                }
            );

            if (sent) {
                console.log('📤 Boost event published:', event.event, 'for', event.entityType, event.targetId);
                return true;
            } else {
                console.warn('⚠️ Failed to publish boost event (queue full)');
                return false;
            }
        } catch (error) {
            console.error('❌ Error publishing boost event:', error);
            return false;
        }
    }

    async publishCreditEvent(event) {
        if (!this.isConnected || !this.channel) {
            console.warn('⚠️ RabbitMQ not connected, skipping event:', event.event);
            return false;
        }

        try {
            const queue = process.env.RABBITMQ_CREDIT_QUEUE || 'credit-events';
            const message = {
                ...event,
                timestamp: new Date().toISOString(),
                service: 'credit-service'
            };

            const sent = this.channel.sendToQueue(
                queue,
                Buffer.from(JSON.stringify(message)),
                {
                    persistent: true,
                    messageId: `credit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                }
            );

            if (sent) {
                console.log('📤 Credit event published:', event.event);
                return true;
            } else {
                console.warn('⚠️ Failed to publish credit event (queue full)');
                return false;
            }
        } catch (error) {
            console.error('❌ Error publishing credit event:', error);
            return false;
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
            this.isConnected = false;
            console.log('🔌 RabbitMQ connection closed gracefully');
        } catch (error) {
            console.error('❌ Error closing RabbitMQ connection:', error);
        }
    }

    getChannel() {
        return this.channel;
    }

    isReady() {
        return this.isConnected && this.channel;
    }
}

// Singleton instance
const rabbitmqService = new RabbitMQService();

module.exports = rabbitmqService;
