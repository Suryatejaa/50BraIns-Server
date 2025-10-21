const amqp = require('amqplib');
const logger = require('./logger');
const WebSocketService = require('./websocket');

class RabbitMQWebSocketBridge {
    constructor() {
        this.connection = null;
        this.channel = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 5000;
    }

    async initialize() {
        try {
            await this.connect();
            await this.setupQueues();
            await this.startConsuming();
            logger.info('✅ RabbitMQ → WebSocket bridge initialized');
        } catch (error) {
            logger.error('❌ Failed to initialize RabbitMQ → WebSocket bridge:', error);
            throw error;
        }
    }

    async connect() {
        try {
            const url = process.env.RABBITMQ_URL || 'amqp://admin:admin123@localhost:5672';
            this.connection = await amqp.connect(url);
            this.channel = await this.connection.createChannel();
            this.isConnected = true;
            this.reconnectAttempts = 0;

            // Handle connection events
            this.connection.on('close', () => {
                logger.warn('🔌 RabbitMQ connection closed');
                this.isConnected = false;
                this.scheduleReconnect();
            });

            this.connection.on('error', (error) => {
                logger.error('❌ RabbitMQ connection error:', error);
                this.isConnected = false;
            });

            logger.info('✅ Connected to RabbitMQ');
        } catch (error) {
            logger.error('❌ Failed to connect to RabbitMQ:', error);
            throw error;
        }
    }

    async setupQueues() {
        try {
            // Create exchanges
            await this.channel.assertExchange('brains_events', 'topic', { durable: true });
            await this.channel.assertExchange('gig_events', 'topic', { durable: true });
            await this.channel.assertExchange('credit_events', 'topic', { durable: true });

            // Create notification queue
            await this.channel.assertQueue('notification_websocket_queue', { durable: true });

            // Bind to various event types
            const bindings = [
                { exchange: 'brains_events', routingKey: 'auth.event' },
                { exchange: 'brains_events', routingKey: 'user.event' },
                { exchange: 'brains_events', routingKey: 'clan.event' },
                { exchange: 'gig_events', routingKey: 'gig.event' },
                { exchange: 'credit_events', routingKey: 'credit.event' },
                { exchange: 'credit_events', routingKey: 'boost.event' }
            ];

            for (const binding of bindings) {
                await this.channel.bindQueue(
                    'notification_websocket_queue',
                    binding.exchange,
                    binding.routingKey
                );
            }

            logger.info('✅ RabbitMQ queues and bindings setup complete');
        } catch (error) {
            logger.error('❌ Failed to setup RabbitMQ queues:', error);
            throw error;
        }
    }

    async startConsuming() {
        try {
            await this.channel.consume('notification_websocket_queue', (msg) => {
                if (msg) {
                    this.handleMessage(msg);
                }
            });

            logger.info('🎧 Started consuming RabbitMQ messages for WebSocket bridge');
        } catch (error) {
            logger.error('❌ Failed to start consuming:', error);
            throw error;
        }
    }

    handleMessage(msg) {
        try {
            const content = JSON.parse(msg.content.toString());
            logger.debug('📥 Received RabbitMQ message for WebSocket bridge:', {
                routingKey: msg.fields.routingKey,
                eventType: content.eventType,
                userId: content.userId
            });

            // Skip events that are already handled by NotificationConsumer to avoid duplicates
            const skipEvents = [
                'gig_created', 'gig_applied', 'gig_assigned', 'gig_completed', 'application_accepted',
                'clan_member_joined', 'clan_invitation_sent', 'clan_member_role_changed',
                'user_registered'
            ];

            console.log('🔍 [WebSocket Bridge] Processing event:', content.eventType, 'Skip list:', skipEvents.includes(content.eventType));

            if (skipEvents.includes(content.eventType)) {
                console.log(`⏭️ [WebSocket Bridge] Skipping event ${content.eventType} - handled by NotificationConsumer`);
                logger.debug(`⏭️ Skipping event ${content.eventType} - handled by NotificationConsumer`);
                this.channel.ack(msg);
                return;
            }

            // Extract the target user(s) from the message
            const targetUsers = this.extractTargetUsers(content);

            if (targetUsers.length > 0) {
                // Send to WebSocket clients
                this.sendToWebSocketClients(targetUsers, content);
            }

            // Acknowledge the message
            this.channel.ack(msg);
        } catch (error) {
            logger.error('❌ Error handling RabbitMQ message:', error);
            // Reject the message to prevent infinite retries
            this.channel.nack(msg, false, false);
        }
    }

