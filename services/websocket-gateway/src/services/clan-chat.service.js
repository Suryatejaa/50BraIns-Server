/**
 * Clan Chat Service
 * Handles clan chat subscriptions and message routing
 */

const { RabbitMQService } = require('./rabbitmq.service');
const logger = require('../utils/logger');

class ClanChatService {
    constructor(rabbitmqService) {
        this.subscribers = new Map(); // userId -> Map<clanId, callback>
        this.rabbitmqService = rabbitmqService; // Use the shared instance
    }

    /**
     * Subscribe user to clan chat
     */
    async subscribe(userId, clanId, callback) {
        try {
            // Initialize user subscriptions if not exists
            if (!this.subscribers.has(userId)) {
                this.subscribers.set(userId, new Map());
            }

            const userSubscriptions = this.subscribers.get(userId);
            userSubscriptions.set(clanId, callback);

            // Subscribe to RabbitMQ clan events for this clan
            await this.rabbitmqService.subscribeToClanEvents(clanId, (event) => {
                this.handleClanEvent(userId, clanId, event);
            });

            logger.logMessage('User subscribed to clan chat', { userId, clanId });

        } catch (error) {
            logger.logError('Error subscribing user to clan chat', {
                error: error.message,
                userId,
                clanId
            });
            throw error;
        }
    }

    /**
     * Unsubscribe user from clan chat
     */
    async unsubscribe(userId, clanId = null) {
        try {
            if (clanId) {
                // Unsubscribe from specific clan
                const userSubscriptions = this.subscribers.get(userId);
                if (userSubscriptions) {
                    userSubscriptions.delete(clanId);

                    // If no more clan subscriptions, remove user entirely
                    if (userSubscriptions.size === 0) {
                        this.subscribers.delete(userId);
                    }
                }

                // Unsubscribe from RabbitMQ clan events
                await this.rabbitmqService.unsubscribeFromClanEvents(clanId);

                logger.logMessage('User unsubscribed from clan chat', { userId, clanId });
            } else {
                // Unsubscribe from all clans
                const userSubscriptions = this.subscribers.get(userId);
                if (userSubscriptions) {
                    for (const [clanId] of userSubscriptions) {
                        await this.rabbitmqService.unsubscribeFromClanEvents(clanId);
                    }
                    this.subscribers.delete(userId);
                }

                logger.logMessage('User unsubscribed from all clan chats', { userId });
            }

        } catch (error) {
            logger.logError('Error unsubscribing user from clan chat', {
                error: error.message,
                userId,
                clanId
            });
        }
    }

    /**
     * Handle clan event from RabbitMQ
     */
    handleClanEvent(userId, clanId, event) {
        const userSubscriptions = this.subscribers.get(userId);
        if (userSubscriptions) {
            const callback = userSubscriptions.get(clanId);
            if (callback) {
                try {
                    // Transform the event to match what the client expects
                    let transformedEvent;

                    switch (event.type) {
                        case 'clan.message.sent':
                            transformedEvent = {
                                type: 'chat',
                                id: event.id || event.messageId,
                                userId: event.userId,
                                content: event.content,
                                messageType: event.messageType,
                                timestamp: event.timestamp,
                                clanId: event.clanId
                            };
                            break;

                        case 'clan.typing':
                            transformedEvent = {
                                type: 'typing_indicator',
                                userId: event.userId,
                                clanId: event.clanId,
                                isTyping: event.isTyping,
                                timestamp: event.timestamp
                            };
                            break;

                        case 'clan.message.read':
                            transformedEvent = {
                                type: 'message_read',
                                messageId: event.messageId,
                                userId: event.userId,
                                clanId: event.clanId,
                                timestamp: event.timestamp
                            };
                            break;

                        default:
                            transformedEvent = event;
                    }

                    callback(transformedEvent);

                    logger.logMessage('Clan event forwarded to user', {
                        userId,
                        clanId,
                        eventType: event.type
                    });
                } catch (error) {
                    logger.logError('Error in clan chat callback', {
                        error: error.message,
                        userId,
                        clanId,
                        eventType: event.type
                    });
                }
            }
        }
    }

    /**
     * Handle chat message from user
     */
    async handleChat(userId, clanId, content, messageType = 'TEXT') {
        try {
            // Publish chat message to RabbitMQ
            const messageData = {
                userId,
                clanId,
                content,
                messageType,
                timestamp: new Date().toISOString()
            };

            await this.rabbitmqService.publishEvent('clan.message.sent', messageData);

            // Return message ID (you might want to generate this or get it from the clan service)
            const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            logger.logMessage('Chat message published to RabbitMQ', {
                userId,
                clanId,
                messageId
            });

            return { messageId };

        } catch (error) {
            logger.logError('Error handling chat message', {
                error: error.message,
                userId,
                clanId
            });
            throw error;
        }
    }

    /**
     * Handle typing indicator
     */
    async handleTypingIndicator(userId, clanId, isTyping) {
        try {
            // Publish typing indicator to RabbitMQ
            await this.rabbitmqService.publishEvent('clan.typing', {
                userId,
                clanId,
                isTyping,
                timestamp: new Date().toISOString()
            });

            logger.logMessage('Typing indicator published', {
                userId,
                clanId,
                isTyping
            });

        } catch (error) {
            logger.logError('Error handling typing indicator', {
                error: error.message,
                userId,
                clanId
            });
        }
    }

    /**
     * Handle read receipt
     */
    async handleReadReceipt(userId, messageId, clanId) {
        try {
            // Publish read receipt to RabbitMQ
            await this.rabbitmqService.publishEvent('clan.message.read', {
                userId,
                messageId,
                clanId,
                timestamp: new Date().toISOString()
            });

            logger.logMessage('Read receipt published', {
                userId,
                messageId,
                clanId
            });

        } catch (error) {
            logger.logError('Error handling read receipt', {
                error: error.message,
                userId,
                messageId,
                clanId
            });
        }
    }

    /**
     * Get clan chat statistics
     */
    getStats() {
        const stats = {
            totalUsers: this.subscribers.size,
            totalClanSubscriptions: 0,
            usersByClan: new Map()
        };

        for (const [userId, clanSubscriptions] of this.subscribers) {
            stats.totalClanSubscriptions += clanSubscriptions.size;

            for (const [clanId] of clanSubscriptions) {
                if (!stats.usersByClan.has(clanId)) {
                    stats.usersByClan.set(clanId, []);
                }
                stats.usersByClan.get(clanId).push(userId);
            }
        }

        return {
            ...stats,
            usersByClan: Object.fromEntries(stats.usersByClan)
        };
    }
}

module.exports = { ClanChatService };
