// src/index.js


require('dotenv').config();

// Setup global console compression (must be early in startup)
const { setupGlobalConsoleCompression } = require('../../../utils/globalConsoleLogger');
setupGlobalConsoleCompression('user-service');

const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const { StatusCodes } = require('http-status-codes');
require('express-async-errors');
const logger = require('./utils/logger');
const { addUserToRequest } = require('./utils/auth');
const { errorHandler } = require('./middleware/error-handler');
const { startUserSyncConsumer } = require('./sync/userSync.consumer');
const rabbitmqService = require('./services/rabbitmqService');
const CreditEventConsumer = require('./services/creditEventConsumer');
const AuthEventConsumer = require('./services/authEventConsumer');
const userCacheService = require('./services/userCacheService');
const searchRoutes = require('./routes/search.routes');
const publicRoutes = require('./routes/public.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const syncRoutes = require('./routes/sync.routes');
const adminRoutes = require('./routes/admin.routes');
const feedRoutes = require('./routes/feed.routes');
const userRoutes = require('./routes/user.routes'); // Assuming user routes are needed

const app = express();
const PORT = process.env.PORT || 4002;

// Trust proxy (for production load balancers)
app.set('trust proxy', 1);

// Security and performance middleware
app.use(helmet());

// Optimized compression configuration for maximum performance
app.use(compression({
    level: 6, // Compression level (1-9, 6 is optimal balance)
    threshold: 1024, // Only compress responses larger than 1KB
    filter: (req, res) => {
        // Compress all responses except if explicitly disabled
        if (req.headers['x-no-compression']) {
            return false;
        }
        // Fallback to standard compression filter
        return compression.filter(req, res);
    },
    // Add specific MIME types for better compression
    chunkSize: 16 * 1024, // 16KB chunks for better streaming
    windowBits: 15, // Maximum compression window
    memLevel: 8 // Memory usage level (1-9, 8 is good balance)
}));

app.use(cookieParser());

// Body parsing middleware with optimization
app.use(express.json({
    limit: '10mb',
    reviver: null // Don't parse dates automatically for performance
}));
app.use(express.urlencoded({
    extended: true,
    limit: '10mb',
    parameterLimit: 1000 // Limit number of parameters
}));

// Response optimization middleware
app.use((req, res, next) => {
    // Track request start time for performance monitoring
    req.startTime = Date.now();

    // Set optimal cache headers for static-like responses
    if (req.method === 'GET') {
        res.set({
            'Cache-Control': 'private, max-age=60', // 1 minute cache for GET requests
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY'
        });
    }

    // Optimize JSON responses
    const originalJson = res.json;
    res.json = function (data) {
        // Set appropriate content type and encoding
        res.set({
            'Content-Type': 'application/json; charset=utf-8',
            'X-Response-Time': Date.now() - req.startTime + 'ms'
        });
        return originalJson.call(this, data);
    };

    next();
});
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Add user information from gateway headers to req.user
app.use(addUserToRequest);
app.get('/health', (req, res) => {
    res.status(StatusCodes.OK).json({
        status: 'ok',
        service: 'user-service',
        timestamp: new Date().toISOString(),
        purpose: 'High-performance user discovery and analytics - collaborates with auth-service'
    });
});
app.use('/', userRoutes); // User management routes
app.use('/admin', adminRoutes);              // Admin routes for user management
app.use('/search', searchRoutes);          // High-performance search
app.use('/public', publicRoutes);          // Public profile views with caching
app.use('/analytics', analyticsRoutes);    // User analytics and insights
app.use('/sync', syncRoutes);
app.use('/feed', feedRoutes);              // Feed routes with sorting and filtering
app.use((req, res) => {
    res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        error: 'Not Found',
        message: `Route ${req.method} ${req.url} not found`,
        note: 'For user profile management, use auth-service at /api/auth/users'
    });
});
app.use(errorHandler);
const server = app.listen(PORT, async () => {
    console.log(`✅ User Service running on port ${PORT}`);
    logger.info(`User Service running on port ${PORT}`);

    // Mark end of startup phase for console compression
    console.markStartupEnd('User Service', PORT);

    // Initialize cache service
    try {
        await userCacheService.init();
        console.log('✅ [User Service] Cache service initialized');
    } catch (error) {
        console.error('❌ [User Service] Failed to initialize cache service:', error);
    }

    // Start RabbitMQ consumer for user registration sync
    console.log('36. About to start RabbitMQ consumer...');
    startUserSyncConsumer(); // Re-enabled with correct RabbitMQ credentials
    console.log('37. RabbitMQ consumer started');

    // Start RabbitMQ Consumers
    try {
        // Start Auth Event Consumer (listens to brains_events exchange)
        const authEventConsumer = new AuthEventConsumer();
        await authEventConsumer.connect();
        await authEventConsumer.startConsumer();
        console.log('✅ [User Service] Auth event consumer started');

        // Start User Service Consumer (listens to user_events exchange)
        await rabbitmqService.connect();
        await rabbitmqService.startConsumer(async (message, routingKey) => {
            const eventHandlerService = require('./services/eventHandler.service');
            await eventHandlerService.handleEvent(message, routingKey);
        });
        console.log('✅ [User Service] User event consumer started');

        // Start Credit Event Consumer if needed
        try {
            const creditEventConsumer = new CreditEventConsumer();

            // Start cleanup cron job
            setInterval(async () => {
                try {
                    await creditEventConsumer.cleanup();
                } catch (error) {
                    console.error('❌ [User Service] Cleanup error:', error);
                }
            }, 60 * 60 * 1000); // Run cleanup every hour

            console.log('✅ [User Service] Credit event consumer started');
        } catch (creditError) {
            console.error('❌ [User Service] Failed to start credit event consumer:', creditError);
        }

    } catch (error) {
        console.error('❌ [User Service] Failed to start RabbitMQ consumers:', error);
    }
});

// Handle uncaught exceptions and rejections
process.on('uncaughtException', async (error) => {
    logger.error('Uncaught Exception:', error);
    try {
        await rabbitmqService.close();
    } catch (e) {
        console.error('Error closing RabbitMQ:', e);
    }
    process.exit(1);
});

process.on('unhandledRejection', async (error) => {
    logger.error('Unhandled Rejection:', error);
    try {
        await rabbitmqService.close();
    } catch (e) {
        console.error('Error closing RabbitMQ:', e);
    }
    server.close(() => process.exit(1));
});

module.exports = app;