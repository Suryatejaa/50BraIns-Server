/**
 * Request Logger Middleware
 * Logs all incoming HTTP requests with timing and user context
 */

const logger = require('../config/logger');

module.exports = (req, res, next) => {
    const startTime = Date.now();

    // Log request details
    const requestData = {
        method: req.method,
        url: req.originalUrl,
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress,
        timestamp: new Date().toISOString()
    };

    logger.info('Incoming Request', requestData);

    // Override res.end to capture response time
    const originalEnd = res.end;
    res.end = function (...args) {
        const responseTime = Date.now() - startTime;

        // Log response
        logger.logRequest(req, res, responseTime);

        originalEnd.apply(this, args);
    };

    next();
};
