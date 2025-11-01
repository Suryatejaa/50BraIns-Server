const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');
const hpp = require('hpp');
const rabbitmqService = require('./utils/rabbitmq');
require('dotenv').config();

// Setup global console compression (must be early in startup)
const { setupGlobalConsoleCompression } = require('../../../utils/globalConsoleLogger');
setupGlobalConsoleCompression('auth-service');

// Import configurations
const { connectRedis } = require('./config/redis');
const logger = require('./utils/logger.utils');

// Import routes
const authRoutes = require('./routes/auth.routes');
// const internalRoutes = require('./routes/internal.routes');

// Import middleware
const { errorHandler, notFound } = require('./middleware/error.middleware');
const { requestLogger, requestId } = require('./middleware/logging.middleware');
const { securityHeaders } = require('./middleware/security.middleware');
const e = require('express');

const app = express();
const PORT = process.env.PORT || 4001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Trust proxy (for production behind load balancer)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
    contentSecurityPolicy: NODE_ENV === 'production' ? {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    } : false,
}));

// XSS Protection
app.use((req, res, next) => {
    if (req.body && typeof req.body === 'object') {
        Object.keys(req.body).forEach(key => {
            if (typeof req.body[key] === 'string') {
                req.body[key] = xss(req.body[key]);
            }
        });
    }
    next();
});

// Prevent NoSQL injection attacks
app.use(mongoSanitize());

// Prevent HTTP Parameter Pollution
app.use(hpp());

// Compression and parsing
app.use(compression());
app.use(express.json({
    limit: '10mb'
    // Removed verify function that could cause issues
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Custom security headers
app.use(securityHeaders);

// Request ID middleware
app.use(requestId);

// Request timeout middleware (30 seconds)
app.use((req, res, next) => {
    req.setTimeout(30000, () => {
        logger.warn('Request timeout', {
            url: req.url,
            method: req.method,
            ip: req.ip
        });
        if (!res.headersSent) {
            res.status(408).json({
                success: false,
                error: 'Request timeout',
                code: 'REQUEST_TIMEOUT'
            });
        }
    });
    next();
});

// Logging
if (NODE_ENV !== 'test') {
    app.use(morgan('combined', {
        stream: { write: (msg) => logger.info(msg.trim()) },
        skip: (req, res) => res.statusCode < 400
    }));
    app.use(morgan('dev', {
        skip: (req, res) => res.statusCode >= 400
    }));
}
app.use(requestLogger);

// Rate limiting
const createRateLimiter = (windowMs, max, message) => rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return req.ip + ':' + (req.user?.id || 'anonymous');
    }
});

// Apply different rate limits based on environment
const authLimiter = createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    NODE_ENV === 'test' ? 10000 : (NODE_ENV === 'production' ? 5 : 50), // Higher limit for tests
    'Too many authentication attempts, please try again later'
);

const generalLimiter = createRateLimiter(
    15 * 60 * 1000, // 15 minutes  
    NODE_ENV === 'test' ? 10000 : (NODE_ENV === 'production' ? 100 : 1000), // Higher limit for tests
    'Too many requests, please try again later'
);

// Speed limiter (progressive delay) - disabled in test environment
const speedLimiter = NODE_ENV === 'test' ? (req, res, next) => next() : slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: NODE_ENV === 'production' ? 50 : 500, // Start delaying after X requests
    delayMs: (used, req) => 500 * (used - (NODE_ENV === 'production' ? 50 : 500)), // Progressive delay function
    maxDelayMs: 20000, // Maximum delay of 20 seconds
});

// app.use(generalLimiter);
// app.use(speedLimiter);

// Health check (before auth routes to avoid rate limiting)
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: NODE_ENV,
        version: process.env.npm_package_version || '1.0.0',
        memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
        }
    });
});

// Database health check
app.get('/health/database', async (req, res) => {
    try {
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        await prisma.$queryRaw`SELECT 1`;
        await prisma.$disconnect();
        res.status(200).json({ database: 'connected' });
    } catch (error) {
        logger.error('Database health check failed:', error);
        res.status(503).json({ database: 'disconnected', error: error.message });
    }
});

// API Routes - Gateway strips /api/auth prefix, so mount at root
app.use('/', authRoutes);

// Internal API routes for service-to-service communication
// app.use('/internal', internalRoutes);

