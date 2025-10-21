/**
 * WebSocket Gateway Service
 * Unified WebSocket handling for notifications, chat, and future services
 * Port: 4000
 */

// Load environment variables from .env file
require('dotenv').config();

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

        // Root endpoint
        this.app.get('/', (req, res) => {
            res.json({
                service: 'WebSocket Gateway',
                status: 'running',
                port: this.port,
                endpoints: {
                    websocket: `ws://localhost:${this.port}/ws`,
                    health: `http://localhost:${this.port}/health`,
                    websocketHealth: `http://localhost:${this.port}/health/websocket`
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
        } catch (error) {
            logger.logError('Failed to establish RabbitMQ connection', { error: error.message });
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
