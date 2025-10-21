const rateLimit = require('express-rate-limit');

// Rate limiting middleware
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
    message: {
        success: false,
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Stricter rate limiting for payment endpoints
const paymentLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // Very restrictive for payments
    message: {
        success: false,
        error: 'Too many payment attempts',
        retryAfter: '5 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Request logging middleware
const requestLogger = (req, res, next) => {
    if (process.env.ENABLE_REQUEST_LOGGING === 'true') {
        const timestamp = new Date().toISOString();
        console.log(`${timestamp} ${req.method} ${req.path} - ${req.ip}`);
    }
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
            role: userRoles ? userRoles.split(',')[0] : 'USER'
        };
    } else {
        // For direct service access or development, use anonymous user
        req.user = {
            id: 'anonymous',
            email: 'anonymous@example.com',
            roles: ['anonymous'],
            isAdmin: false,
            role: 'ANONYMOUS'
        };
    }

    next();
};

// Authorization middleware for protected routes
const requireAuth = (req, res, next) => {
    if (!req.user || req.user.id === 'anonymous') {
        return res.status(401).json({
            success: false,
            error: 'Authentication required',
            message: 'Please provide valid authentication credentials',
            code: 'MISSING_AUTH',
            timestamp: new Date().toISOString()
        });
    }
    next();
};

// Admin authorization middleware
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({
            success: false,
            error: 'Admin access required',
            message: 'This endpoint requires administrative privileges',
            code: 'INSUFFICIENT_PERMISSIONS',
            timestamp: new Date().toISOString()
        });
    }
    next();
};

// Ownership verification middleware (for wallet operations)
const requireOwnership = (req, res, next) => {
    const targetUserId = req.params.userId || req.body.userId;

    if (!req.user || (req.user.id !== targetUserId && !req.user.isAdmin)) {
        return res.status(403).json({
            success: false,
            error: 'Access denied',
            message: 'You can only access your own credit wallet',
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
    console.error('💥 Credit Service Error:', error.message);
    console.error('Stack trace:', error.stack);

    // Prisma errors
    if (error.code === 'P2002') {
        return res.status(400).json({
            success: false,
            error: 'Duplicate entry',
            message: 'This record already exists',
            code: 'DUPLICATE_ENTRY',
            timestamp: new Date().toISOString()
        });
    }

    if (error.code === 'P2025') {
        return res.status(404).json({
            success: false,
            error: 'Record not found',
            message: 'The requested record does not exist',
            code: 'NOT_FOUND',
            timestamp: new Date().toISOString()
        });
    }

    // Validation errors
    if (error.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            message: error.message,
            code: 'VALIDATION_ERROR',
            timestamp: new Date().toISOString()
        });
    }

    // Default error
    res.status(error.status || 500).json({
        success: false,
        error: error.message || 'Internal server error',
        message: 'An unexpected error occurred',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
    });
};

// 404 handler
const notFoundHandler = (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        message: `The endpoint ${req.method} ${req.path} does not exist`,
        availableEndpoints: [
            'GET /health',
            'POST /credits/purchase',
            'POST /credits/boost-profile',
            'POST /credits/boost-gig',
            'POST /credits/boost-clan',
            'POST /credits/clan-contribute',
            'GET /credits/wallet',
            'GET /credits/transactions',
            'GET /credits/packages',
            'GET /credits/public/packages'
        ],
        timestamp: new Date().toISOString()
    });
};

module.exports = {
    limiter,
    paymentLimiter,
    requestLogger,
    userContext,
    requireAuth,
    requireAdmin,
    requireOwnership,
    asyncHandler,
    errorHandler,
    notFoundHandler
};
