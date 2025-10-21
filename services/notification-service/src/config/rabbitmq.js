/**
 * RabbitMQ Configuration and Messaging
 * Mock mode when RabbitMQ is not available
 */

const logger = require('./logger');

let connection = null;
let channel = null;
let messageQueue = []; // Mock message storage

const config = {
    url: process.env.RABBITMQ_URL || 'amqp://admin:admin123@localhost',
    exchange: process.env.RABBITMQ_EXCHANGE || 'brains_events',
    queues: {
        clan: process.env.RABBITMQ_QUEUE_CLAN || 'clan_events',
        analytics: process.env.RABBITMQ_QUEUE_CLAN_ANALYTICS || 'clan_analytics_events'
    }
};

// Connect to RabbitMQ (mock mode)
async function connectRabbitMQ() {
    try {
        logger.info('🐰 RabbitMQ connecting (mock mode)...');

        connection = {
            close: async () => {
                logger.info('RabbitMQ connection closed (mock)');
                connection = null;
                channel = null;
                messageQueue = [];
            }
        };

        channel = {
            assertExchange: async (exchange, type, options) => {
                logger.debug('Exchange asserted (mock):', exchange, type);
                return true;
            },

            assertQueue: async (queueName, options) => {
                logger.debug('Queue asserted (mock):', queueName);
                return { queue: queueName };
            },

            publish: (exchange, routingKey, content, options = {}) => {
                const message = {
                    exchange,
                    routingKey,
                    content: content.toString(),
                    options,
                    timestamp: new Date()
                };
                messageQueue.push(message);
                logger.debug('Message published (mock):', { exchange, routingKey });
                return true;
            },

            bindQueue: async (queue, exchange, pattern) => {
                logger.debug('Queue bound (mock):', queue, exchange, pattern);
                return true;
            },

            consume: async (queue, onMessage, options = {}) => {
                logger.debug('Consumer set up (mock):', queue);
                return { consumerTag: `mock-consumer-${Date.now()}` };
            },

            ack: (message) => {
                logger.debug('Message acknowledged (mock)');
                return true;
            },

            nack: (message, allUpTo = false, requeue = true) => {
                logger.debug('Message nacked (mock)');
                return true;
            },

            deleteQueue: async (queueName) => {
                logger.debug('Queue deleted (mock):', queueName);
                return true;
            },

            close: async () => {
                logger.debug('Channel closed (mock)');
                return true;
            }
        };

        // Set up exchange and queues
        await channel.assertExchange(config.exchange, 'topic', { durable: true });

        for (const queueName of Object.values(config.queues)) {
            await channel.assertQueue(queueName, { durable: true });
        }

        logger.info('✅ RabbitMQ connected successfully (mock mode)');
        logger.info('✅ RabbitMQ channel and queues initialized (mock)');

        return { connection, channel };
    } catch (error) {
        logger.error('Failed to connect to RabbitMQ:', error);
        // Don't throw error, just log it
        return null;
    }
}

// Message publisher
class MessagePublisher {
    static async publish(routingKey, eventType, data, options = {}) {
        try {
            if (!channel) {
                logger.warn('RabbitMQ not connected, message not published:', routingKey);
                return false;
            }

            const message = {
                eventType,
                data,
                timestamp: new Date().toISOString(),
                service: 'clan-service',
                version: '2.0.0',
                correlationId: options.correlationId || `clan-${Date.now()}-${Math.random()}`
            };

            const messageBuffer = Buffer.from(JSON.stringify(message));

            const published = channel.publish(
                config.exchange,
                routingKey,
                messageBuffer,
                {
                    persistent: true,
                    contentType: 'application/json',
                    timestamp: Date.now(),
                    ...options
                }
            );

            if (published) {
                logger.debug('Message published (mock):', { routingKey, eventType });
                return true;
            } else {
                throw new Error('Failed to publish message');
            }
        } catch (error) {
            logger.error('Publish error (mock):', routingKey, error.message);
            return false;
        }
    }

    // Clan-specific events
    static async publishClanCreated(clanData) {
        return await this.publish(
            'clan.created',
            'CLAN_CREATED',
            {
                clanId: clanData.id,
                name: clanData.name,
                slug: clanData.slug,
                clanHeadId: clanData.clanHeadId,
                visibility: clanData.visibility,
                primaryCategory: clanData.primaryCategory,
                location: clanData.location,
                createdAt: clanData.createdAt
            }
        );
    }

    static async publishClanUpdated(clanData, changes) {
        return await this.publish(
            'clan.updated',
            'CLAN_UPDATED',
            {
                clanId: clanData.id,
                changes,
                updatedAt: new Date().toISOString()
            }
        );
    }

