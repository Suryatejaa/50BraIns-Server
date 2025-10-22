const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('.prisma/work-history-client/client');


// Import services and utilities
const RabbitMQService = require('./services/rabbitmq.service');
const RedisService = require('./services/redis.service');
const WorkHistoryService = require('./services/workHistory.service');
const ReputationIntegrationService = require('./services/reputationIntegration.service');
const Logger = require('./utils/logger');

// Import routes
const workHistoryRoutes = require('./routes/workHistory.routes');
const portfolioRoutes = require('./routes/portfolio.routes');
const achievementRoutes = require('./routes/achievement.routes');
const summaryRoutes = require('./routes/summary.routes');

// Initialize app
const app = express();
const PORT = process.env.PORT || 4007;

// Initialize Prisma client
const prisma = new PrismaClient();

// Trust proxy for proper IP detection (needed for rate limiting)
app.set('trust proxy', 1);

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Global middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(limiter);

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        // Check database connection
        await prisma.$queryRaw`SELECT 1`;

        // Check Redis connection
        const redisHealth = await RedisService.ping();

        // Check RabbitMQ connection
        const rabbitmqHealth = RabbitMQService.isConnected();

        res.status(200).json({
            status: 'healthy',
            service: 'work-history-service',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            checks: {
                database: 'connected',
                redis: redisHealth ? 'connected' : 'disconnected',
                rabbitmq: rabbitmqHealth ? 'connected' : 'disconnected'
            }
        });
    } catch (error) {
        Logger.error('Health check failed:', error);
        res.status(503).json({
            status: 'unhealthy',
            service: 'work-history-service',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

// API routes - Gateway handles the /api prefix mapping
app.use('/work-history', workHistoryRoutes);
app.use('/portfolio', portfolioRoutes);
app.use('/achievements', achievementRoutes);
app.use('/summary', summaryRoutes);

app.use('/', (req, res) => {
    res.status(200).json({
        service: 'Work History Service',
        version: '1.0.0',
        description: 'Source of truth for creator achievements and portfolio tracking',
        timestamp: new Date().toISOString(),
        endpoints: {
            health: '/health',
            workHistory: '/work-history',
            portfolio: '/portfolio',
            achievements: '/achievements',
            summary: '/summary'
        }
    });
});
// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.originalUrl
    });
});

// Global error handler
app.use((error, req, res, next) => {
    Logger.error('Unhandled error:', error);

    res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
    Logger.info(`Received ${signal}. Starting graceful shutdown...`);

    try {
        // Close RabbitMQ connection
        await RabbitMQService.disconnect();
        Logger.info('RabbitMQ connection closed');

        // Close Redis connection
        await RedisService.disconnect();
        Logger.info('Redis connection closed');

        // Close Prisma connection
        await prisma.$disconnect();
        Logger.info('Database connection closed');

        process.exit(0);
    } catch (error) {
        Logger.error('Error during graceful shutdown:', error);
        process.exit(1);
    }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const startServer = async () => {
    try {
        // Initialize Redis connection
        await RedisService.connect();
        Logger.info('Redis connected successfully');

        // Initialize RabbitMQ connection and consumers
        await RabbitMQService.connect();
        Logger.info('RabbitMQ connected successfully');

        // Setup event consumers
        await RabbitMQService.setupConsumers();
        Logger.info('RabbitMQ consumers setup successfully');

        // Test database connection
        await prisma.$connect();
        Logger.info('Database connected successfully');

        // Start HTTP server
        app.listen(PORT, () => {
            Logger.info(`🔨 Work History Service running on port ${PORT}`);
            Logger.info(`📊 Source of truth for creator achievements and portfolio tracking`);
            Logger.info(`🌐 Health check: http://localhost:${PORT}/health`);
        });

    } catch (error) {
        Logger.error('Failed to start Work History Service:', error);
        process.exit(1);
    }
};

// Start the server
startServer();

module.exports = app;
