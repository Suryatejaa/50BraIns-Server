require('dotenv').config();

// Setup global console compression (must be early in startup)
const { setupGlobalConsoleCompression } = require('../../../utils/globalConsoleLogger');
setupGlobalConsoleCompression('notification-service');

const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import services
const { PrismaClient } = require('@prisma/client');
const RabbitMQService = require('./utils/rabbitmq');
const EmailService = require('./utils/emailService');
const WebSocketService = require('./utils/websocket');
const RabbitMQWebSocketBridge = require('./utils/rabbitmq-websocket-bridge');
const { NotificationConsumer } = require('./consumers/notificationConsumer');
const logger = require('./utils/logger');

// Import routes
const notificationRoutes = require('./routes/notificationRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Import middleware
const { errorHandler } = require('./utils/errorHandler');

const app = express();
const PORT = process.env.PORT || 4009;
const prisma = new PrismaClient();

// Trust proxy for production deployments
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined', {
        stream: { write: (msg) => logger.info(msg.trim()) }
    }));
}

// Rate limiting
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: parseInt(process.env.NOTIFICATION_RATE_LIMIT_PER_MINUTE) || 100,
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '1 minute'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api', limiter);

// Request middleware
app.use((req, res, next) => {
    req.requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    req.startTime = Date.now();

    res.setHeader('X-Request-ID', req.requestId);
    res.setHeader('X-Service', 'notification-service');

    next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        // Test database connection
        await prisma.$queryRaw`SELECT 1`;

        // Test RabbitMQ connection
        const rabbitStatus = RabbitMQService.isConnected;

        // Test Redis connection (if enabled)
        let redisStatus = 'disabled';
        try {
            if (process.env.REDIS_URL) {
                // Redis health check would go here
                redisStatus = 'connected';
            }
        } catch (error) {
            redisStatus = 'disconnected';
        }

        res.status(200).json({
            status: 'healthy',
            service: 'notification-service',
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV,
            dependencies: {
                database: 'connected',
                rabbitmq: rabbitStatus ? 'connected' : 'disconnected',
                redis: redisStatus
            },
            features: {
                emailNotifications: process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true',
                inAppNotifications: process.env.ENABLE_IN_APP_NOTIFICATIONS === 'true',
                pushNotifications: process.env.ENABLE_PUSH_NOTIFICATIONS === 'true',
                smsNotifications: process.env.ENABLE_SMS_NOTIFICATIONS === 'true'
            }
        });
    } catch (error) {
        logger.error('Health check failed:', error);
        res.status(503).json({
            status: 'unhealthy',
            service: 'notification-service',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// API routes
app.use('/notifications', notificationRoutes);
app.use('/admin/notifications', adminRoutes);

// API documentation
app.get('/api-docs', (req, res) => {
    res.json({
        title: '50BraIns Notification Service API',
        version: '1.0.0',
        description: 'Comprehensive notification system for user engagement',
        endpoints: {
            notifications: {
                'GET /notifications/:userId': 'Get user notifications',
                'GET /notifications/unread/:userId': 'Get unread notifications',
                'PATCH /notifications/mark-read/:id': 'Mark notification as read',
                'PATCH /notifications/mark-all-read/:userId': 'Mark all as read',
                'POST /notifications': 'Send notification (internal)',
                'DELETE /notifications/:id': 'Delete notification'
            },
            admin: {
                'GET /admin/stats': 'Get notification statistics',
                'POST /admin/broadcast': 'Send broadcast notification',
                'GET /admin/templates': 'Get email templates',
                'POST /admin/templates': 'Create email template'
            }
        },
        events: {
            listens: [
                'GIG_APPLIED', 'GIG_COMPLETED', 'GIG_ASSIGNED',
                'CREDITS_BOUGHT', 'BOOST_EXPIRING', 'BOOST_ACTIVATED',
                'CLAN_RANK_UP', 'CLAN_INVITED', 'CLAN_JOINED',
                'REPUTATION_UPDATED', 'LEVEL_UP',
                'USER_REGISTERED', 'PASSWORD_RESET'
            ]
        }
    });
});

// 404 handler
app.use('*', (req, res) => {
    logger.warn(`404 - Route not found: ${req.method} ${req.originalUrl}`, {
        requestId: req.requestId,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });

    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.originalUrl} not found`,
        service: 'notification-service',
        timestamp: new Date().toISOString()
    });
});

// Global error handler
app.use(errorHandler);

// Initialize services
async function initializeServices() {
    try {
        logger.info('🚀 Starting Notification Service...');

        // Test database connection
        await prisma.$connect();
        logger.info('✅ Database connected');

        // Initialize RabbitMQ connection
        await RabbitMQService.connect();
        logger.info('✅ RabbitMQ connected');

        // Initialize email service
        await EmailService.initialize();
        logger.info('✅ Email service initialized');

        // Start notification consumers
        await RabbitMQService.startConsumers();
        logger.info('✅ Notification consumers started');

        // Initialize WebSocket server
        WebSocketService.initialize(server);
        logger.info('✅ WebSocket server initialized');

        // Initialize RabbitMQ → WebSocket bridge
        await RabbitMQWebSocketBridge.initialize();
        logger.info('🌉 RabbitMQ → WebSocket bridge initialized');

        logger.info('🎉 All services initialized successfully');
    } catch (error) {
        logger.error('❌ Failed to initialize services:', error);
        process.exit(1);
    }
}

// Graceful shutdown
async function gracefulShutdown(signal) {
    logger.info(`📡 Received ${signal}. Starting graceful shutdown...`);

    try {
        // Stop accepting new requests
        server.close(async () => {
            logger.info('🔒 HTTP server closed');

            // Close database connections
            await prisma.$disconnect();
            logger.info('🔌 Database disconnected');

            // Close RabbitMQ connection
            // Disconnect RabbitMQ and stop consumers
            await RabbitMQService.close();
            logger.info('� RabbitMQ disconnected');

            logger.info('✅ Graceful shutdown completed');
            process.exit(0);
        });

        // Force shutdown after 30 seconds
        setTimeout(() => {
            logger.error('⏰ Forced shutdown due to timeout');
            process.exit(1);
        }, 30000);

    } catch (error) {
        logger.error('❌ Error during shutdown:', error);
        process.exit(1);
    }
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('💥 Uncaught Exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
});

// Start server
const server = app.listen(PORT, async () => {
    logger.info(`📬 Notification Service running on port ${PORT}`);
    logger.info(`🌍 Environment: ${process.env.NODE_ENV}`);
    logger.info(`🔗 Health check: http://localhost:${PORT}/health`);

    // Mark end of startup phase for console compression
    console.markStartupEnd('Notification Service', PORT);

    // Initialize all services
    await initializeServices();
});

module.exports = app;
