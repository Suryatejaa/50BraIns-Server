require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4003;

console.log('🚀 Starting Simplified Clan Service (V1)...');

// Basic middleware
app.set('trust proxy', 1);
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Import routes
const healthRoutes = require('./routes/health');
const clanRoutes = require('./routes/clans');
const memberRoutes = require('./routes/members');
const messageRoutes = require('./routes/messages');

// Use routes
app.use('/health', healthRoutes);
app.use('/clans', clanRoutes);
app.use('/members', memberRoutes);
app.use('/clans', messageRoutes); // Messages are nested under clans

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// Start server
async function startServer() {
    try {
        // Initialize database service
        const { getDatabaseService } = require('./services/database.service');
        const dbService = getDatabaseService();
        await dbService.initialize();

        const server = app.listen(PORT, () => {
            console.log(`\n🎉 Simplified Clan Service (V1) is ready!`);
            console.log(`📍 URL: http://localhost:${PORT}`);
            console.log(`🩺 Health: http://localhost:${PORT}/health`);
            console.log(`🏘️  Clans: http://localhost:${PORT}/clans`);
            console.log(`💬 Chat: /clans/:id/messages`);
            console.log(`🎯 Gig Sharing: /clans/:id/share-gig`);
            console.log(`📊 Reputation: Automatic updates`);
            console.log(`🔌 WebSocket: ws://localhost:${PORT}/ws?userId=XXX&clanId=XXX`);
        });

        // Initialize WebSocket service
        const { WebSocketService } = require('./services/websocket.service');
        const wsService = new WebSocketService();
        wsService.initialize(server);

        // Initialize RabbitMQ consumer with WebSocket service reference
        const { RabbitMQConsumer } = require('./services/rabbitmq.consumer');
        const rabbitmqConsumer = new RabbitMQConsumer(wsService);
        await rabbitmqConsumer.connect();

        // Store server reference for graceful shutdown
        app.locals.server = server;
        app.locals.wsService = wsService;
        app.locals.rabbitmqConsumer = rabbitmqConsumer;
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    await gracefulShutdown();
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    await gracefulShutdown();
});

async function gracefulShutdown() {
    try {
        // Close WebSocket service
        if (app.locals.wsService) {
            app.locals.wsService.close();
        }

        // Close RabbitMQ consumer
        if (app.locals.rabbitmqConsumer) {
            await app.locals.rabbitmqConsumer.close();
        }

        // Close database connection
        const { getDatabaseService } = require('./services/database.service');
        const dbService = getDatabaseService();
        await dbService.disconnect();

        // Close server
        if (app.locals.server) {
            app.locals.server.close(() => {
                console.log('Server closed');
                process.exit(0);
            });
        } else {
            process.exit(0);
        }
    } catch (error) {
        console.error('Error during graceful shutdown:', error);
        process.exit(1);
    }
}
