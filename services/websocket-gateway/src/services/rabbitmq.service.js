/**
 * RabbitMQ Service for WebSocket Gateway
 * Handles message publishing and subscription
 */

const amqp = require('amqplib');
const logger = require('../utils/logger');

class RabbitMQService {
    constructor() {
        this.connection = null;
        this.channel = null;
        this.exchangeName = 'brains_events';
        this.subscriptions = new Map(); // subscriptionId -> { channel, queue }
    }

    /**
     * Connect to RabbitMQ
     */
    async connect() {
        try {
            const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

            this.connection = await amqp.connect(rabbitmqUrl);
            this.channel = await this.connection.createChannel();

            // Ensure exchange exists
            await this.channel.assertExchange(this.exchangeName, 'topic', { durable: true });

            // Debug: Log connection details
            logger.logConnection('Connected to RabbitMQ', {
                exchange: this.exchangeName,
                url: rabbitmqUrl,
                hasUnderlyingConnection: !!this.connection?.connection,
                hasStream: !!this.connection?.connection?.stream,
                streamDestroyed: this.connection?.connection?.stream?.destroyed || 'unknown',
                isReady: this.isReady()
            });

            // Handle connection events
            this.connection.on('close', () => {
                logger.logError('RabbitMQ connection closed');
                this.reconnect();
            });

            this.connection.on('error', (error) => {
                logger.logError('RabbitMQ connection error', { error: error.message });
            });

        } catch (error) {
            logger.logError('Failed to connect to RabbitMQ', { error: error.message });
            throw error;
        }
    }

    /**
     * Reconnect to RabbitMQ
     */
    async reconnect() {
        try {
            logger.logConnection('Attempting to reconnect to RabbitMQ...');
            await this.connect();
        } catch (error) {
            logger.logError('Failed to reconnect to RabbitMQ', { error: error.message });
            // Retry after 5 seconds
            setTimeout(() => this.reconnect(), 5000);
        }
    }

