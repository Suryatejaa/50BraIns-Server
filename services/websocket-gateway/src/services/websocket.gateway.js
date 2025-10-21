/**
 * WebSocket Gateway Service
 * Handles all WebSocket connections and routes messages to appropriate services
 */

const WebSocket = require('ws');
const { NotificationService } = require('./notification.service');
const { ClanChatService } = require('./clan-chat.service');
const { RabbitMQService } = require('./rabbitmq.service');
const logger = require('../utils/logger');

class WebSocketGateway {
    constructor() {
        this.wss = null;
        this.connections = new Map(); // userId -> WebSocket
        this.userServices = new Map(); // userId -> { notifications: [], clans: [] }
        this.rabbitmqService = new RabbitMQService();
        this.notificationService = new NotificationService(this.rabbitmqService);
        this.clanChatService = new ClanChatService(this.rabbitmqService);
    }

    /**
     * Check if WebSocket Gateway is initialized
     */
    isInitialized() {
        return !!this.wss;
    }

    /**
     * Initialize WebSocket server
     */
    initialize(server) {
        // Prevent re-initialization
        if (this.wss) {
            logger.logWarn('WebSocket Gateway already initialized, skipping');
            return;
        }

        this.wss = new WebSocket.Server({
            noServer: true,
            clientTracking: true
        });

        // Handle WebSocket upgrade requests
        server.on('upgrade', (request, socket, head) => {
            if (request.url.startsWith('/ws')) {
                this.handleWebSocketUpgrade(request, socket, head);
            } else {
                socket.destroy();
            }
        });

        // Handle WebSocket connections
        this.wss.on('connection', (ws, request, userId, serviceType) => {
            this.handleConnection(ws, request, userId, serviceType);
        });

        // RabbitMQ connection is handled by the main service
        logger.logConnection('WebSocket Gateway initialized', {
            port: server.address()?.port || 'unknown'
        });
    }

    /**
     * Handle WebSocket upgrade request
     */
    handleWebSocketUpgrade(request, socket, head) {
        try {
            const url = new URL(request.url, `http://${request.headers.host}`);
            const userId = url.searchParams.get('userId');
            const serviceType = url.searchParams.get('serviceType') || 'notifications'; // Default to notifications

            // Validate required parameters
            if (!userId) {
                logger.logError('Missing userId in WebSocket connection', {
                    url: request.url
                });
                socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
                socket.destroy();
                return;
            }

            // Validate userId format
            if (typeof userId !== 'string' || userId.length < 3) {
                logger.logError('Invalid userId format', { userId });
                socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
                socket.destroy();
                return;
            }

            // Upgrade to WebSocket with both userId and serviceType
            this.wss.handleUpgrade(request, socket, head, (ws) => {
                this.wss.emit('connection', ws, request, userId, serviceType);
            });

        } catch (error) {
            logger.logError('Error in WebSocket upgrade', {
                error: error.message,
                url: request.url
            });
            socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
            socket.destroy();
        }
    }

