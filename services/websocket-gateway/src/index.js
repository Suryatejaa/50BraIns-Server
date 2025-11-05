/**
 * WebSocket Gateway Service
 * Unified WebSocket handling for notifications, chat, and future services
 * Port: 4000
 */

// Load environment variables from .env file
require('dotenv').config();

// Setup global console compression (must be early in startup)
const { setupGlobalConsoleCompression } = require('../src/utils/globalConsoleLogger');
setupGlobalConsoleCompression('websocket-gateway');

const express = require('express');
const http = require('http');
const cors = require('cors');
const { WebSocketGateway } = require('./services/websocket.gateway');
const { HealthController } = require('./controllers/health.controller');
const logger = require('./utils/logger');

class WebSocketGatewayService {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.wsGateway = new WebSocketGateway();
        this.port = process.env.PORT || 4000;

        this.setupMiddleware();
        this.setupRoutes();
        this.setupGracefulShutdown();
        // Don't initialize WebSocket here - wait for server to start
    }

    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
    }

    setupRoutes() {
        // Health check endpoints
        this.app.get('/health', HealthController.getHealth);
        this.app.get('/health/websocket', HealthController.getWebSocketHealth);
        this.app.get('/health/rabbitmq', HealthController.getRabbitMQHealth);

        // API endpoint for sending notifications
        this.app.post('/api/send-notification', (req, res) => {
            try {
                const { userId, eventType, data } = req.body;

                if (!userId || !eventType || !data) {
                    return res.status(400).json({
                        success: false,
                        error: 'userId, eventType, and data are required'
                    });
                }

                // Send notification via WebSocket Gateway
                if (this.wsGateway) {
                    this.wsGateway.sendToUser(userId, eventType, data);
                    res.json({
                        success: true,
                        message: 'Notification sent successfully'
                    });
                } else {
                    res.status(503).json({
                        success: false,
                        error: 'WebSocket Gateway not available'
                    });
                }
            } catch (error) {
                console.error('Error sending notification:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to send notification'
                });
            }
        });

        // Root endpoint
        this.app.get('/', (req, res) => {
            res.json({
                service: 'WebSocket Gateway',
                status: 'running',
                port: this.port,
                endpoints: {
                    websocket: `ws://localhost:${this.port}/ws`,
                    health: `http://localhost:${this.port}/health`,
                    websocketHealth: `http://localhost:${this.port}/health/websocket`,
                    sendNotification: `http://localhost:${this.port}/api/send-notification`
                }
            });
        });
    }

    async initializeWebSocket() {
        // Prevent re-initialization
        if (this.app.locals.wsGateway) {
            logger.logWarn('WebSocket Gateway already initialized, skipping');
            return;
        }

        this.wsGateway.initialize(this.server);

        // Store WebSocket Gateway instance in app.locals for health controller access
        this.app.locals.wsGateway = this.wsGateway;

        // Initialize RabbitMQ connection with proper error handling
        try {
            await this.wsGateway.rabbitmqService.connect();
            logger.logConnection('RabbitMQ connection established successfully');

            // Initialize all services after RabbitMQ connection is ready
            await this.wsGateway.notificationService.initialize();
            await this.wsGateway.gigChatService.initialize();
            logger.logConnection('All WebSocket services initialized successfully');

        } catch (error) {
            logger.logError('Failed to initialize WebSocket services', { error: error.message });
            // Don't exit - let the service run and retry later
        }
    }

    async start() {
        // Start the server first
        this.server.listen(this.port, () => {
            logger.logConnection('WebSocket Gateway Service started', {
                port: this.port,
                timestamp: new Date().toISOString()
            });

            console.log('🚀 WebSocket Gateway Service Started!');
            console.log(`📍 Port: ${this.port}`);
            console.log(`🔌 WebSocket: ws://localhost:${this.port}/ws`);
            console.log(`🌐 HTTP: http://localhost:${this.port}`);
            console.log(`📊 Health: http://localhost:${this.port}/health`);

            // Mark end of startup phase for console compression
            console.markStartupEnd('WebSocket Gateway', this.port);
        });

        // Initialize WebSocket and RabbitMQ AFTER server starts
        await this.initializeWebSocket();
    }

    // Graceful shutdown
    setupGracefulShutdown() {
        process.on('SIGINT', () => {
            logger.logConnection('Shutting down WebSocket Gateway Service');
            this.wsGateway.close();
            this.server.close(() => {
                console.log('✅ WebSocket Gateway Service stopped');
                process.exit(0);
            });
        });
    }
}

// Start the service
const service = new WebSocketGatewayService();
service.start().catch(error => {
    logger.logError('Failed to start WebSocket Gateway Service', { error: error.message });
    process.exit(1);
});
