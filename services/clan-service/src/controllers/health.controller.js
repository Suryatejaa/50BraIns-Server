/**
 * Health controller for service monitoring
 */

const { getDatabaseService } = require('../services/database.service');

class HealthController {
    /**
     * Basic health check
     */
    static async getHealth(req, res) {
        try {
            const dbService = getDatabaseService();
            const dbHealth = await dbService.healthCheck();

            const healthStatus = {
                status: 'ok',
                service: 'clan-service-v1',
                timestamp: new Date().toISOString(),
                database: dbHealth.status,
                uptime: process.uptime()
            };

            // Set appropriate status code based on database health
            const statusCode = dbHealth.status === 'healthy' ? 200 : 503;

            res.status(statusCode).json(healthStatus);
        } catch (error) {
            console.error('Health check error:', error);
            res.status(503).json({
                status: 'error',
                service: 'clan-service-v1',
                timestamp: new Date().toISOString(),
                error: error.message
            });
        }
    }

    /**
     * Detailed health check
     */
    static async getDetailedHealth(req, res) {
        try {
            const dbService = getDatabaseService();
            const dbHealth = await dbService.healthCheck();

            const detailedHealth = {
                status: 'ok',
                service: 'clan-service-v1',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                database: dbHealth,
                environment: process.env.NODE_ENV || 'development',
                version: process.env.npm_package_version || '1.0.0'
            };

            const statusCode = dbHealth.status === 'healthy' ? 200 : 503;
            res.status(statusCode).json(detailedHealth);
        } catch (error) {
            console.error('Detailed health check error:', error);
            res.status(503).json({
                status: 'error',
                service: 'clan-service-v1',
                timestamp: new Date().toISOString(),
                error: error.message
            });
        }
    }

    /**
     * WebSocket health check
     */
    static async getWebSocketHealth(req, res) {
        try {
            // Get WebSocket stats from the app instance
            const wsService = req.app.locals.wsService;
            
            if (!wsService) {
                return res.status(503).json({
                    status: 'error',
                    service: 'clan-service-v1',
                    timestamp: new Date().toISOString(),
                    error: 'WebSocket service not initialized'
                });
            }

            const wsStats = wsService.getStats();
            
            const wsHealth = {
                status: 'ok',
                service: 'clan-service-v1',
                timestamp: new Date().toISOString(),
                websocket: {
                    status: 'healthy',
                    connections: wsStats
                }
            };

            res.json(wsHealth);
        } catch (error) {
            console.error('WebSocket health check error:', error);
            res.status(503).json({
                status: 'error',
                service: 'clan-service-v1',
                timestamp: new Date().toISOString(),
                error: error.message
            });
        }
    }
}

module.exports = HealthController;
