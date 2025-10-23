const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');

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

// Initialize app and middleware (synchronous setup - OK at top level)
const app = express();
const PORT = process.env.PORT || 4007;
const prisma = new PrismaClient();

// Trust proxy configuration - more specific for Railway
app.set('trust proxy', 1); // Trust first proxy (Railway's load balancer)

// Middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(morgan('combined'));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting with proper proxy handling
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting for health checks and internal requests
    skip: (req) => {
        return req.path === '/health' ||
            req.headers['x-forwarded-for']?.includes('railway.internal');
    }
});
app.use(limiter);

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        // Check database connection
        await prisma.$queryRaw`SELECT 1`;

        // Check RabbitMQ connection
        const rabbitmqHealth = RabbitMQService.isConnected();

        res.status(200).json({
            status: 'healthy',
            service: 'work-history-service',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            checks: {
                database: 'connected',
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

// Routes
app.use('/work-history', workHistoryRoutes);
app.use('/portfolio', portfolioRoutes);
app.use('/achievements', achievementRoutes);
app.use('/summary', summaryRoutes);

// Root endpoint with service information
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

// Error handling
app.use((err, req, res, next) => {
    Logger.error('Unhandled error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ✅ START SERVER FUNCTION - ALL ASYNC CODE HERE
const startServer = async () => {
    try {
        console.log('🚀 ========================================');
        console.log('🚀 Starting Work History Service...');
        console.log('🚀 Time:', new Date().toISOString());
        console.log('🚀 Port:', PORT);
        console.log('🚀 Environment:', process.env.NODE_ENV);
        console.log('🚀 ========================================');

        // Initialize RabbitMQ (OPTIONAL - Inside startServer)
        try {
            console.log('📡 Connecting to RabbitMQ...');
            Logger.info('Attempting to connect to RabbitMQ:', process.env.RABBITMQ_URL?.replace(/:[^:@]+@/, ':***@'));

            const rabbitmqConnection = await RabbitMQService.connect();

            if (rabbitmqConnection) {
                console.log('✅ RabbitMQ connected');
                Logger.info('RabbitMQ connected successfully');

                // Setup consumers
                console.log('📡 Setting up RabbitMQ consumers...');
                await RabbitMQService.setupConsumers();
                console.log('✅ RabbitMQ consumers ready');
                Logger.info('RabbitMQ consumers setup successfully');
            } else {
                console.warn('⚠️ RabbitMQ connection returned false');
                Logger.warn('RabbitMQ connection failed');
            }
        } catch (rabbitmqError) {
            console.warn('⚠️ ========================================');
            console.warn('⚠️ RabbitMQ setup failed (service will continue)');
            console.warn('⚠️ Error:', rabbitmqError.message);
            console.warn('⚠️ ========================================');
            Logger.warn('RabbitMQ initialization failed:', rabbitmqError);
        }

        // Initialize database (REQUIRED - Inside startServer)
        console.log('💾 Testing database connection...');
        await prisma.$connect();
        await prisma.$queryRaw`SELECT 1 as test`;
        console.log('✅ Database connected and tested');
        Logger.info('Database connected successfully');

        // Start HTTP server
        console.log(`🚀 Starting HTTP server on 0.0.0.0:${PORT}...`);

        app.listen(PORT, '0.0.0.0', () => {
            console.log('✅ ========================================');
            console.log(`✅ Work History Service RUNNING`);
            console.log(`✅ Port: ${PORT}`);
            console.log(`✅ Environment: ${process.env.NODE_ENV}`);
            console.log(`✅ Health: http://localhost:${PORT}/health`);
            console.log(`✅ Time: ${new Date().toISOString()}`);
            console.log('✅ ========================================');

            Logger.info(`🔨 Work History Service running on port ${PORT}`);
            Logger.info(`📊 Source of truth for creator achievements and portfolio tracking`);
            Logger.info(`🌐 Health check: http://localhost:${PORT}/health`);
        });

    } catch (error) {
        console.error('❌ ========================================');
        console.error('❌ CRITICAL STARTUP ERROR');
        console.error('❌ Message:', error.message);
        console.error('❌ Stack:', error.stack);
        console.error('❌ ========================================');
        Logger.error('Failed to start Work History Service:', error);
        process.exit(1);
    }
};

// Global error handlers (OK at top level)
process.on('uncaughtException', (error) => {
    console.error('💥 UNCAUGHT EXCEPTION:', error);
    Logger.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 UNHANDLED REJECTION at:', promise, 'reason:', reason);
    Logger.error('Unhandled Rejection:', reason);
    process.exit(1);
});

process.on('SIGTERM', async () => {
    console.log('👋 SIGTERM received, graceful shutdown...');

    try {
        // Close RabbitMQ connection
        await RabbitMQService.disconnect();
        Logger.info('RabbitMQ connection closed');

        // Close Prisma connection
        await prisma.$disconnect();
        Logger.info('Database connection closed');

        process.exit(0);
    } catch (error) {
        Logger.error('Error during graceful shutdown:', error);
        process.exit(1);
    }
});

process.on('SIGINT', async () => {
    console.log('👋 SIGINT received, graceful shutdown...');

    try {
        // Close RabbitMQ connection
        await RabbitMQService.disconnect();
        Logger.info('RabbitMQ connection closed');

        // Close Prisma connection
        await prisma.$disconnect();
        Logger.info('Database connection closed');

        process.exit(0);
    } catch (error) {
        Logger.error('Error during graceful shutdown:', error);
        process.exit(1);
    }
});

// ✅ CALL startServer() - This is the ONLY async code at top level
startServer();