// API Documentation route
app.get('/api-docs', (req, res) => {
    res.json({
        title: '50BraIns Auth Service API',
        version: '1.0.0',
        description: 'Enterprise authentication and user management service',
        endpoints: {
            auth: {
                'POST /auth/register': 'User registration',
                'POST /auth/login': 'User login',
                'POST /auth/logout': 'User logout',
                'GET /auth/profile': 'Get user profile',
                'POST /auth/refresh': 'Refresh access token',
                'POST /auth/verify-email': 'Verify email address',
                'POST /auth/forgot-password': 'Request password reset',
                'POST /auth/reset-password': 'Reset password',
            },
            users: {
                'GET /users/me': 'Get current user data',
                'PUT /users/profile': 'Update user profile',
                'PUT /users/social': 'Update social media handles',
                'PUT /users/profile-picture': 'Update profile picture',
                'DELETE /users/deactivate': 'Deactivate account',
            },
            admin: {
                'GET /admin/users': 'List all users',
                'GET /admin/users/:id': 'Get user details',
                'PUT /admin/users/:id/roles': 'Update user roles',
                'PUT /admin/users/:id/status': 'Update user status',
                'POST /admin/users/:id/ban': 'Ban user',
                'POST /admin/users/:id/unban': 'Unban user',
                'DELETE /admin/users/:id': 'Delete user',
                'GET /admin/stats': 'Get system statistics',
                'GET /admin/activity-logs': 'Get activity logs',
            }
        }
    });
});

// 404 handler
app.use('*', notFound);

// Global error handling middleware
app.use(errorHandler);

// Graceful shutdown handlers
const gracefulShutdown = (signal) => {
    logger.info(`${signal} received, shutting down gracefully`);

    process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Unhandled promise rejection handler
process.on('unhandledRejection', (err) => {
    logger.error('Unhandled Promise Rejection:', err);
    process.exit(1);
});

// Uncaught exception handler
process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    process.exit(1);
});

// Start server
const startServer = async () => {
    try {
        console.log('🔧 Starting server initialization...');

        // Test database connection
        console.log('🔧 Testing database connection...');
        try {
            const { PrismaClient } = require('@prisma/client');
            const testPrisma = new PrismaClient();
            await testPrisma.$queryRaw`SELECT 1`;
            await testPrisma.$disconnect();
            console.log('🔧 Database connection test passed');
            logger.info('✅ Database connected successfully');
        } catch (dbError) {
            logger.error('❌ Database connection failed:', dbError.message);
            console.log('🔧 Database connection failed, continuing anyway');
        }

        // Connect to Redis for caching and sessions (non-blocking)
        if (NODE_ENV !== 'test') {
            console.log('🔧 Connecting to Redis...');
            connectRedis().catch(err => {
                logger.warn('Redis connection failed, continuing without cache:', err.message);
            });
        }

        console.log('🔧 Starting HTTP server...');
        const server = app.listen(PORT, () => {
            console.log('🔧 HTTP server started successfully');
            logger.info(`🚀 50BraIns Auth Service running on port ${PORT} in ${NODE_ENV} mode`);
            logger.info(`📊 Health check: http://localhost:${PORT}/health`);
            logger.info(`📋 API Documentation: http://localhost:${PORT}/api-docs`);

            if (NODE_ENV === 'development') {
                logger.info(`🔐 Ready for authentication requests!`);
            }

            // Mark end of startup phase for console compression
            console.markStartupEnd('Auth Service', PORT);
        });

        console.log('🔧 Starting RabbitMQ connection...');
        // Connect to RabbitMQ (completely non-blocking - don't await)
        const connectRabbitMQ = async () => {
            try {
                const rabbitmqConnection = await rabbitmqService.connect();
                if (rabbitmqConnection) {
                    logger.info('🐇 Connected to RabbitMQ successfully');
                } else {
                    logger.warn('⚠️ RabbitMQ connection failed, continuing without message broker');
                }
            } catch (rabbitmqError) {
                logger.warn('⚠️ RabbitMQ connection error, continuing without message broker:', rabbitmqError.message);
            }
        };

        // Start RabbitMQ connection in background
        connectRabbitMQ();
        console.log('🔧 RabbitMQ connection started in background');

        console.log('🔧 Setting up server error handlers...');
        // Handle server errors
        server.on('error', (error) => {
            if (error.syscall !== 'listen') {
                throw error;
            }

            switch (error.code) {
                case 'EACCES':
                    logger.error(`Port ${PORT} requires elevated privileges`);
                    process.exit(1);
                case 'EADDRINUSE':
                    logger.error(`Port ${PORT} is already in use`);
                    process.exit(1);
                default:
                    throw error;
            }
        });

        console.log('🔧 Server initialization completed');

    } catch (error) {
        console.error('🔧 Server initialization failed:', error);
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};// Only start server if not in test mode
if (NODE_ENV !== 'test') {
    startServer();
}

module.exports = app;