    static async publishClanDeleted(clanId, clanHeadId) {
        return await this.publish(
            'clan.deleted',
            'CLAN_DELETED',
            {
                clanId,
                clanHeadId,
                deletedAt: new Date().toISOString()
            }
        );
    }

    static async publishMemberJoined(clanId, memberData) {
        return await this.publish(
            'clan.member.joined',
            'CLAN_MEMBER_JOINED',
            {
                clanId,
                userId: memberData.userId,
                role: memberData.role,
                joinedAt: memberData.joinedAt
            }
        );
    }

    static async publishMemberLeft(clanId, userId, reason = 'left') {
        return await this.publish(
            'clan.member.left',
            'CLAN_MEMBER_LEFT',
            {
                clanId,
                userId,
                reason,
                leftAt: new Date().toISOString()
            }
        );
    }

    static async publishMemberRoleChanged(clanId, userId, oldRole, newRole) {
        return await this.publish(
            'clan.member.role_changed',
            'CLAN_MEMBER_ROLE_CHANGED',
            {
                clanId,
                userId,
                oldRole,
                newRole,
                changedAt: new Date().toISOString()
            }
        );
    }

    static async publishInvitationSent(invitationData) {
        return await this.publish(
            'clan.invitation.sent',
            'CLAN_INVITATION_SENT',
            {
                invitationId: invitationData.id,
                clanId: invitationData.clanId,
                invitedUserId: invitationData.invitedUserId,
                invitedByUserId: invitationData.invitedByUserId,
                role: invitationData.role,
                sentAt: invitationData.createdAt
            }
        );
    }

    static async publishInvitationResponse(invitationId, response, userId) {
        return await this.publish(
            'clan.invitation.responded',
            'CLAN_INVITATION_RESPONDED',
            {
                invitationId,
                response, // 'accepted' | 'rejected'
                userId,
                respondedAt: new Date().toISOString()
            }
        );
    }

    // Analytics events
    static async publishAnalyticsEvent(eventType, clanId, data) {
        return await this.publish(
            `clan.analytics.${eventType}`,
            'CLAN_ANALYTICS_EVENT',
            {
                eventType,
                clanId,
                data,
                timestamp: new Date().toISOString()
            }
        );
    }
}

// Message consumer setup
class MessageConsumer {
    static async setupConsumers() {
        try {
            if (!channel) {
                logger.warn('RabbitMQ not connected, consumers not set up');
                return;
            }

            // Bind queues to exchange with routing patterns
            await channel.bindQueue(config.queues.clan, config.exchange, 'clan.*');
            await channel.bindQueue(config.queues.clan, config.exchange, 'clan.member.*');
            await channel.bindQueue(config.queues.clan, config.exchange, 'clan.invitation.*');

            await channel.bindQueue(config.queues.analytics, config.exchange, 'clan.analytics.*');

            // Set up consumers
            await this.setupClanEventConsumer();
            await this.setupAnalyticsConsumer();

            logger.info('RabbitMQ consumers setup completed (mock)');
        } catch (error) {
            logger.error('Failed to setup RabbitMQ consumers:', error);
        }
    }

    static async setupClanEventConsumer() {
        await channel.consume(config.queues.clan, async (message) => {
            try {
                if (message) {
                    const content = JSON.parse(message.content.toString());
                    logger.debug('Processing clan event (mock):', content.eventType);

                    // Process different event types
                    await this.processClanEvent(content);

                    // Acknowledge message
                    channel.ack(message);
                }
            } catch (error) {
                logger.error('Error processing clan event:', error);
                // Reject and requeue message
                channel.nack(message, false, true);
            }
        }, { noAck: false });
    }

    static async setupAnalyticsConsumer() {
        await channel.consume(config.queues.analytics, async (message) => {
            try {
                if (message) {
                    const content = JSON.parse(message.content.toString());
                    logger.debug('Processing analytics event (mock):', content.eventType);

                    // Process analytics events
                    await this.processAnalyticsEvent(content);

                    channel.ack(message);
                }
            } catch (error) {
                logger.error('Error processing analytics event:', error);
                channel.nack(message, false, true);
            }
        }, { noAck: false });
    }

    static async processClanEvent(event) {
        // Implement clan event processing logic here
        logger.debug('Processing clan event (mock):', event.eventType);
    }

    static async processAnalyticsEvent(event) {
        // Implement analytics event processing logic here
        logger.debug('Processing analytics event (mock):', event.eventType);
    }
}

