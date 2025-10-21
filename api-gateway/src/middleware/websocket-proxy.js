const WebSocket = require('ws');
const http = require('http');
const url = require('url');
const logger = require('../utils/logger');
const config = require('../config');

class WebSocketProxy {
    constructor() {
        this.wss = null;
        this.clients = new Map(); // Map to store client connections
    }

    // Initialize WebSocket server
    initialize(server) {
        this.wss = new WebSocket.Server({
            noServer: true,
            clientTracking: true
        });

        // Handle WebSocket upgrade requests
        server.on('upgrade', (request, socket, head) => {
            const pathname = url.parse(request.url).pathname;

            // Check if this is a notification WebSocket request
            if (pathname === '/api/notifications/ws') {
                logger.info('🔌 WebSocket upgrade request for notifications', {
                    path: pathname,
                    headers: request.headers
                });

                this.handleNotificationWebSocket(request, socket, head);
            } else if (pathname === '/api/clans/ws') {
                // Check if this is a clan WebSocket request
                logger.info('🏛️ WebSocket upgrade request for clans', {
                    path: pathname,
                    headers: request.headers
                });

                this.handleClanWebSocket(request, socket, head);
            } else {
                // Reject other WebSocket requests
                logger.warn('❌ WebSocket upgrade rejected - unknown path', { path: pathname });
                socket.destroy();
            }
        });

        // Handle WebSocket connections
        this.wss.on('connection', (ws, request) => {
            this.handleConnection(ws, request);
        });

        logger.info('✅ WebSocket proxy initialized');
    }

    // Handle notification WebSocket connections
    async handleNotificationWebSocket(request, socket, head) {
        try {
            // Parse query parameters
            const parsedUrl = url.parse(request.url, true);
            const userId = parsedUrl.query.userId;

            if (!userId) {
                logger.warn('❌ WebSocket connection rejected - missing userId');
                socket.destroy();
                return;
            }

            // Check if notification service is available
            const notificationServiceUrl = config.services.notification.url.replace('http', 'ws');
            const wsUrl = `${notificationServiceUrl}/ws?userId=${userId}`;

            logger.info('🔗 Attempting to connect to notification service', {
                userId,
                targetUrl: wsUrl
            });

            // Create WebSocket connection to notification service with timeout
            const notificationWs = new WebSocket(wsUrl);
            let connectionTimeout;

            // Set connection timeout
            connectionTimeout = setTimeout(() => {
                logger.warn('⚠️ Notification service connection timeout, using fallback mode', { userId });
                notificationWs.terminate();
                this.handleFallbackConnection(request, socket, head, userId);
            }, 5000); // 5 second timeout

            // Handle connection to notification service
            notificationWs.on('open', () => {
                clearTimeout(connectionTimeout);
                logger.info('✅ Connected to notification service WebSocket', { userId });

                // Accept the client connection
                this.wss.handleUpgrade(request, socket, head, (ws) => {
                    // Store the proxy connection immediately when client connects
                    this.clients.set(userId, {
                        clientWs: ws,
                        serviceWs: notificationWs,
                        userId,
                        isFallback: false
                    });

                    this.wss.emit('connection', ws, request);
                });
            });

            notificationWs.on('message', (data) => {
                // Forward messages from notification service to client
                const clientData = this.clients.get(userId);
                if (clientData && clientData.clientWs && clientData.clientWs.readyState === WebSocket.OPEN) {
                    try {
                        // Ensure data is sent as text, not binary
                        const messageToSend = data instanceof Buffer ? data.toString() : data;
                        clientData.clientWs.send(messageToSend);
                        logger.debug('📤 Forwarded message from service to client', { userId, messageType: typeof messageToSend });
                    } catch (error) {
                        logger.error('❌ Error forwarding message to client', { userId, error: error.message });
                    }
                } else {
                    logger.warn('⚠️ Cannot forward message - client WebSocket not available', { userId });
                }
            });

            notificationWs.on('close', (code, reason) => {
                logger.info('🔌 Notification service WebSocket closed', { userId, code, reason });
                const clientData = this.clients.get(userId);
                if (clientData && clientData.clientWs && clientData.clientWs.readyState === WebSocket.OPEN) {
                    try {
                        // Only close with valid code, let WebSocket handle the reason
                        if (typeof code === 'number' && code >= 1000 && code <= 4999) {
                            clientData.clientWs.close(code);
                        } else {
                            clientData.clientWs.close(1000); // Use normal closure code
                        }
                    } catch (error) {
                        logger.error('❌ Error closing client WebSocket', { userId, error: error.message });
                    }
                }
                this.clients.delete(userId);
            });

            notificationWs.on('error', (error) => {
                clearTimeout(connectionTimeout);
                logger.warn('⚠️ Notification service WebSocket error, using fallback mode', {
                    userId,
                    error: error.message
                });
                // Use fallback instead of destroying the socket
                this.handleFallbackConnection(request, socket, head, userId);
            });

        } catch (error) {
            logger.error('❌ Error handling WebSocket upgrade', { error: error.message });
            socket.destroy();
        }
    }

