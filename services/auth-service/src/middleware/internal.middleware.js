const logger = require('../utils/logger');

/**
 * Middleware to authenticate internal service requests
 * Validates the X-Internal-Service header
 */
const internalServiceAuth = (req, res, next) => {
    try {
        const internalServiceHeader = req.headers['x-internal-service'];

        // List of allowed internal services
        const allowedServices = [
            'user-service',
            'gig-service',
            'notification-service',
            'clan-service',
            'credit-service',
            'reputation-service',
            'social-media-service',
            'work-history-service',
            'admin-service'
        ];

        if (!internalServiceHeader) {
            logger.warn('Internal endpoint accessed without X-Internal-Service header');
            return res.status(401).json({
                success: false,
                error: 'Internal service authentication required'
            });
        }

        if (!allowedServices.includes(internalServiceHeader)) {
            logger.warn(`Internal endpoint accessed with invalid service: ${internalServiceHeader}`);
            return res.status(403).json({
                success: false,
                error: 'Invalid internal service'
            });
        }

        // Add the service name to the request for logging
        req.internalService = internalServiceHeader;

        logger.info(`Internal API access from: ${internalServiceHeader}`);
        next();
    } catch (error) {
        logger.error('Error in internal service authentication:', error);
        res.status(500).json({
            success: false,
            error: 'Internal authentication error'
        });
    }
};

module.exports = {
    internalServiceAuth
};