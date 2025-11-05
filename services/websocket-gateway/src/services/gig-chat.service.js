/**
 * Gig Chat Service
 * Handles gig chat message subscriptions and real-time delivery
 */

const logger = require('../utils/logger');

class GigChatService {
    constructor(rabbitmqService) {
        this.subscribers = new Map(); // userId -> callback function
        this.rabbitmqService = rabbitmqService; // Use the shared instance
        this.isListening = false;
        this.typingThrottleMap = new Map(); // Track typing events to prevent spam
        this.TYPING_THROTTLE_MS = 2000; // Minimum interval between typing events
    }

    /**
     * Initialize the service and start listening for chat events
     */
    async initialize() {
        if (this.isListening) {
            return;
        }

        try {
            await this.rabbitmqService.connect();

            // Listen for all gig chat events
            await this.rabbitmqService.subscribeToRoutingKey('chat.*', (message) => {
                this.handleChatEvent(message);
            });

            this.isListening = true;
            logger.logConnection('Gig Chat Service initialized and listening for events');

        } catch (error) {
            logger.logError('Failed to initialize Gig Chat Service', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Handle incoming chat events from RabbitMQ
     */
    handleChatEvent(message) {
        try {
            const { eventType, data } = message;

            switch (eventType) {
                case 'gig_chat_message':
                    this.handleNewMessage(data);
                    break;

                case 'gig_chat_typing':
                    this.handleTypingIndicator(data);
                    break;

                default:
                    logger.logWarn('Unknown chat event type', { eventType });
            }

        } catch (error) {
            logger.logError('Error handling chat event', {
                error: error.message,
                message
            });
        }
    }

    /**
     * Handle new chat message
     */
    handleNewMessage(data) {
        try {
            const { recipientId, chatId, message, gigTitle, senderRole } = data;

            if (!recipientId) {
                logger.logWarn('No recipient ID in chat message', { data });
                return;
            }

            // Send message to recipient if they're connected
            const callback = this.subscribers.get(recipientId);
            if (callback) {
                callback({
                    type: 'gig_chat_message',
                    chatId,
                    message,
                    gigTitle,
                    senderRole,
                    timestamp: new Date().toISOString()
                });

                logger.logMessage('Chat message delivered to user', {
                    recipientId,
                    chatId,
                    senderRole
                });
            } else {
                logger.logWarn('User not connected for chat message', {
                    recipientId,
                    chatId
                });
            }

        } catch (error) {
            logger.logError('Error handling new chat message', {
                error: error.message,
                data
            });
        }
    }

    /**
     * Handle typing indicator
     */
    handleTypingIndicator(data) {
        try {
            const { recipientId, chatId, isTyping, senderId } = data;

            if (!recipientId) {
                logger.logWarn('No recipient ID in typing indicator', { data });
                return;
            }

            // Send typing indicator to recipient if they're connected
            const callback = this.subscribers.get(recipientId);
            if (callback) {
                callback({
                    type: 'gig_chat_typing',
                    chatId,
                    isTyping,
                    senderId,
                    timestamp: new Date().toISOString()
                });

                logger.logMessage('Typing indicator delivered to user', {
                    recipientId,
                    chatId,
                    isTyping
                });
            }

        } catch (error) {
            logger.logError('Error handling typing indicator', {
                error: error.message,
                data
            });
        }
    }

    /**
     * Subscribe user to chat messages
     */
    async subscribe(userId, callback) {
        try {
            // Store callback for this user
            this.subscribers.set(userId, callback);

            logger.logMessage('User subscribed to gig chat', { userId });

        } catch (error) {
            logger.logError('Error subscribing user to gig chat', {
                error: error.message,
                userId
            });
            throw error;
        }
    }

    /**
     * Unsubscribe user from chat messages
     */
    async unsubscribe(userId) {
        try {
            // Remove callback
            this.subscribers.delete(userId);

            logger.logMessage('User unsubscribed from gig chat', { userId });

        } catch (error) {
            logger.logError('Error unsubscribing user from gig chat', {
                error: error.message,
                userId
            });
        }
    }

    /**
     * Send typing indicator with throttling to prevent spam
     */
    async sendTypingIndicator(senderId, recipientId, chatId, isTyping) {
        try {
            const throttleKey = `${senderId}-${chatId}`;
            const now = Date.now();
            const lastTypingTime = this.typingThrottleMap.get(throttleKey) || 0;

            // Always allow typing stop events, but throttle typing start events
            if (isTyping && (now - lastTypingTime < this.TYPING_THROTTLE_MS)) {
                logger.logWarn('Typing indicator throttled to prevent spam', {
                    senderId,
                    chatId,
                    timeSinceLastTyping: now - lastTypingTime
                });
                return; // Skip this typing event
            }

            // Update throttle map
            if (isTyping) {
                this.typingThrottleMap.set(throttleKey, now);
            } else {
                // Clear throttle when typing stops
                this.typingThrottleMap.delete(throttleKey);
            }

            // Publish typing indicator event
            await this.rabbitmqService.publishEvent('chat.gig_chat_typing', {
                recipientId,
                chatId,
                isTyping,
                senderId,
                timestamp: new Date().toISOString()
            });

            logger.logMessage('Typing indicator sent', {
                senderId,
                recipientId,
                chatId,
                isTyping
            });

        } catch (error) {
            logger.logError('Error sending typing indicator', {
                error: error.message,
                senderId,
                recipientId,
                chatId
            });
        }
    }
}

module.exports = { GigChatService };