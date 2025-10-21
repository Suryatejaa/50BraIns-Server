const WebSocket = require('ws');
const logger = require('./logger');

class WebSocketService {
    constructor() {
        this.wss = null;
        this.clients = new Map(); // userId -> WebSocket connection
        this.isInitialized = false;
    }

    initialize(server) {
        try {
            // Create WebSocket server on the /ws path
            this.wss = new WebSocket.Server({
                server,
                path: '/ws'
            });
            this.isInitialized = true;

            this.wss.on('connection', (ws, req) => {
                this.handleConnection(ws, req);
            });

            logger.info('✅ WebSocket server initialized on /ws path');
        } catch (error) {
            logger.error('❌ Failed to initialize WebSocket server:', error);
        }
    }

    handleConnection(ws, req) {
        try {
            // Extract userId from query parameters or headers
            const url = new URL(req.url, `http://${req.headers.host}`);
            const userId = url.searchParams.get('userId');

            if (!userId) {
                logger.warn('WebSocket connection without userId');
                ws.close(1008, 'userId required');
                return;
            }

            // Store the connection
            this.clients.set(userId, ws);

            logger.info(`🔌 WebSocket connected for user: ${userId}`);

            // Send connection confirmation
            ws.send(JSON.stringify({
                type: 'connection',
                title: '🔌 Connected',
                message: 'Connected to notification service',
                timestamp: new Date().toISOString()
            }));

            // Handle client disconnect
            ws.on('close', () => {
                this.clients.delete(userId);
                logger.info(`🔌 WebSocket disconnected for user: ${userId}`);
            });

            // Handle client messages (for ping/pong)
            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message);
                    if (data.type === 'ping') {
                        ws.send(JSON.stringify({
                            type: 'pong',
                            timestamp: new Date().toISOString()
                        }));
                    }
                } catch (error) {
                    logger.error('Error handling WebSocket message:', error);
                }
            });

            // Handle errors
            ws.on('error', (error) => {
                logger.error(`WebSocket error for user ${userId}:`, error);
                this.clients.delete(userId);
            });

        } catch (error) {
            logger.error('Error handling WebSocket connection:', error);
            ws.close(1011, 'Internal server error');
        }
    }

    sendNotification(userId, notification) {
        try {
            if (!this.isInitialized) {
                logger.warn('WebSocket service not initialized');
                return false;
            }

            const ws = this.clients.get(userId);
            if (!ws || ws.readyState !== WebSocket.OPEN) {
                logger.debug(`User ${userId} not connected via WebSocket`);
                return false;
            }

            const message = {
                type: 'notification',
                data: notification,
                timestamp: new Date().toISOString()
            };

            ws.send(JSON.stringify(message));
            logger.info(`📤 Real-time notification sent to user: ${userId}`);
            return true;

        } catch (error) {
            logger.error(`Error sending real-time notification to user ${userId}:`, error);
            return false;
        }
    }

    broadcastNotification(notification, userIds = []) {
        try {
            if (!this.isInitialized) {
                logger.warn('WebSocket service not initialized');
                return;
            }

            const message = {
                type: 'notification',
                data: notification,
                timestamp: new Date().toISOString()
            };

            let sentCount = 0;
            const messageStr = JSON.stringify(message);

            if (userIds.length === 0) {
                // Broadcast to all connected clients
                this.clients.forEach((ws, userId) => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(messageStr);
                        sentCount++;
                    }
                });
            } else {
                // Send to specific users
                userIds.forEach(userId => {
                    const ws = this.clients.get(userId);
                    if (ws && ws.readyState === WebSocket.OPEN) {
                        ws.send(messageStr);
                        sentCount++;
                    }
                });
            }

            logger.info(`📤 Broadcast notification sent to ${sentCount} users`);
            return sentCount;

        } catch (error) {
            logger.error('Error broadcasting notification:', error);
            return 0;
        }
    }

    getConnectedUsers() {
        return Array.from(this.clients.keys());
    }

    getConnectionCount() {
        return this.clients.size;
    }

    disconnectUser(userId) {
        const ws = this.clients.get(userId);
        if (ws) {
            ws.close(1000, 'User disconnected');
            this.clients.delete(userId);
            logger.info(`🔌 User ${userId} disconnected`);
        }
    }
}

module.exports = new WebSocketService(); 