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
app.set('trust proxy', true);
// Middleware
app.use(helmet());
app.use(morgan('combined'));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use(limiter);

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'work-history',
        timestamp: new Date().toISOString()
    });
});

// Routes
app.use('/work-history', workHistoryRoutes);
app.use('/portfolio', portfolioRoutes);
app.use('/achievements', achievementRoutes);
app.use('/summary', summaryRoutes);

// Error handling
app.use((err, req, res, next) => {
    Logger.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
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
    await prisma.$disconnect();
    process.exit(0);
});

// ✅ CALL startServer() - This is the ONLY async code at top level
startServer();