// Health check for RabbitMQ
async function checkRabbitMQHealth() {
    try {
        if (!connection || !channel) {
            return {
                status: 'mock',
                message: 'Running in mock mode (RabbitMQ not available)',
                connection: 'mock',
                queued_messages: messageQueue.length
            };
        }

        // Simple check by asserting a temporary queue
        const tempQueue = `health-check-${Date.now()}`;
        await channel.assertQueue(tempQueue, { durable: false, autoDelete: true });
        await channel.deleteQueue(tempQueue);

        return {
            status: 'healthy',
            connection: 'active',
            exchange: config.exchange,
            queues: Object.keys(config.queues).length
        };
    } catch (error) {
        logger.error('RabbitMQ health check failed:', error);
        return {
            status: 'unhealthy',
            error: error.message,
            connection: 'failed'
        };
    }
}

// Graceful shutdown
async function closeRabbitMQ() {
    try {
        if (channel) {
            await channel.close();
            channel = null;
            logger.info('RabbitMQ channel closed');
        }

        if (connection) {
            await connection.close();
            connection = null;
            logger.info('RabbitMQ connection closed');
        }
    } catch (error) {
        logger.error('Error closing RabbitMQ connection:', error);
    }
}

module.exports = {
    connectRabbitMQ,
    checkRabbitMQHealth,
    closeRabbitMQ,
    MessagePublisher,
    MessageConsumer,
    get connection() {
        return connection;
    },
    get channel() {
        return channel;
    }
};

// Message publisher
class MessagePublisher {
    static async publish(routingKey, eventType, data, options = {}) {
        try {
            if (!channel) {
                await connectRabbitMQ();
            }

            const message = {
                eventType,
                data,
                timestamp: new Date().toISOString(),
                service: 'clan-service',
                version: '2.0.0',
                correlationId: options.correlationId || `clan-${Date.now()}-${Math.random()}`
            };

            const messageBuffer = Buffer.from(JSON.stringify(message));

            const published = channel.publish(
                config.exchange,
                routingKey,
                messageBuffer,
                {
                    persistent: true,
                    contentType: 'application/json',
                    timestamp: Date.now(),
                    ...options
                }
            );

            if (published) {
                logger.logRabbitMQ('publish', routingKey, message);
                return true;
            } else {
                throw new Error('Failed to publish message');
            }
        } catch (error) {
            logger.logRabbitMQ('publish', routingKey, null, error);
            throw error;
        }
    }

    // Clan-specific events
    static async publishClanCreated(clanData) {
        return await this.publish(
            'clan.created',
            'CLAN_CREATED',
            {
                clanId: clanData.id,
                name: clanData.name,
                slug: clanData.slug,
                clanHeadId: clanData.clanHeadId,
                visibility: clanData.visibility,
                primaryCategory: clanData.primaryCategory,
                location: clanData.location,
                createdAt: clanData.createdAt
            }
        );
    }

    static async publishClanUpdated(clanData, changes) {
        return await this.publish(
            'clan.updated',
            'CLAN_UPDATED',
            {
                clanId: clanData.id,
                changes,
                updatedAt: new Date().toISOString()
            }
        );
    }

    static async publishClanDeleted(clanId, clanHeadId) {
        return await this.publish(
            'clan.deleted',
            'CLAN_DELETED',
            {
                clanId,
                clanHeadId,
                deletedAt: new Date().toISOString()
            }
        );
    }

    static async publishMemberJoined(clanId, memberData) {
        return await this.publish(
            'clan.member.joined',
            'CLAN_MEMBER_JOINED',
            {
                clanId,
                userId: memberData.userId,
                role: memberData.role,
                joinedAt: memberData.joinedAt
            }
        );
    }

    static async publishMemberLeft(clanId, userId, reason = 'left') {
        return await this.publish(
            'clan.member.left',
            'CLAN_MEMBER_LEFT',
            {
                clanId,
                userId,
                reason,
                leftAt: new Date().toISOString()
            }
        );
    }

    static async publishMemberRoleChanged(clanId, userId, oldRole, newRole) {
        return await this.publish(
            'clan.member.role_changed',
            'CLAN_MEMBER_ROLE_CHANGED',
            {
                clanId,
                userId,
                oldRole,
                newRole,
                changedAt: new Date().toISOString()
            }
        );
    }

    static async publishInvitationSent(invitationData) {
        return await this.publish(
            'clan.invitation.sent',
            'CLAN_INVITATION_SENT',
            {
                invitationId: invitationData.id,
                clanId: invitationData.clanId,
                invitedUserId: invitationData.invitedUserId,
                invitedByUserId: invitationData.invitedByUserId,
                role: invitationData.role,
                sentAt: invitationData.createdAt
            }
        );
    }

