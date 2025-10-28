const amqp = require('amqplib');

class RabbitMQService {
    constructor() {
        this.connection = null;
        this.channel = null;
        this.isConnected = false;
        this.gigExchange = 'gig_events'; // Exchange for gig events only
        this.queueName = process.env.RABBITMQ_QUEUE || 'gig_events_queue';
        this.url = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

        // Reconnection management
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectTimeout = null;

        // Message deduplication
        this.publishedMessages = new Set();
        this.messageCleanupInterval = null;
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
            // Only setup gig events exchange for MVP
            await this.channel.assertExchange(this.gigExchange, 'topic', {
                durable: true
            });
            console.log(`✅ [Gig Service] Exchange '${this.gigExchange}' asserted`);

            // Setup queue for gig-related events only
            await this.channel.assertQueue(this.queueName, {
                durable: true
            });
            console.log(`✅ [Gig Service] Queue '${this.queueName}' asserted`);

            // Bind queue to listen for core gig events only (MVP scope)
            await this.channel.bindQueue(this.queueName, this.gigExchange, 'gig_created');
            await this.channel.bindQueue(this.queueName, this.gigExchange, 'gig_updated');
            await this.channel.bindQueue(this.queueName, this.gigExchange, 'application_submitted');
            await this.channel.bindQueue(this.queueName, this.gigExchange, 'application_approved');
            await this.channel.bindQueue(this.queueName, this.gigExchange, 'submission_reviewed');

            console.log('✅ [Gig Service] Core gig event bindings established (MVP scope)');
            console.log('ℹ️ [Gig Service] Decommissioned services (credit, work-history, reputation, clan, social-media) events disabled');

            this.isConnected = true;

            // Handle connection events
            this.connection.on('error', (err) => {
                console.error('❌ [Gig Service] RabbitMQ connection error:', err);
                this.isConnected = false;
            });

            this.connection.on('close', () => {
                console.log('🔌 [Gig Service] RabbitMQ connection closed');
                this.isConnected = false;
                // Only attempt to reconnect with limits
                this.scheduleReconnect();
            });

            // Reset reconnect attempts on successful connection
            this.reconnectAttempts = 0;
            if (this.reconnectTimeout) {
                clearTimeout(this.reconnectTimeout);
                this.reconnectTimeout = null;
            }

            // Start message cleanup interval
            this.startMessageCleanup();

            return true; // Return success

        } catch (error) {
            console.error('❌ [Gig Service] Failed to connect to RabbitMQ:', error);
            this.isConnected = false;

            // Don't attempt to reconnect in development if RabbitMQ is not available
            if (process.env.NODE_ENV === 'development') {
                console.log('⚠️ [Gig Service] Running in development mode without RabbitMQ');
                return false; // Return failure but don't throw
            }

            // Attempt to reconnect with limits in production
            this.scheduleReconnect();
            return false; // Return failure
        }
    }

    scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error(`❌ [Gig Service] Max reconnect attempts (${this.maxReconnectAttempts}) reached. Stopping reconnection.`);
            return;
        }

        // Exponential backoff: 2^attempt * 1000ms, max 30 seconds
        const delay = Math.min(Math.pow(2, this.reconnectAttempts) * 1000, 30000);
        this.reconnectAttempts++;

        console.log(`🔄 [Gig Service] Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

        this.reconnectTimeout = setTimeout(() => {
            this.connect();
        }, delay);
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
            // Only use gig exchange for MVP
            const targetExchange = exchange || this.gigExchange;

            // Add unique event ID and service identifier
            const enrichedEvent = {
                ...eventData,
                eventId: eventData.eventId || `gig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                service: 'gig-service',
                timestamp: new Date().toISOString()
            };

            // Check for duplicate messages
            const messageKey = `${targetExchange}_${routingKey}_${enrichedEvent.eventId}`;
            if (this.publishedMessages.has(messageKey)) {
                console.warn(`⚠️ [Gig Service] Duplicate message detected, skipping: ${messageKey}`);
                return;
            }

            // Track published message
            this.publishedMessages.add(messageKey);

            const message = Buffer.from(JSON.stringify(enrichedEvent));
            await this.channel.publish(targetExchange, routingKey, message, {
                persistent: true
            });
            console.log(`📤 [Gig Service] Published event to ${targetExchange}.${routingKey}:`, enrichedEvent.eventId);
        } catch (error) {
            console.error('❌ [Gig Service] Error publishing event:', error);
        }
    }

    // Only gig events are supported in MVP
    async publishGigEvent(routingKey, eventData) {
        return this.publishEvent(routingKey, eventData, this.gigExchange);
    }

    // Legacy methods disabled for decommissioned services
    async publishClanGigEvent(routingKey, eventData) {
        console.warn('⚠️ [Gig Service] Clan events disabled - service decommissioned for MVP');
        return;
    }

    async publishReputationEvent(routingKey, eventData) {
        console.warn('⚠️ [Gig Service] Reputation events disabled - service decommissioned for MVP');
        return;
    }

    async publishToExchange(exchange, routingKey, eventData) {
        if (exchange !== this.gigExchange) {
            console.warn(`⚠️ [Gig Service] Exchange ${exchange} disabled - only gig_events supported in MVP`);
            return;
        }
        return this.publishEvent(routingKey, eventData, exchange);
    }

    async close() {
        try {
            // Clear intervals and timeouts
            if (this.messageCleanupInterval) {
                clearInterval(this.messageCleanupInterval);
                this.messageCleanupInterval = null;
            }
            if (this.reconnectTimeout) {
                clearTimeout(this.reconnectTimeout);
                this.reconnectTimeout = null;
            }

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

    startMessageCleanup() {
        // Clean up old message IDs every 5 minutes to prevent memory leaks
        this.messageCleanupInterval = setInterval(() => {
            if (this.publishedMessages.size > 1000) {
                console.log(`🧹 [Gig Service] Cleaning up message deduplication cache (${this.publishedMessages.size} messages)`);
                this.publishedMessages.clear();
            }
        }, 5 * 60 * 1000);
    }
}

module.exports = new RabbitMQService();
