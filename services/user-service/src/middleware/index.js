const rateLimit = require('express-rate-limit');

// Rate limiting middleware
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000,
    message: { error: 'Too many requests from this IP' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Request logging middleware
const requestLogger = (req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} ${req.method} ${req.path} - ${req.ip}`);
    next();
};

// User context middleware (extracts user info from API Gateway headers)
const userContext = (req, res, next) => {
    const userId = req.headers['x-user-id'];
    const userEmail = req.headers['x-user-email'];
    const userRoles = req.headers['x-user-roles'];
    const isAdmin = req.headers['x-user-is-admin'];

    // If we have user headers from API Gateway, use them
    if (userId && userId !== 'undefined') {
        req.user = {
            id: userId,
            email: userEmail || 'user@example.com',
            roles: userRoles ? userRoles.split(',') : ['user'],
            isAdmin: isAdmin === 'true',
            role: userRoles ? userRoles.split(',')[0] : 'USER' // For backward compatibility
        };
    } else {
        // Fallback for direct service access (development/testing)
        req.user = {
            id: 'anonymous',
            email: 'anonymous@example.com',
            roles: ['anonymous'],
            isAdmin: false,
            role: 'USER'
        };
    }

    next();
};

// Authorization middleware for protected routes
const requireAuth = (req, res, next) => {
    if (!req.user || !req.user.id || req.user.id === 'anonymous') {
        return res.status(401).json({
            success: false,
            error: 'Authentication required',
            timestamp: new Date().toISOString()
        });
    }
    next();
};

// Admin authorization middleware
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({
            success: false,
            error: 'Admin access required',
            timestamp: new Date().toISOString()
        });
    }
    next();
};

// Async handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Error handling middleware
const errorHandler = (error, req, res, next) => {
    console.error('💥 Error:', error.message);
    res.status(error.status || 500).json({
        success: false,
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString()
    });
};

// 404 handler
const notFoundHandler = (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.originalUrl,
        timestamp: new Date().toISOString()
    });
};

module.exports = {
    limiter,
    requestLogger,
    userContext,
    requireAuth,
    requireAdmin,
    asyncHandler,
    errorHandler,
    notFoundHandler
};
