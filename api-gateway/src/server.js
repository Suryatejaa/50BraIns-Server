// Setup global console compression (must be early in startup)
const { setupGlobalConsoleCompression } = require('../../utils/globalConsoleLogger');
setupGlobalConsoleCompression('api-gateway');

const cluster = require('cluster');
const os = require('os');
const app = require('./app');
const logger = require('./utils/logger');
const config = require('./config');
const webSocketProxy = require('./middleware/websocket-proxy');

const PORT = config.port;
const numCPUs = os.cpus().length;

// Clustering for production performance
if (config.enableClustering && cluster.isMaster && config.nodeEnv === 'production') {
    logger.info(`🚀 Master process ${process.pid} is running`);
    logger.info(`📊 Starting ${config.maxClusters || numCPUs} worker processes`);

    // Fork workers equal to CPU cores or configured max
    const workers = config.maxClusters || numCPUs;
    for (let i = 0; i < workers; i++) {
        cluster.fork();
    }

    // Handle worker exit and restart
    cluster.on('exit', (worker, code, signal) => {
        logger.warn(`💀 Worker ${worker.process.pid} died (${signal || code}). Restarting...`);
        cluster.fork();
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
        logger.info('🔄 SIGTERM received. Shutting down gracefully...');
        for (const id in cluster.workers) {
            cluster.workers[id].kill();
        }
    });

    process.on('SIGINT', () => {
        logger.info('🔄 SIGINT received. Shutting down gracefully...');
        for (const id in cluster.workers) {
            cluster.workers[id].kill();
        }
        process.exit(0);
    });

} else {
    // Worker process or single process mode
    const server = app.listen(PORT, () => {
        const processInfo = cluster.isWorker
            ? `Worker ${process.pid}`
            : `Single process ${process.pid}`;

        logger.info(`🌐 ${processInfo} - API Gateway listening on port ${PORT}`);
        logger.info(`📁 Environment: ${config.nodeEnv}`);
        logger.info(`🔗 Auth Service: ${config.services.auth.url}`);
        logger.info(`⚡ Clustering: ${config.enableClustering ? 'Enabled' : 'Disabled'}`);

        if (config.enableMonitoring) {
            logger.info(`📊 Monitoring available at: http://localhost:${PORT}${config.monitoringPath}`);
        }

        // Mark end of startup phase for console compression
        console.markStartupEnd('API Gateway', PORT);

        // Initialize WebSocket proxy
        webSocketProxy.initialize(server);
        logger.info('🔌 WebSocket proxy initialized for notifications');
    });

    // Graceful shutdown for workers
    process.on('SIGTERM', () => {
        logger.info('🔄 SIGTERM received. Shutting down gracefully...');
        server.close(() => {
            logger.info('✅ Process terminated');
            process.exit(0);
        });
    });

    process.on('SIGINT', () => {
        logger.info('🔄 SIGINT received. Shutting down gracefully...');
        server.close(() => {
            logger.info('✅ Process terminated');
            process.exit(0);
        });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
        logger.error('💥 Uncaught Exception:', err);
        process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
        logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
        process.exit(1);
    });
}