    static async publishInvitationResponse(invitationId, response, userId) {
        return await this.publish(
            'clan.invitation.responded',
            'CLAN_INVITATION_RESPONDED',
            {
                invitationId,
                response, // 'accepted' | 'rejected'
                userId,
                respondedAt: new Date().toISOString()
            }
        );
    }

    // Analytics events
    static async publishAnalyticsEvent(eventType, clanId, data) {
        return await this.publish(
            `clan.analytics.${eventType}`,
            'CLAN_ANALYTICS_EVENT',
            {
                eventType,
                clanId,
                data,
                timestamp: new Date().toISOString()
            }
        );
    }
}

// Message consumer setup
class MessageConsumer {
    static async setupConsumers() {
        try {
            if (!channel) {
                await connectRabbitMQ();
            }

            // Bind queues to exchange with routing patterns
            await channel.bindQueue(config.queues.clan, config.exchange, 'clan.*');
            await channel.bindQueue(config.queues.clan, config.exchange, 'clan.member.*');
            await channel.bindQueue(config.queues.clan, config.exchange, 'clan.invitation.*');

            await channel.bindQueue(config.queues.analytics, config.exchange, 'clan.analytics.*');

            // Set up consumers
            await this.setupClanEventConsumer();
            await this.setupAnalyticsConsumer();

            logger.info('RabbitMQ consumers setup completed');
        } catch (error) {
            logger.error('Failed to setup RabbitMQ consumers:', error);
            throw error;
        }
    }

    static async setupClanEventConsumer() {
        await channel.consume(config.queues.clan, async (message) => {
            try {
                if (message) {
                    const content = JSON.parse(message.content.toString());
                    logger.logRabbitMQ('consume', config.queues.clan, content);

                    // Process different event types
                    await this.processClanEvent(content);

                    // Acknowledge message
                    channel.ack(message);
                }
            } catch (error) {
                logger.error('Error processing clan event:', error);
                // Reject and requeue message
                channel.nack(message, false, true);
            }
        }, { noAck: false });
    }

    static async setupAnalyticsConsumer() {
        await channel.consume(config.queues.analytics, async (message) => {
            try {
                if (message) {
                    const content = JSON.parse(message.content.toString());
                    logger.logRabbitMQ('consume', config.queues.analytics, content);

                    // Process analytics events
                    await this.processAnalyticsEvent(content);

                    channel.ack(message);
                }
            } catch (error) {
                logger.error('Error processing analytics event:', error);
                channel.nack(message, false, true);
            }
        }, { noAck: false });
    }

    static async processClanEvent(event) {
        // Implement clan event processing logic here
        logger.info('Processing clan event:', event.eventType);

        // Examples:
        // - Update cache when clan is updated
        // - Send notifications when members join/leave
        // - Update search indices
        // - Sync with other services
    }

    static async processAnalyticsEvent(event) {
        // Implement analytics event processing logic here
        logger.info('Processing analytics event:', event.eventType);

        // Examples:
        // - Update analytics tables
        // - Calculate metrics
        // - Generate reports
    }
}

// Health check for RabbitMQ
async function checkRabbitMQHealth() {
    try {
        if (!connection || !channel) {
            throw new Error('RabbitMQ not connected');
        }

        // Simple check by asserting a temporary queue
        const tempQueue = `health-check-${Date.now()}`;
        await channel.assertQueue(tempQueue, { durable: false, autoDelete: true });
        await channel.deleteQueue(tempQueue);

        return {
            status: 'healthy',
            connection: 'active',
            exchange: config.exchange,
            queues: Object.keys(config.queues).length
        };
    } catch (error) {
        logger.error('RabbitMQ health check failed:', error);
        return {
            status: 'unhealthy',
            error: error.message,
            connection: 'failed'
        };
    }
}

// Graceful shutdown
async function closeRabbitMQ() {
    try {
        if (channel) {
            await channel.close();
            channel = null;
            logger.info('RabbitMQ channel closed');
        }

        if (connection) {
            await connection.close();
            connection = null;
            logger.info('RabbitMQ connection closed');
        }
    } catch (error) {
        logger.error('Error closing RabbitMQ connection:', error);
    }
}

module.exports = {
    connectRabbitMQ,
    checkRabbitMQHealth,
    closeRabbitMQ,
    MessagePublisher,
    MessageConsumer,
    get connection() {
        return connection;
    },
    get channel() {
        return channel;
    }
};
