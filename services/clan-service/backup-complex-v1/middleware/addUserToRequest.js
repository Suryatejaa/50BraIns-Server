/**
 * Add User to Request Middleware
 * Extracts user information from API Gateway headers and adds to req.user
 * This replaces the need for JWT authentication middleware since API Gateway handles auth
 */

const logger = require('../config/logger');

module.exports = (req, res, next) => {
    try {
        // Extract user information from headers set by API Gateway
        const userId = req.headers['x-user-id'];
        const userEmail = req.headers['x-user-email'];
        const userRoles = req.headers['x-user-roles'];

        if (userId) {
            // Parse user information
            req.user = {
                id: userId,
                email: userEmail || null,
                roles: userRoles ? userRoles.split(',') : [],
                isAuthenticated: true
            };

            // Add convenience methods
            req.user.hasRole = (role) => req.user.roles.includes(role);
            req.user.isAdmin = () => req.user.roles.includes('admin') || req.user.roles.includes('superadmin');
            req.user.isSuperAdmin = () => req.user.roles.includes('superadmin');

            logger.debug('User context added to request', {
                userId: req.user.id,
                roles: req.user.roles,
                endpoint: req.originalUrl
            });
        } else {
            // No user information available (public endpoint or gateway bypass)
            req.user = {
                id: null,
                email: null,
                roles: [],
                isAuthenticated: false,
                hasRole: () => false,
                isAdmin: () => false,
                isSuperAdmin: () => false
            };
        }

        next();
    } catch (error) {
        logger.error('Error processing user context:', error);

        // Set default user context on error
        req.user = {
            id: null,
            email: null,
            roles: [],
            isAuthenticated: false,
            hasRole: () => false,
            isAdmin: () => false,
            isSuperAdmin: () => false
        };

        next();
    }
};
