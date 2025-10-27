const amqp = require('amqplib');

class RabbitMQService {
    constructor() {
        this.connection = null;
        this.channel = null;
        this.isConnected = false;
        this.creditExchange = process.env.RABBITMQ_EXCHANGE || 'credit_events';
        this.gigExchange = 'gig_events'; // New exchange for gig events
        this.reputationExchange = 'reputation_events'; // Exchange for reputation service
        this.queueName = process.env.RABBITMQ_QUEUE || 'gig_credit_queue';
        this.url = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
    }

    async connect() {
        try {
            console.log('🐰 [Gig Service] Connecting to RabbitMQ...');

            // Create connection
            this.connection = await amqp.connect(this.url);
            console.log('✅ [Gig Service] RabbitMQ connection established');

            // Create channel
            this.channel = await this.connection.createChannel();
            console.log('✅ [Gig Service] RabbitMQ channel created');

            // Setup exchanges
            await this.channel.assertExchange(this.creditExchange, 'topic', {
                durable: true
            });
            console.log(`✅ [Gig Service] Exchange '${this.creditExchange}' asserted`);

            // Setup gig events exchange for work history integration
            await this.channel.assertExchange(this.gigExchange, 'topic', {
                durable: true
            });
            console.log(`✅ [Gig Service] Exchange '${this.gigExchange}' asserted`);

            // Setup reputation events exchange
            await this.channel.assertExchange(this.reputationExchange, 'topic', {
                durable: true
            });
            console.log(`✅ [Gig Service] Exchange '${this.reputationExchange}' asserted`);

            // Setup queue for gig-related events
            await this.channel.assertQueue(this.queueName, {
                durable: true
            });
            console.log(`✅ [Gig Service] Queue '${this.queueName}' asserted`);

            // Bind queue to listen for boost and credit events
            await this.channel.bindQueue(this.queueName, this.creditExchange, 'boost.event');
            await this.channel.bindQueue(this.queueName, this.creditExchange, 'credit.event');

            // Bind queue to listen for gig events (work submission, completion, etc.)
            await this.channel.bindQueue(this.queueName, this.gigExchange, 'work_submitted');
            await this.channel.bindQueue(this.queueName, this.gigExchange, 'submission_reviewed');
            await this.channel.bindQueue(this.queueName, this.gigExchange, 'gig_completed');

            console.log('✅ [Gig Service] Queue bindings established');

            this.isConnected = true;

            // Handle connection events
            this.connection.on('error', (err) => {
                console.error('❌ [Gig Service] RabbitMQ connection error:', err);
                this.isConnected = false;
            });

            this.connection.on('close', () => {
                console.log('🔌 [Gig Service] RabbitMQ connection closed');
                this.isConnected = false;
                // Attempt to reconnect after 5 seconds
                setTimeout(() => {
                    this.connect();
                }, 5000);
            });

            return true; // Return success

        } catch (error) {
            console.error('❌ [Gig Service] Failed to connect to RabbitMQ:', error);
            this.isConnected = false;
            // Attempt to reconnect after 5 seconds
            setTimeout(() => {
                this.connect();
            }, 5000);
            return false; // Return failure
        }
    }

    async startConsumer(messageHandler) {
        if (!this.isConnected || !this.channel) {
            console.log('⚠️ [Gig Service] RabbitMQ not connected, cannot start consumer');
            return;
        }

        try {
            // Start consuming messages
            await this.channel.consume(this.queueName, async (message) => {
                if (message) {
                    try {
                        const content = JSON.parse(message.content.toString());
                        console.log('📨 [Gig Service] Received message:', content);

                        // Process the message
                        await messageHandler(content);

                        // Acknowledge the message
                        this.channel.ack(message);
                        console.log('✅ [Gig Service] Message processed successfully');

                    } catch (error) {
                        console.error('❌ [Gig Service] Error processing message:', error);
                        // Reject the message and don't requeue it
                        this.channel.nack(message, false, false);
                    }
                }
            });

            console.log('🎧 [Gig Service] Started consuming messages from RabbitMQ');

        } catch (error) {
            console.error('❌ [Gig Service] Error starting consumer:', error);
        }
    }

    async publishEvent(routingKey, eventData, exchange = null) {
        if (!this.isConnected || !this.channel) {
            console.log('⚠️ [Gig Service] RabbitMQ not connected, cannot publish event');
            return;
        }

        try {
            // Determine which exchange to use
            const targetExchange = exchange || this.creditExchange;

            const message = Buffer.from(JSON.stringify(eventData));
            await this.channel.publish(targetExchange, routingKey, message, {
                persistent: true
            });
            console.log(`📤 [Gig Service] Published event to ${targetExchange}.${routingKey}:`, eventData.eventId || eventData.gigId);
        } catch (error) {
            console.error('❌ [Gig Service] Error publishing event:', error);
        }
    }

    //publishToExchange
    async publishToExchange(exchange, routingKey, eventData) {
        return this.publishEvent(routingKey, eventData, exchange);
    }

    // New method for publishing gig events specifically
    async publishGigEvent(routingKey, eventData) {
        return this.publishEvent(routingKey, eventData, this.gigExchange);
    }

    // Method for publishing clan-related gig events
    async publishClanGigEvent(routingKey, eventData) {
        return this.publishEvent(routingKey, eventData, this.gigExchange);
    }

    // Method for publishing reputation events
    async publishReputationEvent(routingKey, eventData) {
        return this.publishEvent(routingKey, eventData, this.reputationExchange);
    }

    async close() {
        try {
            if (this.channel) {
                await this.channel.close();
                console.log('✅ [Gig Service] RabbitMQ channel closed');
            }
            if (this.connection) {
                await this.connection.close();
                console.log('✅ [Gig Service] RabbitMQ connection closed');
            }
            this.isConnected = false;
        } catch (error) {
            console.error('❌ [Gig Service] Error closing RabbitMQ connection:', error);
        }
    }
}

module.exports = new RabbitMQService();