    // Handle fallback connection when notification service is unavailable
    handleFallbackConnection(request, socket, head, userId) {
        logger.info('🔄 Setting up fallback WebSocket connection', { userId });

        // Accept the client connection in fallback mode
        this.wss.handleUpgrade(request, socket, head, (ws) => {
            // Store the fallback connection
            this.clients.set(userId, {
                clientWs: ws,
                serviceWs: null,
                userId,
                isFallback: true
            });

            this.wss.emit('connection', ws, request);
        });
    }

    // Handle clan WebSocket connections
    async handleClanWebSocket(request, socket, head) {
        try {
            // Parse query parameters
            const parsedUrl = url.parse(request.url, true);
            const userId = parsedUrl.query.userId;
            const clanId = parsedUrl.query.clanId;

            if (!userId) {
                logger.warn('❌ Clan WebSocket connection rejected - missing userId');
                socket.destroy();
                return;
            }

            if (!clanId) {
                logger.warn('❌ Clan WebSocket connection rejected - missing clanId');
                socket.destroy();
                return;
            }

            // Check if clan service is available
            const clanServiceUrl = config.services.clan?.url || 'http://localhost:4003';
            const wsUrl = `${clanServiceUrl.replace('http', 'ws')}/ws?userId=${userId}&clanId=${clanId}`;

            logger.info('🔗 Attempting to connect to clan service', {
                userId,
                clanId,
                targetUrl: wsUrl
            });

            // Create WebSocket connection to clan service with timeout
            const clanWs = new WebSocket(wsUrl);
            let connectionTimeout;

            // Set connection timeout
            connectionTimeout = setTimeout(() => {
                logger.warn('⚠️ Clan service connection timeout, using fallback mode', { userId, clanId });
                clanWs.terminate();
                this.handleClanFallbackConnection(request, socket, head, userId, clanId);
            }, 5000); // 5 second timeout

            // Handle connection to clan service
            clanWs.on('open', () => {
                clearTimeout(connectionTimeout);
                logger.info('✅ Connected to clan service WebSocket', { userId, clanId });

                // Accept the client connection
                this.wss.handleUpgrade(request, socket, head, (ws) => {
                    // Store the proxy connection immediately when client connects
                    const connectionKey = `clan_${userId}_${clanId}`;
                    this.clients.set(connectionKey, {
                        clientWs: ws,
                        serviceWs: clanWs,
                        userId,
                        clanId,
                        connectionType: 'clan',
                        isFallback: false
                    });

                    this.wss.emit('connection', ws, request);
                });
            });

            clanWs.on('message', (data) => {
                // Forward messages from clan service to client
                const connectionKey = `clan_${userId}_${clanId}`;
                const clientData = this.clients.get(connectionKey);
                if (clientData && clientData.clientWs && clientData.clientWs.readyState === WebSocket.OPEN) {
                    try {
                        // Ensure data is sent as text, not binary
                        const messageToSend = data instanceof Buffer ? data.toString() : data;
                        clientData.clientWs.send(messageToSend);
                        logger.debug('📤 Forwarded clan message from service to client', { userId, clanId, messageType: typeof messageToSend });
                    } catch (error) {
                        logger.error('❌ Error forwarding clan message to client', { userId, clanId, error: error.message });
                    }
                } else {
                    logger.warn('⚠️ Cannot forward clan message - client WebSocket not available', { userId, clanId });
                }
            });

            clanWs.on('close', (code, reason) => {
                logger.info('🔌 Clan service WebSocket closed', { userId, clanId, code, reason });
                const connectionKey = `clan_${userId}_${clanId}`;
                const clientData = this.clients.get(connectionKey);
                if (clientData && clientData.clientWs && clientData.clientWs.readyState === WebSocket.OPEN) {
                    try {
                        // Only close with valid code, let WebSocket handle the reason
                        if (typeof code === 'number' && code >= 1000 && code <= 4999) {
                            clientData.clientWs.close(code);
                        } else {
                            clientData.clientWs.close(1000); // Use normal closure code
                        }
                    } catch (error) {
                        logger.error('❌ Error closing clan client WebSocket', { userId, clanId, error: error.message });
                    }
                }
                this.clients.delete(connectionKey);
            });

            clanWs.on('error', (error) => {
                clearTimeout(connectionTimeout);
                logger.warn('⚠️ Clan service WebSocket error, using fallback mode', {
                    userId,
                    clanId,
                    error: error.message
                });
                // Use fallback instead of destroying the socket
                this.handleClanFallbackConnection(request, socket, head, userId, clanId);
            });

        } catch (error) {
            logger.error('❌ Error handling clan WebSocket upgrade', { error: error.message });
            socket.destroy();
        }
    }

