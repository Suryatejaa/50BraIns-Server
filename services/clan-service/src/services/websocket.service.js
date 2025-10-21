const WebSocket = require('ws');
const http = require('http');
const messageService = require('./message.service');
const { RabbitMQService } = require('./rabbitmq.service');
const logger = require('../utils/logger');

class WebSocketService {
    constructor() {
        this.wss = null;
        this.clients = new Map(); // Map to store client connections by clanId
        this.rabbitmqService = new RabbitMQService();
        this.server = null;
        this.processedClientMessages = new Set(); // Track processed client message IDs
    }

    /**
     * Initialize WebSocket server
     */
    initialize(server) {
        this.server = server;
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
        this.wss.on('connection', (ws, request, userId, clanId) => {
            this.handleConnection(ws, request, userId, clanId);
        });

        // Initialize RabbitMQ connection
        this.rabbitmqService.connect();

        logger.logConnection('WebSocket service initialized', {
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
            const clanId = url.searchParams.get('clanId');

            // Validate required parameters
            if (!userId || !clanId) {
                logger.logError('Missing required WebSocket parameters', new Error('Missing required parameters'), {
                    userId: userId || 'missing',
                    clanId: clanId || 'missing',
                    url: request.url
                });
                socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
                socket.destroy();
                return;
            }

            // Validate parameter formats
            if (typeof userId !== 'string' || userId.length < 3) {
                logger.logError('Invalid userId format', new Error('Invalid userId format'), { userId });
                socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
                socket.destroy();
                return;
            }

            if (typeof clanId !== 'string' || clanId.length < 10) {
                logger.logError('Invalid clanId format', new Error('Invalid clanId format'), { clanId });
                socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
                socket.destroy();
                return;
            }

            // Upgrade to WebSocket
            this.wss.handleUpgrade(request, socket, head, (ws) => {
                this.wss.emit('connection', ws, request, userId, clanId);
            });

        } catch (error) {
            logger.logError('Error in WebSocket upgrade', error, {
                url: request.url
            });
            socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
            socket.destroy();
        }
    }

    /**
     * Handle WebSocket connection
     */
    async handleConnection(ws, request, userId, clanId) {
        // Check if user is already connected to this clan
        const existingConnection = this.getExistingConnection(userId, clanId);
        if (existingConnection) {
            logger.logConnection(userId, clanId, 'replaced');
            existingConnection.close(1000, 'Replaced by new connection');
        }

        // Store connection
        if (!this.clients.has(clanId)) {
            this.clients.set(clanId, new Map());
        }
        this.clients.get(clanId).set(userId, ws);

        // Set connection metadata
        ws.userId = userId;
        ws.clanId = clanId;
        ws.connectedAt = new Date();

        logger.logConnection(userId, clanId, 'connected');

        // Send welcome message
        this.sendToClient(ws, {
            type: 'connected',
            userId,
            clanId,
            timestamp: new Date().toISOString()
        });

        // Send recent messages
        await this.sendRecentMessages(ws, clanId);

        logger.logConnection(userId, clanId, 'connected');

        // Handle connection close
        ws.on('close', (code, reason) => {
            this.handleDisconnection(ws, code, reason);
        });

        // Handle incoming messages
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                this.handleClientMessage(ws, message, userId, clanId);
            } catch (error) {
                logger.logError('Error parsing client message', error, {
                    userId,
                    clanId,
                    data: data.toString()
                });
                this.sendError(ws, 'Invalid message format');
            }
        });
    }

    /**
     * Get existing connection for user in clan
     */
    getExistingConnection(userId, clanId) {
        const clanConnections = this.clients.get(clanId);
        if (clanConnections) {
            return clanConnections.get(userId);
        }
        return null;
    }

    /**
     * Handle messages from client
     */
    async handleClientMessage(ws, message, userId, clanId) {
        try {
            switch (message.type) {
                case 'chat':
                case 'chat_message': // Support both message types
                    await this.handleChatMessage(ws, message, userId, clanId);
                    break;
                case 'typing_indicator': // Changed from 'typing' to 'typing_indicator'
                    this.handleTypingIndicator(ws, message, userId, clanId);
                    break;
                case 'delivery_confirmation':
                    await this.handleDeliveryConfirmation(message, userId, clanId);
                    break;
                case 'read_receipt':
                    await this.handleReadReceipt(ws, message, userId, clanId);
                    break;
                case 'delete_message':
                    await this.handleDeleteMessage(message, userId, clanId);
                    break;
                case 'get_message_status':
                    await this.handleGetMessageStatus(ws, message, userId, clanId);
                    break;
                case 'get_recent_messages':
                    await this.handleGetRecentMessages(ws, message, userId, clanId);
                    break;
                case 'get_more_messages':
                    await this.handleGetMoreMessages(ws, message, userId, clanId);
                    break;
                case 'get_message_details':
                    await this.handleGetMessageDetails(ws, message, userId, clanId);
                    break;
                case 'get_delivery_details':
                    await this.handleGetDeliveryDetails(ws, message, userId, clanId);
                    break;
                case 'get_message_summary':
                    await this.handleGetMessageSummary(ws, message, userId, clanId);
                    break;
                default:
                    logger.logError('Unknown message type received', new Error(`Unsupported message type: ${message.type}`), {
                        type: message.type,
                        userId,
                        clanId,
                        messageData: message
                    });
                    this.sendError(ws, 'Unknown message type', `Unsupported message type: ${message.type}`);
            }
        } catch (error) {
            logger.logError('Error handling client message', error, { userId, clanId });
            this.sendError(ws, 'Failed to process message', error.message);
        }
    }

    /**
     * Handle chat message from client
     */
    async handleChatMessage(ws, message, userId, clanId) {
        const { content, messageType = 'TEXT', clientMessageId } = message;

        if (!content) {
            this.sendError(ws, 'Message content is required');
            return;
        }

        // Check for duplicate client message IDs
        if (clientMessageId && this.processedClientMessages.has(clientMessageId)) {
            console.log(`⚠️ [WebSocket] Duplicate client message ID detected: ${clientMessageId}, skipping`);
            return;
        }

        // Add message ID to prevent duplicate processing
        const messageId = `temp_${Date.now()}_${userId}`;
        console.log(`📤 [WebSocket] Processing chat message: ${messageId} from user: ${userId} in clan: ${clanId}`);

        try {
            // Save message to database
            const savedMessage = await messageService.createMessage({
                content,
                userId,
                clanId,
                messageType
            });

            console.log(`✅ [WebSocket] Message saved to database: ${savedMessage.id}`);

            // Mark client message as processed
            if (clientMessageId) {
                this.processedClientMessages.add(clientMessageId);
                // Clean up old entries to prevent memory leaks (keep last 1000)
                if (this.processedClientMessages.size > 1000) {
                    const entries = Array.from(this.processedClientMessages);
                    this.processedClientMessages.clear();
                    entries.slice(-500).forEach(id => this.processedClientMessages.add(id));
                }
            }

            // Send confirmation to sender
            this.sendToClient(ws, {
                type: 'message_sent',
                messageId: savedMessage.id,
                content: savedMessage.content,
                timestamp: new Date().toISOString()
            });

            // Automatically mark message as delivered to sender
            await messageService.markAsDelivered(savedMessage.id, userId);

            // Send delivery confirmation to sender
            this.sendToClient(ws, {
                type: 'delivery_confirmed',
                messageId: savedMessage.id,
                timestamp: new Date().toISOString()
            });

            // Broadcast message to all clan members
            const broadcastData = {
                type: 'message', // Changed from 'chat' to 'message' to match frontend expectations
                id: savedMessage.id,
                content: savedMessage.content,
                userId: savedMessage.userId,
                clanId: savedMessage.clanId,
                messageType: savedMessage.messageType,
                timestamp: savedMessage.createdAt.toISOString(),
                createdAt: savedMessage.createdAt.toISOString()
            };

            this.broadcastToClan(clanId, broadcastData, userId);

            // Publish event to RabbitMQ
            await this.rabbitmqService.publishEvent('clan.message.sent', {
                messageId: savedMessage.id,
                clanId,
                userId,
                content,
                messageType,
                timestamp: new Date().toISOString()
            });

            logger.logMessage(userId, clanId, 'chat');

        } catch (error) {
            logger.logError('Error handling chat message', error, { userId, clanId });
            this.sendError(ws, 'Failed to send message');
        }
    }

    /**
     * Handle typing indicator
     */
    handleTypingIndicator(ws, message, userId, clanId) {
        const { isTyping } = message;

        if (typeof isTyping === 'undefined') {
            logger.logError('Missing isTyping property in typing indicator', new Error('Missing isTyping property'), { userId, clanId, message });
            this.sendError(ws, 'Missing isTyping property');
            return;
        }

        // Send the correct event type that frontend expects
        const typingMessage = {
            type: isTyping ? 'typing_started' : 'typing_stopped',
            userId,
            clanId,
            timestamp: new Date().toISOString()
        };

        // Broadcast to all clan members except sender
        this.broadcastToClan(clanId, typingMessage, [userId]);
        logger.logMessage(userId, clanId, 'typing');
    }

    /**
     * Handle delivery confirmation
     */
    async handleDeliveryConfirmation(message, userId, clanId) {
        const { messageId } = message;

        try {
            await messageService.markAsDelivered(messageId, userId);

            // Notify message sender about delivery
            const deliveryData = {
                type: 'delivery_confirmed',
                messageId,
                deliveredTo: userId,
                timestamp: new Date().toISOString()
            };

            // Find the message sender and notify them
            const originalMessage = await messageService.getMessageById(messageId);
            if (originalMessage && originalMessage.userId !== userId) {
                this.sendToUser(originalMessage.userId, deliveryData);
            }

            logger.logMessage(userId, clanId, 'delivery_confirmation');

        } catch (error) {
            logger.logError('Error handling delivery confirmation', error, { messageId, userId, clanId });
        }
    }

    /**
     * Handle read receipt with validation
     */
    async handleReadReceipt(ws, message, userId, clanId) {
        const { messageId } = message;

        // Validate message ID format (should be a valid CUID)
        if (!messageId || typeof messageId !== 'string' || messageId.length < 10) {
            logger.logError('Invalid message ID format for read receipt', new Error('Invalid message ID format'), {
                messageId,
                userId,
                clanId
            });
            this.sendError(ws, 'Invalid message ID format');
            return;
        }

        try {
            // Check if message exists and belongs to this clan
            const messageExists = await messageService.getMessageById(messageId);
            if (!messageExists) {
                logger.logError('Read receipt for non-existent message', new Error('Message not found'), {
                    messageId,
                    userId,
                    clanId
                });
                // Don't send error to client, just log it
                return;
            }

            if (messageExists.clanId !== clanId) {
                logger.logError('Read receipt for message from different clan', new Error('Message from different clan'), {
                    messageId,
                    userId,
                    clanId,
                    messageClanId: messageExists.clanId
                });
                return;
            }

            // Mark as read
            await messageService.markAsRead(messageId, userId);

            // Notify message sender about read receipt
            const readData = {
                type: 'read_receipt',
                messageId,
                readBy: userId,
                timestamp: new Date().toISOString()
            };

            // Send to message sender if they're online
            this.sendToUser(messageExists.userId, readData);

            // Publish event to RabbitMQ
            await this.rabbitmqService.publishEvent('clan.message.read', {
                messageId,
                clanId,
                readBy: userId,
                timestamp: new Date().toISOString()
            });

            logger.logMessage(userId, clanId, 'read_receipt');

        } catch (error) {
            logger.logError('Error handling read receipt', error, {
                messageId,
                userId,
                clanId
            });
            // Don't send error to client for read receipts
        }
    }

    /**
     * Handle message deletion
     */
    async handleDeleteMessage(message, userId, clanId) {
        const { messageId } = message;

        try {
            // Check if user can delete this message
            const originalMessage = await messageService.getMessageById(messageId);
            if (!originalMessage) {
                throw new Error('Message not found');
            }

            // Only message sender or clan admin can delete
            if (originalMessage.userId !== userId && !await this.isClanAdmin(userId, clanId)) {
                throw new Error('Unauthorized to delete this message');
            }

            // Soft delete the message
            await messageService.deleteMessage(messageId, userId);

            // Broadcast deletion to all clan members
            const deleteData = {
                type: 'message_deleted',
                messageId,
                deletedBy: userId,
                timestamp: new Date().toISOString()
            };

            this.broadcastToClan(clanId, deleteData);

            // Publish to RabbitMQ
            await this.rabbitmqService.publishEvent('clan.message.deleted', {
                messageId,
                deletedBy: userId,
                clanId,
                timestamp: new Date().toISOString()
            });

            logger.logMessage(userId, clanId, 'message_deleted');

        } catch (error) {
            logger.logError('Error handling message deletion', error, { messageId, userId, clanId });
        }
    }

    /**
     * Handle get message status request
     */
    async handleGetMessageStatus(ws, message, userId, clanId) {
        const { messageId } = message;

        try {
            const status = await messageService.getMessageStatus(messageId);

            this.sendToClient(ws, {
                type: 'message_status',
                ...status
            });

            logger.logMessage(userId, clanId, 'message_status');

        } catch (error) {
            logger.logError('Error getting message status', error, { messageId, userId, clanId });
            this.sendError(ws, 'Failed to get message status', error.message);
        }
    }

    /**
     * Handle get recent messages request
     */
    async handleGetRecentMessages(ws, message, userId, clanId) {
        const { limit = 50 } = message;

        try {
            const messages = await messageService.getRecentMessages(clanId, limit);

            this.sendToClient(ws, {
                type: 'recent_messages',
                messages,
                timestamp: new Date().toISOString()
            });

            logger.logMessage(userId, clanId, 'recent_messages');

        } catch (error) {
            logger.logError('Error getting recent messages', error, { userId, clanId });
            this.sendError(ws, 'Failed to get recent messages', error.message);
        }
    }

    /**
     * Handle get more messages request
     */
    async handleGetMoreMessages(ws, message, userId, clanId) {
        const { page = 1, limit = 20 } = message;

        try {
            const messages = await messageService.getMoreMessages(clanId, page, limit);

            this.sendToClient(ws, {
                type: 'more_messages',
                messages,
                page,
                limit,
                timestamp: new Date().toISOString()
            });

            logger.logMessage(userId, clanId, 'more_messages');

        } catch (error) {
            logger.logError('Error getting more messages', error, { userId, clanId, page, limit });
            this.sendError(ws, 'Failed to get more messages', error.message);
        }
    }

    /**
     * Handle get message details request
     */
    async handleGetMessageDetails(ws, message, userId, clanId) {
        const { messageId } = message;

        try {
            const messageDetails = await messageService.getMessageWithDetails(messageId);

            this.sendToClient(ws, {
                type: 'message_details',
                messageId,
                details: messageDetails,
                timestamp: new Date().toISOString()
            });

            logger.logMessage(userId, clanId, 'message_details');

        } catch (error) {
            logger.logError('Error getting message details', error, {
                messageId,
                userId,
                clanId
            });
            this.sendError(ws, 'Failed to get message details');
        }
    }

    /**
     * Handle get delivery details request
     */
    async handleGetDeliveryDetails(ws, message, userId, clanId) {
        const { messageId } = message;

        try {
            const deliveryDetails = await messageService.getMessageDeliveryDetails(messageId, clanId);

            this.sendToClient(ws, {
                type: 'delivery_details',
                messageId,
                details: deliveryDetails,
                timestamp: new Date().toISOString()
            });

            logger.logMessage(userId, clanId, 'delivery_details');

        } catch (error) {
            logger.logError('Error getting delivery details', error, {
                messageId,
                userId,
                clanId
            });
            this.sendError(ws, 'Failed to get delivery details');
        }
    }

    /**
     * Handle get clan message summary request
     */
    async handleGetMessageSummary(ws, message, userId, clanId) {
        try {
            const summary = await messageService.getClanMessageSummary(clanId);

            this.sendToClient(ws, {
                type: 'message_summary',
                clanId,
                summary,
                timestamp: new Date().toISOString()
            });

            logger.logMessage(userId, clanId, 'message_summary');

        } catch (error) {
            logger.logError('Error getting message summary', error, {
                userId,
                clanId
            });
            this.sendError(ws, 'Failed to get message summary');
        }
    }

    /**
     * Check if user is clan admin
     */
    async isClanAdmin(userId, clanId) {
        // TODO: Implement proper admin check logic
        // This could check clan membership, roles, etc.
        // For now, return false as placeholder
        return false;
    }

    /**
     * Send recent messages to a client
     */
    async sendRecentMessages(ws, clanId) {
        try {
            const messages = await messageService.getRecentMessages(clanId, 20);

            if (messages.length > 0) {
                this.sendToClient(ws, {
                    type: 'recent_messages',
                    messages,
                    timestamp: new Date().toISOString()
                });
            }
        } catch (error) {
            logger.logError('Error sending recent messages', error, { clanId });
        }
    }

    /**
     * Broadcast message to all clan members
     */
    broadcastToClan(clanId, message, excludeUserIds = []) {
        let broadcastCount = 0;
        const clanConnections = this.clients.get(clanId);

        if (!clanConnections) {
            return;
        }

        // Convert excludeUserIds to array if it's a single string
        const excludeIds = Array.isArray(excludeUserIds) ? excludeUserIds : [excludeUserIds];

        for (const [userId, ws] of clanConnections) {
            // Skip excluded users
            if (excludeIds.includes(userId)) {
                continue;
            }

            try {
                if (ws.readyState === WebSocket.OPEN) {
                    this.sendToClient(ws, message);
                    broadcastCount++;
                }
            } catch (error) {
                logger.logError('Error broadcasting message to client', error, {
                    userId,
                    clanId
                });
            }
        }

        logger.logMessage('SYSTEM', clanId, 'broadcast');
    }

    /**
     * Send message to specific client
     */
    sendMessage(ws, message) {
        try {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(message));
            }
        } catch (error) {
            logger.logError('Error sending message to client', error);
        }
    }

    /**
     * Send message to specific user
     */
    sendToUser(userId, data) {
        // Find user's connection across all clans
        for (const [clanId, clanConnections] of this.clients) {
            const userConnection = clanConnections.get(userId);
            if (userConnection && userConnection.readyState === WebSocket.OPEN) {
                this.sendToClient(userConnection, data);
                break;
            }
        }
    }

    /**
     * Handle client disconnection
     */
    handleDisconnection(ws, code, reason) {
        const { userId, clanId } = ws;

        if (userId && clanId) {
            // Remove from clients map
            const clanConnections = this.clients.get(clanId);
            if (clanConnections) {
                clanConnections.delete(userId);

                // Remove empty clan entry
                if (clanConnections.size === 0) {
                    this.clients.delete(clanId);
                }
            }

            logger.logConnection(userId, clanId, 'disconnected');
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
     * Send message to specific client (alias for sendMessage)
     */
    sendToClient(ws, message) {
        this.sendMessage(ws, message);
    }

    /**
     * Send system message to clan
     */
    async sendSystemMessage(clanId, content, messageType = 'ANNOUNCEMENT') {
        try {
            // Save system message to database
            const savedMessage = await messageService.createMessage({
                content,
                userId: 'SYSTEM',
                clanId,
                messageType
            });

            // Broadcast to clan
            const broadcastMessage = {
                type: 'system',
                id: savedMessage.id,
                content: savedMessage.content,
                messageType: savedMessage.messageType,
                userId: 'SYSTEM',
                clanId,
                timestamp: savedMessage.createdAt
            };

            this.broadcastToClan(clanId, broadcastMessage);

            logger.logMessage('SYSTEM', clanId, 'broadcast');

        } catch (error) {
            logger.logError('Error sending system message', error, { clanId });
        }
    }

    /**
     * Get connection statistics
     */
    getStats() {
        const stats = {
            totalConnections: 0,
            activeConnections: 0,
            clans: new Set(),
            users: new Set()
        };

        // Count connections across all clans
        for (const [clanId, clanConnections] of this.clients) {
            stats.clans.add(clanId);

            for (const [userId, ws] of clanConnections) {
                stats.totalConnections++;
                stats.users.add(userId);

                if (ws.readyState === WebSocket.OPEN) {
                    stats.activeConnections++;
                }
            }
        }

        return {
            ...stats,
            clans: Array.from(stats.clans),
            users: Array.from(stats.users)
        };
    }

    /**
     * Close all connections
     */
    close() {
        if (this.wss) {
            this.wss.close();
        }
        this.clients.clear();
        logger.logMessage('Clan WebSocket service closed');
    }
}

module.exports = { WebSocketService };
