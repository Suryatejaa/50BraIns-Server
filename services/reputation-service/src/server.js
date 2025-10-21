const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const { PrismaClient } = require('@prisma/client');

// Import services
const EventProcessor = require('./services/eventProcessor');
const LeaderboardService = require('./services/leaderboardService');
const ScoringEngine = require('./services/scoringEngine');

// Import routes
const reputationRoutes = require('./routes/reputation');

// Initialize services
const prisma = new PrismaClient();
const eventProcessor = new EventProcessor();
const leaderboardService = new LeaderboardService();
const scoringEngine = new ScoringEngine();

// Configure logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

const app = express();
const PORT = process.env.PORT || 4006;

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.'
    }
});
app.use('/api', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
    });
    next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        // Check database connection
        await prisma.$queryRaw`SELECT 1`;

        // Check RabbitMQ connection
        const mqStatus = eventProcessor.isConnected ? 'connected' : 'disconnected';

        res.json({
            success: true,
            service: 'reputation-service',
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version || '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            connections: {
                database: 'connected',
                rabbitmq: mqStatus
            },
            uptime: process.uptime()
        });
    } catch (error) {
        logger.error('Health check failed:', error);
        res.status(503).json({
            success: false,
            service: 'reputation-service',
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

// API routes - Gateway strips /api/reputation prefix, so mount at root
app.use('/', reputationRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        success: true,
        service: 'Reputation Service',
        message: 'Welcome to 50BraIns Reputation Service - The Heart of the Ecosystem',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        endpoints: {
            health: '/health',
            reputation: '/api/reputation/:userId',
            leaderboard: '/api/reputation/leaderboard/:type',
            statistics: '/api/reputation/stats/overview',
            badges: '/api/reputation/badges/available'
        },
        features: [
            'Real-time reputation scoring',
            'Multi-tier ranking system',
            'Comprehensive leaderboards',
            'Achievement badges',
            'Score history tracking',
            'Event-driven updates',
            'Clan reputation management',
            'Performance analytics'
        ]
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);

    // Prisma error handling
    if (err.code === 'P2002') {
        return res.status(400).json({
            success: false,
            message: 'Duplicate record conflict',
            error: 'A record with this information already exists'
        });
    }

    if (err.code && err.code.startsWith('P')) {
        return res.status(400).json({
            success: false,
            message: 'Database operation failed',
            error: err.message
        });
    }

    // Validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            error: err.message
        });
    }

    // Default error response
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found',
        path: req.path,
        method: req.method
    });
});

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);

    try {
        // Close database connections
        await prisma.$disconnect();
        logger.info('Database disconnected');

        // Close RabbitMQ connection
        await eventProcessor.disconnect();
        logger.info('RabbitMQ disconnected');

        // Close database connections
        await leaderboardService.disconnect();
        logger.info('Database connections closed');

        logger.info('Graceful shutdown completed');
        process.exit(0);
    } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
    }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection');
});

// Start the server
async function startServer() {
    try {
        // Connect to external services
        logger.info('🚀 Starting Reputation Service...');

        // Connect to RabbitMQ
        await eventProcessor.connect();
        logger.info('✅ Event processor connected');

        // Start cron jobs for periodic tasks
        if (process.env.ENABLE_CRON_JOBS === 'true') {
            const cron = require('node-cron');

            // Warm up leaderboards every 10 minutes
            cron.schedule('*/10 * * * *', async () => {
                try {
                    await leaderboardService.warmupLeaderboards();
                    logger.info('📊 Leaderboards warmed up');
                } catch (error) {
                    logger.error('❌ Failed to warm up leaderboards:', error);
                }
            });

            // Apply score decay daily at midnight
            cron.schedule('0 0 * * *', async () => {
                try {
                    await scoringEngine.applyScoreDecay();
                    logger.info('🍂 Score decay applied');
                } catch (error) {
                    logger.error('❌ Failed to apply score decay:', error);
                }
            });

            logger.info('⏰ Cron jobs scheduled');
        }

        app.listen(PORT, () => {
            logger.info(`🎯 Reputation Service running on port ${PORT}`);
            logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
            logger.info(`💎 Service URL: http://localhost:${PORT}`);
            logger.info('📈 Ready to process reputation events!');
        });

    } catch (error) {
        logger.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server
startServer();

module.exports = app;