    extractTargetUsers(content) {
        const users = new Set();

        // Extract user IDs based on event type
        switch (content.eventType) {
            case 'user.login':
                if (content.userId) users.add(content.userId);
                break;

            case 'gig_created':
                // Notify all users who might be interested in new gigs
                if (content.postedById) users.add(content.postedById);
                // You could also notify users based on skills, location, etc.
                break;

            case 'gig_applied':
                if (content.gigPostedById) users.add(content.gigPostedById);
                if (content.applicantId) users.add(content.applicantId);
                break;

            case 'clan_created':
                if (content.clanHeadId) users.add(content.clanHeadId);
                break;

            case 'clan_member_joined':
                if (content.clanHeadId) users.add(content.clanHeadId);
                if (content.memberId) users.add(content.memberId);
                break;

            case 'clan_invitation_sent':
                if (content.invitedUserId) users.add(content.invitedUserId);
                if (content.invitedByUserId) users.add(content.invitedByUserId);
                break;

            case 'credit_earned':
            case 'credit_spent':
            case 'boost_purchased':
                if (content.userId) users.add(content.userId);
                break;

            default:
                // For unknown event types, try to extract userId
                if (content.userId) users.add(content.userId);
                break;
        }

        return Array.from(users);
    }

    sendToWebSocketClients(userIds, eventData) {
        try {
            const notification = {
                id: eventData.eventId || `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: this.mapEventTypeToNotificationType(eventData.eventType),
                title: this.generateNotificationTitle(eventData),
                message: this.generateNotificationMessage(eventData),
                data: eventData,
                createdAt: new Date(),
                read: false
            };

            // Send to each connected user
            for (const userId of userIds) {
                const success = WebSocketService.sendNotification(userId, notification);
                if (success) {
                    logger.debug(`📤 Sent WebSocket notification to user ${userId}:`, {
                        eventType: eventData.eventType,
                        notificationId: notification.id
                    });
                } else {
                    logger.debug(`📤 User ${userId} not connected via WebSocket`);
                }
            }

            // Also broadcast to all connected users for system-wide events
            if (this.isSystemEvent(eventData.eventType)) {
                WebSocketService.broadcastNotification(notification);
                logger.debug(`📢 Broadcasted system notification: ${eventData.eventType}`);
            }

        } catch (error) {
            logger.error('❌ Error sending WebSocket notification:', error);
        }
    }

    mapEventTypeToNotificationType(eventType) {
        const typeMap = {
            'user.login': 'SYSTEM',
            'gig_created': 'ENGAGEMENT',
            'gig_applied': 'ENGAGEMENT',
            'clan_created': 'ENGAGEMENT',
            'clan_member_joined': 'ENGAGEMENT',
            'clan_invitation_sent': 'ENGAGEMENT',
            'credit_earned': 'TRANSACTIONAL',
            'credit_spent': 'TRANSACTIONAL',
            'boost_purchased': 'TRANSACTIONAL'
        };

        return typeMap[eventType] || 'SYSTEM';
    }

    generateNotificationTitle(eventData) {
        const titleMap = {
            'user.login': 'Welcome back!',
            'gig_created': 'New gig posted',
            'gig_applied': 'Application received',
            'clan_created': 'Clan created',
            'clan_member_joined': 'New clan member',
            'clan_invitation_sent': 'Clan invitation',
            'credit_earned': 'Credits earned',
            'credit_spent': 'Credits spent',
            'boost_purchased': 'Boost purchased'
        };

        return titleMap[eventData.eventType] || 'New notification';
    }

    generateNotificationMessage(eventData) {
        switch (eventData.eventType) {
            case 'gig_created':
                return `A new gig "${eventData.gigTitle}" has been posted`;
            case 'gig_applied':
                return `Someone applied to your gig "${eventData.gigTitle}"`;
            case 'clan_created':
                return `Clan "${eventData.clanName}" has been created`;
            case 'clan_member_joined':
                return `A new member joined clan "${eventData.clanName}"`;
            case 'clan_invitation_sent':
                return `You've been invited to join clan "${eventData.clanName}"`;
            case 'credit_earned':
                return `You earned ${eventData.amount} credits`;
            case 'credit_spent':
                return `You spent ${eventData.amount} credits`;
            case 'boost_purchased':
                return `You purchased a boost for ${eventData.amount} credits`;
            default:
                return 'You have a new notification';
        }
    }

    isSystemEvent(eventType) {
        const systemEvents = ['user.login'];
        return systemEvents.includes(eventType);
    }

    scheduleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            logger.info(`🔄 Scheduling RabbitMQ reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

            setTimeout(async () => {
                try {
                    await this.initialize();
                } catch (error) {
                    logger.error('❌ Reconnection failed:', error);
                    this.scheduleReconnect();
                }
            }, this.reconnectDelay * this.reconnectAttempts);
        } else {
            logger.error('❌ Max reconnection attempts reached');
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
            logger.info('🔌 RabbitMQ → WebSocket bridge closed');
        } catch (error) {
            logger.error('❌ Error closing RabbitMQ connection:', error);
        }
    }

    getStatus() {
        return {
            isConnected: this.isConnected,
            reconnectAttempts: this.reconnectAttempts,
            connectedUsers: WebSocketService.getConnectionCount()
        };
    }
}

module.exports = new RabbitMQWebSocketBridge(); 