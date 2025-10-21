const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const databaseService = require('./services/database');
const rabbitmqService = require('./services/rabbitmqService');
const CreditEventConsumer = require('./services/creditEventConsumer');
const {
    limiter,
    requestLogger,
    userContext,
    errorHandler,
    notFoundHandler
} = require('./middleware');

const app = express();
const PORT = process.env.PORT || 4003;

console.log('🚀 Starting Clan Service (Organized Structure)...');

// Basic middleware
// Enable trust proxy so express-rate-limit can safely use X-Forwarded-For behind a proxy/API gateway
app.set('trust proxy', 1);
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use(limiter);

// Request logging
app.use(requestLogger);

// User context (simulating API Gateway)
app.use(userContext);

// Import routes
console.log('📋 Loading routes...');
console.log('🔄 About to load health routes...');
const healthRoutes = require('./routes/health');
console.log('✅ Health routes loaded');
console.log('🔄 About to load clan routes...');
const clanRoutes = require('./routes/clans');
console.log('✅ Clan routes loaded');
console.log('🔄 About to load public routes...');
const publicRoutes = require('./routes/public');
console.log('✅ Public routes loaded');
console.log('🔄 About to load member routes...');
const memberRoutes = require('./routes/members');
console.log('✅ Member routes loaded');
console.log('🔄 About to load analytics routes...');
const analyticsRoutes = require('./routes/analytics');
const activityRoutes = require('./routes/activity');
console.log('✅ Analytics routes loaded');
console.log('🔄 About to load admin routes...');
const adminRoutes = require('./routes/admin');
console.log('✅ Admin routes loaded');
console.log('🔄 About to load rankings routes...');
const rankingsRoutes = require('./routes/rankings');
console.log('✅ All routes loaded');

// Use routes - Organized to match gateway expectations
app.use('/health', healthRoutes);
app.use('/clan/public', publicRoutes);
app.use('/members', memberRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/admin', adminRoutes);
app.use('/rankings', rankingsRoutes);
// Special route for clan feed (handled by gateway as /api/clans/feed)
app.use('/clan', clanRoutes);
app.use('/', activityRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', notFoundHandler);

// Start server
async function startServer() {
    try {
        // Test database connection
        console.log('🔗 Testing database connection...');
        const healthCheck = await databaseService.healthCheck();

        if (healthCheck.connected) {
            console.log(`✅ Database connected - ${healthCheck.clanCount} clans found`);
        } else {
            console.error('❌ Database connection failed:', healthCheck.error);
            process.exit(1);
        }

        const server = app.listen(PORT, async () => {
            console.log(`\n🎉 Clan Service is ready!`);
            console.log(`📍 URL: http://localhost:${PORT}`);
            console.log(`🩺 Health: http://localhost:${PORT}/health`);
            console.log(`🏘️  Clans: http://localhost:${PORT}/clans`);
            console.log(`🌐 Public: http://localhost:${PORT}/public/featured`);
            console.log(`📊 Rankings: http://localhost:${PORT}/rankings`);
            console.log(`🧪 Ready for comprehensive testing!`);

            // Start Credit Event Consumer
            try {
                await rabbitmqService.connect();
                const creditEventConsumer = new CreditEventConsumer();

                // Start consuming credit events
                await rabbitmqService.startConsumer(async (message) => {
                    await creditEventConsumer.handleMessage(message);
                });

                console.log('✅ [Clan Service] Credit event consumer started');

                // Start cleanup cron job
                setInterval(async () => {
                    try {
                        await creditEventConsumer.cleanup();
                    } catch (error) {
                        console.error('❌ [Clan Service] Cleanup error:', error);
                    }
                }, 60 * 60 * 1000); // Run cleanup every hour

            } catch (error) {
                console.error('❌ [Clan Service] Failed to start credit event consumer:', error);
            }
        });

        // Graceful shutdown
        const shutdown = async () => {
            console.log('📴 Shutting down gracefully...');
            server.close(async () => {
                try {
                    await rabbitmqService.close();
                    console.log('✅ RabbitMQ connection closed');
                } catch (e) {
                    console.error('Error closing RabbitMQ:', e);
                }

                await databaseService.disconnect();
                console.log('✅ Server shut down complete');
                process.exit(0);
            });
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);

    } catch (error) {
        console.error('💥 Failed to start server:', error.message);
        process.exit(1);
    }
}

startServer();
