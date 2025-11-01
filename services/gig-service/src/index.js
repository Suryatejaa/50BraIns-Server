// Setup global console compression (must be early in startup)
const { setupGlobalConsoleCompression } = require('../../../utils/globalConsoleLogger');
setupGlobalConsoleCompression('GIG-SERVICE');

const express = require('express');
const dotenv = require('dotenv');
const helmet = require('helmet');
const compression = require('compression');
const databaseService = require('./services/database');
const rabbitmqService = require('./services/rabbitmqService');
const gigCacheService = require('./services/gigCacheService');
const CreditEventConsumer = require('./services/creditEventConsumer');
const GigEventConsumer = require('./services/gigEventConsumer');

// Import routes
const healthRoutes = require('./routes/health');
const gigRoutes = require('./routes/gigs');
const myRoutes = require('./routes/my');
const publicRoutes = require('./routes/public');
const applicationRoutes = require('./routes/applications');
const submissionRoutes = require('./routes/submissions');
const crewRoutes = require('./routes/crew');

// Import middleware
const {
    limiter,
    requestLogger,
    userContext,
    requireAuth,
    requireAdmin,
    asyncHandler,
    errorHandler,
    notFoundHandler
} = require('./middleware');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4004;

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

        // Use fast JSON stringify with replacer for performance
        return originalJson.call(this, data);
    };

    req.startTime = Date.now();
    next();
});

// Request logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} ${req.method} ${req.url} - ${req.ip}`);
    next();
});

app.use(userContext);

// Mount routes
app.use('/health', healthRoutes);
app.use('/gig', gigRoutes);
app.use('/my', myRoutes);
app.use('/public', publicRoutes);
app.use('/applications', applicationRoutes);
app.use('/submissions', submissionRoutes);
app.use('/crew', crewRoutes);

// Cache metrics endpoint
app.get('/cache/metrics', (req, res) => {
    const metrics = gigCacheService.getMetrics();
    res.json({
        success: true,
        metrics: {
            ...metrics,
            timestamp: new Date().toISOString()
        }
    });
});

// Cache health endpoint
app.get('/cache/health', async (req, res) => {
    const health = await gigCacheService.getHealthStatus();
    res.json({
        success: true,
        cache: health
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        service: 'Gig Service',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
        endpoints: {
            health: '/health',
            gigs: '/gigs',
            myGigs: '/my/posted',
            myApplications: '/my/applications',
            public: '/public'
        }
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method
    });
});

// Global error handler
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);

    try {
        // Close RabbitMQ connection
        await rabbitmqService.close();
        console.log('RabbitMQ connection closed');

        // Close cache connection
        await gigCacheService.shutdown();
        console.log('Cache service shutdown');

        // Close database connections
        await databaseService.disconnect();
        console.log('Database connections closed');

        // Exit process
        process.exit(0);
    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
};

// Handle shutdown signals
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Start server
async function startServer() {
    try {
        // Initialize database connection
        await databaseService.connect();
        console.log('Database connected successfully');

        // Initialize cache service
        await gigCacheService.initialize();
        console.log('Cache service initialized successfully');

        // Start HTTP server
        const server = app.listen(PORT, async () => {
            console.log(`🚀 Gig Service running on port ${PORT}`);
            console.log(`📊 Health check: http://localhost:${PORT}/health`);
            console.log(`📝 API docs: http://localhost:${PORT}/`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

            // Mark end of startup phase for console compression
            console.markStartupEnd('Gig Service', PORT);

            // Start Event Consumers
            try {
                const rabbitmqConnection = await rabbitmqService.connect();
                if (rabbitmqConnection !== false && rabbitmqService.isConnected) {
                    console.log('🐇 [Gig Service] Connected to RabbitMQ successfully');

                    // Start Credit Event Consumer
                    const creditEventConsumer = new CreditEventConsumer();
                    await rabbitmqService.startConsumer(async (message) => {
                        await creditEventConsumer.handleMessage(message);
                    });
                    console.log('✅ [Gig Service] Credit event consumer started');

                    // Start Gig Event Consumer
                    const gigEventConsumer = new GigEventConsumer();
                    await rabbitmqService.startConsumer(async (message) => {
                        await gigEventConsumer.handleMessage(message);
                    });
                    console.log('✅ [Gig Service] Gig event consumer started');

                    // Start cleanup cron job
                    setInterval(async () => {
                        try {
                            await creditEventConsumer.cleanup();
                            await gigEventConsumer.cleanup();
                        } catch (error) {
                            console.error('❌ [Gig Service] Cleanup error:', error);
                        }
                    }, 60 * 60 * 1000); // Run cleanup every hour
                } else {
                    console.warn('⚠️  [Gig Service] RabbitMQ connection failed, continuing without message broker');
                }

            } catch (error) {
                console.error('❌ [Gig Service] Failed to start event consumers:', error);
            }
        });

        // Handle server errors
        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.error(`❌ Port ${PORT} is already in use`);
            } else {
                console.error('❌ Server error:', error);
            }
            process.exit(1);
        });

        return server;
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server if this file is run directly
if (require.main === module) {
    startServer();
}

module.exports = app;
