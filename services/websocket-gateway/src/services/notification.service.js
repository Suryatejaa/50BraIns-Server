/**
 * Notification Service
 * Handles notification subscriptions and routing
 */

const { RabbitMQService } = require('./rabbitmq.service');
const logger = require('../utils/logger');

class NotificationService {
    constructor(rabbitmqService) {
        this.subscribers = new Map(); // userId -> callback function
        this.rabbitmqService = rabbitmqService; // Use the shared instance
    }

    /**
     * Subscribe user to notifications
     */
    async subscribe(userId, callback) {
        try {
            // Store callback for this user
            this.subscribers.set(userId, callback);

            // Subscribe to RabbitMQ notifications for this user
            await this.rabbitmqService.subscribeToUserNotifications(userId, (notification) => {
                this.sendNotificationToUser(userId, notification);
            });

            logger.logMessage('User subscribed to notifications', { userId });

        } catch (error) {
            logger.logError('Error subscribing user to notifications', {
                error: error.message,
                userId
            });
            throw error;
        }
    }

    /**
     * Unsubscribe user from notifications
     */
    async unsubscribe(userId) {
        try {
            // Remove callback
            this.subscribers.delete(userId);

            // Unsubscribe from RabbitMQ
            await this.rabbitmqService.unsubscribeFromUserNotifications(userId);

            logger.logMessage('User unsubscribed from notifications', { userId });

        } catch (error) {
            logger.logError('Error unsubscribing user from notifications', {
                error: error.message,
                userId
            });
        }
    }

    /**
     * Send notification to specific user
     */
    sendNotificationToUser(userId, notification) {
        const callback = this.subscribers.get(userId);
        if (callback) {
            try {
                callback(notification);
            } catch (error) {
                logger.logError('Error in notification callback', {
                    error: error.message,
                    userId
                });
            }
        }
    }

    /**
     * Handle notification acknowledgment
     */
    async acknowledge(userId, notificationId) {
        try {
            // Publish acknowledgment to RabbitMQ
            await this.rabbitmqService.publishEvent('notification.acknowledged', {
                userId,
                notificationId,
                timestamp: new Date().toISOString()
            });

            logger.logMessage('Notification acknowledged', {
                userId,
                notificationId
            });

        } catch (error) {
            logger.logError('Error acknowledging notification', {
                error: error.message,
                userId,
                notificationId
            });
        }
    }

    /**
     * Handle read receipt
     */
    async handleReadReceipt(userId, messageId, clanId) {
        try {
            // Publish read receipt to RabbitMQ
            await this.rabbitmqService.publishEvent('notification.read', {
                userId,
                messageId,
                clanId,
                timestamp: new Date().toISOString()
            });

            logger.logMessage('Notification read receipt published', {
                userId,
                messageId,
                clanId
            });

        } catch (error) {
            logger.logError('Error handling notification read receipt', {
                error: error.message,
                userId,
                messageId,
                clanId
            });
        }
    }

    /**
     * Get notification statistics
     */
    getStats() {
        return {
            totalSubscribers: this.subscribers.size,
            activeSubscribers: Array.from(this.subscribers.keys())
        };
    }
}

module.exports = { NotificationService };
