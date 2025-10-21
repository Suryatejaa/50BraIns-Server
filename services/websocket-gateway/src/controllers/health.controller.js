/**
 * Health Controller for WebSocket Gateway Service
 */

class HealthController {
    /**
     * Basic health check
     */
    static getHealth(req, res) {
        res.json({
            service: 'WebSocket Gateway',
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            version: process.version
        });
    }

    /**
     * WebSocket-specific health check
     */
    static getWebSocketHealth(req, res) {
        try {
            // Get WebSocket gateway instance from app locals
            const wsGateway = req.app.locals.wsGateway;

            if (!wsGateway) {
                return res.status(503).json({
                    service: 'WebSocket Gateway',
                    status: 'unavailable',
                    error: 'WebSocket gateway not initialized',
                    timestamp: new Date().toISOString()
                });
            }

            const stats = wsGateway.getStats();

            res.json({
                service: 'WebSocket Gateway',
                status: 'healthy',
                timestamp: new Date().toISOString(),
                websocket: {
                    connections: stats,
                    services: {
                        notifications: stats.services.notifications,
                        clanChat: stats.services.clanChat
                    }
                }
            });

        } catch (error) {
            res.status(500).json({
                service: 'WebSocket Gateway',
                status: 'error',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * RabbitMQ health check
     */
    static getRabbitMQHealth(req, res) {
        try {
            // Get WebSocket gateway instance from app locals
            const wsGateway = req.app.locals.wsGateway;

            if (!wsGateway) {
                return res.status(503).json({
                    service: 'WebSocket Gateway',
                    status: 'unavailable',
                    error: 'WebSocket gateway not initialized',
                    timestamp: new Date().toISOString()
                });
            }

            const rabbitmqStatus = wsGateway.rabbitmqService.getConnectionStatus();

            res.json({
                service: 'WebSocket Gateway',
                status: rabbitmqStatus.isReady ? 'healthy' : 'degraded',
                timestamp: new Date().toISOString(),
                rabbitmq: rabbitmqStatus
            });

        } catch (error) {
            res.status(500).json({
                service: 'WebSocket Gateway',
                status: 'error',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
}

module.exports = { HealthController };