    /**
     * Publish event to RabbitMQ
     */
    async publishEvent(eventType, data) {
        try {
            if (!this.channel) {
                throw new Error('RabbitMQ channel not available');
            }

            const message = JSON.stringify({
                eventId: `${eventType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                eventType,
                data,
                timestamp: new Date().toISOString()
            });

            await this.channel.publish(this.exchangeName, eventType, Buffer.from(message));

            logger.logMessage('Event published to RabbitMQ', {
                eventType,
                eventId: JSON.parse(message).eventId
            });

        } catch (error) {
            logger.logError('Failed to publish event to RabbitMQ', {
                error: error.message,
                eventType
            });
            throw error;
        }
    }

    /**
     * Check if RabbitMQ service is ready
     */
    isReady() {
        try {
            // For amqplib, check if connection and channel exist
            // The connection object is actually a ChannelModel wrapper around the real connection
            const hasConnection = this.connection && this.connection.connection;
            const hasChannel = this.channel;

            // Check if the underlying socket is connected
            const socketConnected = hasConnection &&
                this.connection.connection.stream &&
                !this.connection.connection.stream.destroyed;

            const isReady = hasConnection && hasChannel && socketConnected;

            // Debug logging
            if (!isReady) {
                logger.logWarn('RabbitMQ not ready', {
                    hasConnection: !!this.connection,
                    hasChannel: !!this.channel,
                    hasUnderlyingConnection: !!this.connection?.connection,
                    hasStream: !!this.connection?.connection?.stream,
                    streamDestroyed: this.connection?.connection?.stream?.destroyed || 'unknown'
                });
            }

            return isReady;
        } catch (error) {
            logger.logError('Error in isReady() method', { error: error.message });
            return false;
        }
    }

    /**
     * Get connection status
     */
    getConnectionStatus() {
        // Calculate isReady without calling the method to avoid recursion
        const hasConnection = this.connection && this.connection.connection;
        const hasChannel = this.channel;
        const socketConnected = hasConnection &&
            this.connection.connection.stream &&
            !this.connection.connection.stream.destroyed;
        const calculatedIsReady = hasConnection && hasChannel && socketConnected;

        return {
            hasConnection: !!this.connection,
            hasChannel: !!this.channel,
            hasUnderlyingConnection: !!this.connection?.connection,
            hasStream: !!this.connection?.connection?.stream,
            streamDestroyed: this.connection?.connection?.stream?.destroyed || 'unknown',
            exchangeName: this.exchangeName,
            isReady: calculatedIsReady
        };
    }

    /**
     * Subscribe to user notifications
     */
    async subscribeToUserNotifications(userId, callback) {
        try {
            if (!this.isReady()) {
                throw new Error('RabbitMQ service not ready. Please wait for connection to be established.');
            }

            const queueName = `user_notifications_${userId}`;
            const routingKey = `user.${userId}.notification`;

            // Create queue
            await this.channel.assertQueue(queueName, { durable: true });
            await this.channel.bindQueue(queueName, this.exchangeName, routingKey);

            // Consume messages
            await this.channel.consume(queueName, (msg) => {
                if (msg) {
                    try {
                        const content = JSON.parse(msg.content.toString());
                        callback(content);
                        this.channel.ack(msg);
                    } catch (error) {
                        logger.logError('Error processing notification message', {
                            error: error.message,
                            userId
                        });
                        this.channel.nack(msg);
                    }
                }
            });

            // Store subscription for cleanup
            this.subscriptions.set(`notifications_${userId}`, {
                channel: this.channel,
                queue: queueName
            });

            logger.logMessage('Subscribed to user notifications', { userId });

        } catch (error) {
            logger.logError('Failed to subscribe to user notifications', {
                error: error.message,
                userId
            });
            throw error;
        }
    }

    /**
     * Unsubscribe from user notifications
     */
    async unsubscribeFromUserNotifications(userId) {
        try {
            const subscriptionId = `notifications_${userId}`;
            const subscription = this.subscriptions.get(subscriptionId);

            if (subscription) {
                await subscription.channel.deleteQueue(subscription.queue);
                this.subscriptions.delete(subscriptionId);

                logger.logMessage('Unsubscribed from user notifications', { userId });
            }

        } catch (error) {
            logger.logError('Failed to unsubscribe from user notifications', {
                error: error.message,
                userId
            });
        }
    }

    /**
     * Subscribe to clan events
     */
    async subscribeToClanEvents(clanId, callback) {
        try {
            if (!this.channel) {
                throw new Error('RabbitMQ channel not available');
            }

            // Create a unique queue for this subscription
            const queueName = `clan_events_${clanId}_${Date.now()}`;
            const queue = await this.channel.assertQueue(queueName, {
                durable: false,
                autoDelete: true
            });

            // Bind to clan events
            await this.channel.bindQueue(queueName, this.exchangeName, 'clan.message.sent');
            await this.channel.bindQueue(queueName, this.exchangeName, 'clan.typing');
            await this.channel.bindQueue(queueName, this.exchangeName, 'clan.message.read');

            // Start consuming messages
            await this.channel.consume(queueName, (msg) => {
                if (msg) {
                    try {
                        const messageContent = JSON.parse(msg.content.toString());
                        const routingKey = msg.fields.routingKey;

                        logger.logMessage('Received clan event from RabbitMQ', {
                            routingKey,
                            clanId,
                            eventType: messageContent.eventType
                        });

                        // Extract the actual data
                        const eventData = messageContent.data || messageContent;

                        // Check if this event is for the specific clan
                        if (eventData.clanId === clanId) {
                            callback({
                                type: routingKey,
                                ...eventData
                            });
                        }

                        this.channel.ack(msg);
                    } catch (error) {
                        logger.logError('Error processing clan event', {
                            error: error.message,
                            clanId
                        });
                        this.channel.nack(msg, false, false);
                    }
                }
            });

            // Store subscription for cleanup
            this.subscriptions.set(`clan_${clanId}`, {
                channel: this.channel,
                queue: queueName
            });

            logger.logMessage('Subscribed to clan events', { clanId, queueName });

        } catch (error) {
            logger.logError('Failed to subscribe to clan events', {
                error: error.message,
                clanId
            });
            throw error;
        }
    }

    /**
     * Unsubscribe from clan events
     */
    async unsubscribeFromClanEvents(clanId) {
        try {
            const subscriptionKey = `clan_${clanId}`;
            const subscription = this.subscriptions.get(subscriptionKey);

            if (subscription) {
                await subscription.channel.deleteQueue(subscription.queue);
                this.subscriptions.delete(subscriptionKey);
                logger.logMessage('Unsubscribed from clan events', { clanId });
            }
        } catch (error) {
            logger.logError('Failed to unsubscribe from clan events', {
                error: error.message,
                clanId
            });
        }
    }

    /**
     * Close RabbitMQ connection
     */
    async close() {
        try {
            // Close all subscriptions
            for (const [subscriptionId, subscription] of this.subscriptions) {
                try {
                    await subscription.channel.deleteQueue(subscription.queue);
                } catch (error) {
                    // Ignore errors during cleanup
                }
            }
            this.subscriptions.clear();

            // Close channel and connection
            if (this.channel) {
                await this.channel.close();
            }
            if (this.connection) {
                await this.connection.close();
            }

            logger.logConnection('RabbitMQ connection closed');

        } catch (error) {
            logger.logError('Error closing RabbitMQ connection', { error: error.message });
        }
    }
}

module.exports = { RabbitMQService };