    // Handle fallback connection when clan service is unavailable
    handleClanFallbackConnection(request, socket, head, userId, clanId) {
        logger.info('🔄 Setting up fallback clan WebSocket connection', { userId, clanId });

        // Accept the client connection in fallback mode
        this.wss.handleUpgrade(request, socket, head, (ws) => {
            // Store the fallback connection
            const connectionKey = `clan_${userId}_${clanId}`;
            this.clients.set(connectionKey, {
                clientWs: ws,
                serviceWs: null,
                userId,
                clanId,
                connectionType: 'clan',
                isFallback: true
            });

            this.wss.emit('connection', ws, request);
        });
    }

    // Handle client WebSocket connections
    handleConnection(ws, request) {
        const parsedUrl = url.parse(request.url, true);
        const userId = parsedUrl.query.userId;
        const clanId = parsedUrl.query.clanId;

        // Determine connection type
        const isClanConnection = request.url.includes('/api/clans/ws');
        const connectionType = isClanConnection ? 'clan' : 'notification';

        logger.info(`👤 Client WebSocket connected (${connectionType})`, { userId, clanId });

        // Get the stored client data (should already exist from handleUpgrade)
        const connectionKey = isClanConnection ? `clan_${userId}_${clanId}` : userId;
        const clientData = this.clients.get(connectionKey);

        if (!clientData) {
            logger.error(`❌ No client data found for ${connectionType} connection`, { userId, clanId });
            ws.close(1011, 'Internal server error');
            return;
        }

        // Handle messages from client to service
        ws.on('message', (data) => {
            if (clientData) {
                if (clientData.isFallback) {
                    // In fallback mode, just log the message
                    logger.debug(`📝 Message received in fallback mode (not forwarded) - ${connectionType}`, { userId, clanId, messageType: typeof data });
                } else if (clientData.serviceWs && clientData.serviceWs.readyState === WebSocket.OPEN) {
                    try {
                        // Parse and validate message before forwarding
                        let messageToSend = data;
                        if (data instanceof Buffer) {
                            messageToSend = data.toString();
                        }

                        // Log message details for debugging
                        try {
                            const parsedMessage = JSON.parse(messageToSend);
                            logger.debug(`📤 Forwarding ${connectionType} message`, {
                                userId,
                                clanId,
                                messageType: parsedMessage.type,
                                hasContent: !!parsedMessage.content,
                                hasClanId: !!parsedMessage.clanId
                            });
                        } catch (parseError) {
                            logger.warn(`⚠️ Non-JSON message received`, { userId, clanId, data: messageToSend });
                        }

                        clientData.serviceWs.send(messageToSend);
                        logger.debug(`📤 Forwarded message from client to ${connectionType} service`, { userId, clanId, messageType: typeof messageToSend });
                    } catch (error) {
                        logger.error(`❌ Error forwarding message to ${connectionType} service`, { userId, clanId, error: error.message });
                    }
                } else {
                    logger.warn(`⚠️ Cannot forward message - ${connectionType} service WebSocket not available`, { userId, clanId });
                }
            }
        });

        // Handle client disconnection
        ws.on('close', (code, reason) => {
            logger.info(`👤 Client WebSocket disconnected (${connectionType})`, { userId, clanId, code, reason });
            if (clientData) {
                if (!clientData.isFallback && clientData.serviceWs && clientData.serviceWs.readyState === WebSocket.OPEN) {
                    try {
                        // Only close with valid code, let WebSocket handle the reason
                        if (typeof code === 'number' && code >= 1000 && code <= 4999) {
                            clientData.serviceWs.close(code);
                        } else {
                            clientData.serviceWs.close();
                        }
                    } catch (error) {
                        logger.error(`❌ Error closing ${connectionType} service WebSocket`, { userId, clanId, error: error.message });
                    }
                }
                this.clients.delete(connectionKey);
            }
        });

        ws.on('error', (error) => {
            logger.error(`❌ Client WebSocket error (${connectionType})`, { userId, clanId, error: error.message });
        });

        // Send connection confirmation with appropriate data
        try {
            if (ws.readyState === WebSocket.OPEN) {
                if (isClanConnection) {
                    // Send clan connection confirmation
                    const message = {
                        type: 'connection',
                        title: '🔌 Connected',
                        message: clientData && clientData.isFallback
                            ? 'Connected to API Gateway (Clan service unavailable - using fallback mode)'
                            : 'Connected to clan service via API Gateway',
                        userId,
                        clanId,
                        connectionType: 'clan',
                        fallbackMode: clientData ? clientData.isFallback : false,
                        timestamp: new Date().toISOString()
                    };

                    const messageString = JSON.stringify(message);
                    logger.debug('📤 Sending clan connection confirmation', { userId, clanId, message: messageString });
                    ws.send(messageString);
                } else {
                    // Send notification connection confirmation (existing logic)
                    const fetchNotificationCount = async () => {
                        try {
                            const response = await fetch(`${config.services.notification.url}/notifications/count/${userId}`);
                            const data = await response.json();
                            return data.data || { total: 0, unread: 0 };
                        } catch (error) {
                            logger.error('❌ Error fetching notification count', { userId, error: error.message });
                            return { total: 0, unread: 0 };
                        }
                    };

                    fetchNotificationCount().then(counts => {
                        const message = {
                            type: 'connection',
                            title: '🔌 Connected',
                            message: clientData && clientData.isFallback
                                ? 'Connected to API Gateway (Notification service unavailable - using fallback mode)'
                                : 'Connected to notification service via API Gateway',
                            userId,
                            fallbackMode: clientData ? clientData.isFallback : false,
                            notificationCounts: counts
                        };

                        const messageString = JSON.stringify(message);
                        logger.debug('📤 Sending notification connection confirmation', { userId, message: messageString });
                        ws.send(messageString);
                    });
                }
            }
        } catch (error) {
            logger.error(`❌ Error sending ${connectionType} connection confirmation`, { userId, clanId, error: error.message });
        }
    }

    // Get connection statistics
    getStats() {
        return {
            totalConnections: this.clients.size,
            connectedUsers: Array.from(this.clients.keys())
        };
    }

    // Close all connections
    close() {
        if (this.wss) {
            this.wss.close();
        }
        this.clients.clear();
        logger.info('🔌 WebSocket proxy closed');
    }
}

module.exports = new WebSocketProxy(); 