    /**
     * Handle WebSocket connection
     */
    async handleConnection(ws, request, userId, serviceType) {
        // Check if user is already connected
        const existingConnection = this.connections.get(userId);
        if (existingConnection) {
            logger.logConnection('Replacing existing connection', { userId });
            existingConnection.close(1000, 'Replaced by new connection');
        }

        // Store connection
        this.connections.set(userId, ws);

        // Initialize user services based on serviceType
        this.userServices.set(userId, {
            notifications: serviceType === 'notifications' ? ['general'] : [],
            clans: serviceType === 'clan-chat' ? ['general'] : [],
            gigs: serviceType === 'gig' ? ['general'] : []
        });

        // Set connection metadata
        ws.userId = userId;
        ws.serviceType = serviceType;
        ws.connectedAt = new Date();

        // Send welcome message
        this.sendToUser(userId, {
            type: 'connected',
            userId,
            serviceType,
            timestamp: new Date().toISOString(),
            message: `Connected to WebSocket Gateway for ${serviceType} service`
        });

        logger.logConnection('Client connected to WebSocket Gateway', { userId, serviceType });

        // Handle connection close
        ws.on('close', (code, reason) => {
            this.handleDisconnection(ws, code, reason);
        });

        // Handle incoming messages
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                this.handleClientMessage(ws, message, userId);
            } catch (error) {
                logger.logError('Error parsing client message', {
                    error: error.message,
                    userId,
                    data: data.toString()
                });
                this.sendError(ws, 'Invalid message format');
            }
        });

        // Handle errors
        ws.on('error', (error) => {
            logger.logError('WebSocket error', {
                error: error.message,
                userId
            });
        });
    }

    /**
     * Handle messages from client
     */
    async handleClientMessage(ws, message, userId) {
        try {
            switch (message.type) {
                case 'subscribe_notifications':
                    await this.handleNotificationSubscription(ws, message, userId);
                    break;

                case 'unsubscribe_notifications':
                    await this.handleNotificationUnsubscription(ws, message, userId);
                    break;

                case 'subscribe_clan_chat':
                    await this.handleClanChatSubscription(ws, message, userId);
                    break;

                case 'unsubscribe_clan_chat':
                    await this.handleClanChatUnsubscription(ws, message, userId);
                    break;

                case 'chat':
                case 'chat_message':
                    await this.handleChatMessage(ws, message, userId);
                    break;

                case 'typing':
                case 'typing_indicator':
                    await this.handleTypingIndicator(ws, message, userId);
                    break;

                case 'notification_ack':
                    await this.handleNotificationAcknowledgment(ws, message, userId);
                    break;

                case 'read_receipt':
                    await this.handleReadReceipt(ws, message, userId);
                    break;

                case 'ping':
                    this.sendToUser(userId, { type: 'pong', timestamp: new Date().toISOString() });
                    break;

                default:
                    logger.logError('Unknown message type', {
                        type: message.type,
                        userId,
                        serviceType: ws.serviceType,
                        messageData: message
                    });
                    this.sendError(ws, 'Unknown message type');
            }
        } catch (error) {
            logger.logError('Error handling client message', {
                error: error.message,
                userId,
                serviceType: ws.serviceType,
                messageType: message.type
            });
            this.sendError(ws, 'Failed to process message');
        }
    }

    /**
     * Handle notification subscription
     */
    async handleNotificationSubscription(ws, message, userId) {
        try {
            // Check if RabbitMQ is ready, if not, wait and retry
            if (!this.rabbitmqService.isReady()) {
                logger.logWarn('RabbitMQ not ready, waiting for connection...', { userId, serviceType: ws.serviceType });

                // Log current RabbitMQ status for debugging
                const status = this.rabbitmqService.getConnectionStatus();
                logger.logWarn('Current RabbitMQ status', { ...status, userId, serviceType: ws.serviceType });

                // Wait for RabbitMQ to be ready (max 10 seconds)
                let attempts = 0;
                const maxAttempts = 20; // 20 * 500ms = 10 seconds

                while (!this.rabbitmqService.isReady() && attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    attempts++;

                    // Log status every 5 attempts
                    if (attempts % 5 === 0) {
                        const currentStatus = this.rabbitmqService.getConnectionStatus();
                        logger.logWarn(`RabbitMQ status after ${attempts} attempts`, { ...currentStatus, userId, serviceType: ws.serviceType });
                    }
                }

                if (!this.rabbitmqService.isReady()) {
                    const finalStatus = this.rabbitmqService.getConnectionStatus();
                    logger.logError('RabbitMQ connection timeout', { ...finalStatus, userId, serviceType: ws.serviceType });
                    throw new Error('RabbitMQ connection timeout');
                }
            }

            await this.notificationService.subscribe(userId, (notification) => {
                this.sendToUser(userId, {
                    type: 'notification',
                    ...notification
                });
            });

            const userServices = this.userServices.get(userId);
            if (userServices && userServices.notifications) {
                userServices.notifications.push('general');
            }

            this.sendToUser(userId, {
                type: 'subscription_confirmed',
                service: 'notifications',
                status: 'subscribed'
            });

            logger.logMessage('User subscribed to notifications', { userId, serviceType: ws.serviceType });

        } catch (error) {
            logger.logError('Error subscribing to notifications', {
                error: error.message,
                userId,
                serviceType: ws.serviceType
            });
            this.sendError(ws, 'Failed to subscribe to notifications');
        }
    }

    /**
     * Handle notification unsubscription
     */
    async handleNotificationUnsubscription(ws, message, userId) {
        try {
            await this.notificationService.unsubscribe(userId);

            const userServices = this.userServices.get(userId);
            if (userServices) {
                userServices.notifications = [];
            }

            this.sendToUser(userId, {
                type: 'subscription_confirmed',
                service: 'notifications',
                status: 'unsubscribed'
            });

            logger.logMessage('User unsubscribed from notifications', { userId, serviceType: ws.serviceType });

        } catch (error) {
            logger.logError('Error unsubscribing from notifications', {
                error: error.message,
                userId,
                serviceType: ws.serviceType
            });
            this.sendError(ws, 'Failed to unsubscribe from notifications');
        }
    }

    /**
     * Handle clan chat subscription
     */
    async handleClanChatSubscription(ws, message, userId) {
        try {
            const { clanId } = message;

            if (!clanId) {
                this.sendError(ws, 'Clan ID is required for chat subscription');
                return;
            }

            // Check if RabbitMQ is ready, if not, wait and retry
            if (!this.rabbitmqService.isReady()) {
                logger.logWarn('RabbitMQ not ready, waiting for connection...', { userId, clanId, serviceType: ws.serviceType });

                // Log current RabbitMQ status for debugging
                const status = this.rabbitmqService.getConnectionStatus();
                logger.logWarn('Current RabbitMQ status', { ...status, userId, clanId, serviceType: ws.serviceType });

                // Wait for RabbitMQ to be ready (max 10 seconds)
                let attempts = 0;
                const maxAttempts = 20; // 20 * 500ms = 10 seconds

                while (!this.rabbitmqService.isReady() && attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    attempts++;

                    // Log status every 5 attempts
                    if (attempts % 5 === 0) {
                        const currentStatus = this.rabbitmqService.getConnectionStatus();
                        logger.logWarn(`RabbitMQ status after ${attempts} attempts`, { ...currentStatus, userId, clanId, serviceType: ws.serviceType });
                    }
                }

                if (!this.rabbitmqService.isReady()) {
                    const finalStatus = this.rabbitmqService.getConnectionStatus();
                    logger.logError('RabbitMQ connection timeout', { ...finalStatus, userId, clanId, serviceType: ws.serviceType });
                    throw new Error('RabbitMQ connection timeout');
                }
            }

            await this.clanChatService.subscribe(userId, clanId, (chatMessage) => {
                this.sendToUser(userId, {
                    type: 'chat',
                    ...chatMessage
                });
            });

            const userServices = this.userServices.get(userId);
            if (userServices && userServices.clans && !userServices.clans.includes(clanId)) {
                userServices.clans.push(clanId);
            }

            this.sendToUser(userId, {
                type: 'subscription_confirmed',
                service: 'clan_chat',
                clanId,
                status: 'subscribed'
            });

            logger.logMessage('User subscribed to clan chat', { userId, clanId, serviceType: ws.serviceType });

        } catch (error) {
            logger.logError('Error subscribing to clan chat', {
                error: error.message,
                userId,
                serviceType: ws.serviceType,
                clanId: message.clanId
            });
            this.sendError(ws, 'Failed to subscribe to clan chat');
        }
    }

    /**
     * Handle clan chat unsubscription
     */
    async handleClanChatUnsubscription(ws, message, userId) {
        try {
            const { clanId } = message;

            if (!clanId) {
                this.sendError(ws, 'Clan ID is required for chat unsubscription');
                return;
            }

            await this.clanChatService.unsubscribe(userId, clanId);

            const userServices = this.userServices.get(userId);
            if (userServices && userServices.clans) {
                userServices.clans = userServices.clans.filter(id => id !== clanId);
            }

            this.sendToUser(userId, {
                type: 'subscription_confirmed',
                service: 'clan_chat',
                clanId,
                status: 'unsubscribed'
            });

            logger.logMessage('User unsubscribed from clan chat', { userId, clanId, serviceType: ws.serviceType });

        } catch (error) {
            logger.logError('Error unsubscribing from clan chat', {
                error: error.message,
                userId,
                serviceType: ws.serviceType,
                clanId: message.clanId
            });
            this.sendError(ws, 'Failed to unsubscribe from clan chat');
        }
    }

    /**
     * Handle chat message
     */
    async handleChatMessage(ws, message, userId) {
        try {
            const { content, clanId, messageType = 'TEXT' } = message;

            if (!content || !clanId) {
                this.sendError(ws, 'Message content and clan ID are required');
                return;
            }

            // Route to clan chat service
            const result = await this.clanChatService.handleChat(userId, clanId, content, messageType);

            // Send confirmation to sender
            this.sendToUser(userId, {
                type: 'message_sent',
                messageId: result.messageId,
                timestamp: new Date().toISOString()
            });

            logger.logMessage('Chat message processed', {
                userId,
                clanId,
                messageId: result.messageId,
                serviceType: ws.serviceType
            });

        } catch (error) {
            logger.logError('Error handling chat message', {
                error: error.message,
                userId,
                serviceType: ws.serviceType,
                clanId: message.clanId
            });
            this.sendError(ws, 'Failed to send message');
        }
    }

    /**
     * Handle typing indicator
     */
    async handleTypingIndicator(ws, message, userId) {
        try {
            const { isTyping, clanId } = message;

            if (!clanId) {
                this.sendError(ws, 'Clan ID is required for typing indicator');
                return;
            }

            await this.clanChatService.handleTypingIndicator(userId, clanId, isTyping);

            logger.logMessage('Typing indicator processed', {
                userId,
                clanId,
                isTyping,
                serviceType: ws.serviceType
            });

        } catch (error) {
            logger.logError('Error handling typing indicator', {
                error: error.message,
                userId,
                serviceType: ws.serviceType,
                clanId: message.clanId
            });
            this.sendError(ws, 'Failed to process typing indicator');
        }
    }

    /**
     * Handle notification acknowledgment
     */
    async handleNotificationAcknowledgment(ws, message, userId) {
        try {
            const { notificationId } = message;

            if (notificationId) {
                await this.notificationService.acknowledge(userId, notificationId);
            }

        } catch (error) {
            logger.logError('Error handling notification acknowledgment', {
                error: error.message,
                userId,
                serviceType: ws.serviceType,
                notificationId: message.notificationId
            });
        }
    }

    /**
     * Handle client disconnection
     */
    handleDisconnection(ws, code, reason) {
        const { userId, serviceType } = ws;

        if (userId) {
            // Remove connection
            this.connections.delete(userId);

            // Unsubscribe from all services
            this.notificationService.unsubscribe(userId);
            this.clanChatService.unsubscribe(userId);

            // Remove user services
            this.userServices.delete(userId);

            logger.logConnection('Client disconnected from WebSocket Gateway', {
                userId,
                serviceType,
                code,
                reason: reason ? reason.toString() : 'No reason'
            });
        }
    }

    /**
     * Handle read receipt
     */
    async handleReadReceipt(ws, message, userId) {
        try {
            const { messageId, clanId } = message;

            if (!messageId || !clanId) {
                this.sendError(ws, 'Message ID and Clan ID are required for read receipt');
                return;
            }

            // Forward read receipt to clan chat service
            await this.clanChatService.handleReadReceipt(userId, messageId, clanId);

            logger.logMessage('Read receipt processed', { userId, messageId, clanId, serviceType: ws.serviceType });

        } catch (error) {
            logger.logError('Error handling read receipt', {
                error: error.message,
                userId,
                serviceType: ws.serviceType,
                messageId: message.messageId,
                clanId: message.clanId
            });
            this.sendError(ws, 'Failed to process read receipt');
        }
    }

    /**
     * Send message to specific client
     */
    sendToClient(ws, data) {
        if (ws && ws.readyState === WebSocket.OPEN) {
            try {
                ws.send(JSON.stringify(data));
            } catch (error) {
                logger.logError('Error sending message to client', {
                    error: error.message,
                    userId: ws.userId,
                    serviceType: ws.serviceType
                });
            }
        }
    }

    /**
     * Send message to specific user by userId
     */
    sendToUser(userId, data) {
        try {
            const ws = this.connections.get(userId);
            if (ws && ws.readyState === WebSocket.OPEN) {
                this.sendToClient(ws, data);
                logger.logMessage('Message sent to user', { userId, messageType: data.type });
            } else {
                logger.logWarn('User not connected or WebSocket not ready', { userId, readyState: ws?.readyState });
            }
        } catch (error) {
            logger.logError('Error sending message to user', {
                error: error.message,
                userId
            });
        }
    }

    /**
     * Send error to client
     */
    sendError(ws, message, details = null) {
        this.sendToClient(ws, {
            type: 'error',
            message,
            details,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Get connection statistics
     */
    getStats() {
        const stats = {
            totalConnections: this.connections.size,
            activeConnections: 0,
            users: Array.from(this.connections.keys()),
            services: {
                notifications: 0,
                clanChat: 0,
                gigs: 0
            },
            serviceTypes: {
                notifications: 0,
                'clan-chat': 0,
                gig: 0
            }
        };

        // Count active connections and service subscriptions
        for (const [userId, ws] of this.connections) {
            if (ws.readyState === WebSocket.OPEN) {
                stats.activeConnections++;

                const userServices = this.userServices.get(userId);
                if (userServices) {
                    if (userServices.notifications.length > 0) stats.services.notifications++;
                    if (userServices.clans.length > 0) stats.services.clanChat++;
                    if (userServices.gigs.length > 0) stats.services.gigs++;
                }

                // Count by service type
                if (ws.serviceType) {
                    stats.serviceTypes[ws.serviceType] = (stats.serviceTypes[ws.serviceType] || 0) + 1;
                }
            }
        }

        return stats;
    }

    /**
     * Close all connections
     */
    close() {
        if (this.wss) {
            this.wss.close();
            this.wss = null;
        }

        // Close all client connections
        for (const [userId, ws] of this.connections) {
            try {
                ws.close(1000, 'Service shutting down');
            } catch (error) {
                // Ignore errors during shutdown
            }
        }

        this.connections.clear();
        this.userServices.clear();

        logger.logConnection('WebSocket Gateway closed');
    }

    /**
     * Reset WebSocket Gateway (for testing/debugging)
     */
    reset() {
        this.close();
        this.wss = null;
        logger.logConnection('WebSocket Gateway reset');
    }
}

module.exports = { WebSocketGateway };
