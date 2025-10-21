// src/index.js


require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
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
const searchRoutes = require('./routes/search.routes');
const publicRoutes = require('./routes/public.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const syncRoutes = require('./routes/sync.routes');
const adminRoutes = require('./routes/admin.routes');
const feedRoutes = require('./routes/feed.routes');
const userRoutes = require('./routes/user.routes'); // Assuming user routes are needed

const app = express();
const PORT = process.env.PORT || 4002;
app.use(helmet());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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