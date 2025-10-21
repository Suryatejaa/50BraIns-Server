const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');
const rabbitmqService = require('./services/rabbitmqService');
const cronService = require('./services/cronService');
const creditRoutes = require('./routes/creditRoutes');
const publicRoutes = require('./routes/public');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 4005;

// Initialize Prisma
const prisma = new PrismaClient();

// Security middleware
app.use(helmet());

// General rate limiting
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests, please try again later',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false
});

app.use(generalLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        // Check database connection
        await prisma.$queryRaw`SELECT 1`;

        // Check RabbitMQ connection
        const mqStatus = rabbitmqService.isConnected;

        res.json({
            status: 'healthy',
            service: 'credit-service',
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version || '1.0.0',
            database: 'connected',
            rabbitmq: mqStatus ? 'connected' : 'disconnected',
            environment: process.env.NODE_ENV || 'development'
        });
    } catch (error) {
        console.error('Health check failed:', error);
        res.status(503).json({
            status: 'unhealthy',
            service: 'credit-service',
            timestamp: new Date().toISOString(),
            error: error.message,
            database: 'disconnected'
        });
    }
});

// API Routes - Gateway strips /api/credit prefix, so mount at root
app.use('/public', publicRoutes);  // Public credit packages and pricing
app.use('/', creditRoutes);         // Protected credit operations

// 404 handler
app.use(notFoundHandler);

// Error handling middleware
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async () => {
    console.log('Starting graceful shutdown...');

    try {
        // Stop cron jobs
        cronService.stop();
        console.log('Cron jobs stopped');

        // Close RabbitMQ connection
        await rabbitmqService.close();
        console.log('RabbitMQ connection closed');

        // Close database connection
        await prisma.$disconnect();
        console.log('Database connection closed');

        process.exit(0);
    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
};

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown();
});

// Start server
const startServer = async () => {
    try {
        // Initialize RabbitMQ connection
        await rabbitmqService.connect();
        console.log('RabbitMQ connected successfully');

        // Test database connection
        await prisma.$connect();
        console.log('Database connected successfully');

        // Start cron jobs
        cronService.start();
        console.log('Cron jobs started successfully');

        app.listen(PORT, () => {
            console.log(`
🚀 Credit Service is running!
📍 Port: ${PORT}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
🔗 Health Check: http://localhost:${PORT}/health
📊 API Endpoints: http://localhost:${PORT}/api/credits
🕒 Cron Jobs: Active
            `);
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Start the server
startServer();

module.exports = app;
