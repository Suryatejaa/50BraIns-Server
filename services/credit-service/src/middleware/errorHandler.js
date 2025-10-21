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

    // JWT errors
    if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            error: 'Invalid token',
            message: 'The provided authentication token is invalid',
            code: 'INVALID_TOKEN',
            timestamp: new Date().toISOString()
        });
    }

    if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            error: 'Token expired',
            message: 'The authentication token has expired',
            code: 'TOKEN_EXPIRED',
            timestamp: new Date().toISOString()
        });
    }

    // Payment gateway errors
    if (error.type === 'PAYMENT_ERROR') {
        return res.status(402).json({
            success: false,
            error: 'Payment processing failed',
            message: error.message,
            code: 'PAYMENT_FAILED',
            timestamp: new Date().toISOString()
        });
    }

    // External service errors
    if (error.type === 'EXTERNAL_SERVICE_ERROR') {
        return res.status(503).json({
            success: false,
            error: 'External service unavailable',
            message: 'A required external service is currently unavailable',
            code: 'SERVICE_UNAVAILABLE',
            timestamp: new Date().toISOString()
        });
    }

    // Default error
    res.status(error.status || error.statusCode || 500).json({
        success: false,
        error: error.message || 'Internal server error',
        message: 'An unexpected error occurred',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
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
            'GET /api/credits/wallet',
            'GET /api/credits/transactions',
            'GET /api/credits/boosts',
            'POST /api/credits/purchase',
            'POST /api/credits/confirm-payment',
            'POST /api/credits/boost/profile',
            'POST /api/credits/boost/gig',
            'POST /api/credits/boost/clan',
            'POST /api/credits/contribute/clan'
        ],
        timestamp: new Date().toISOString()
    });
};

module.exports = {
    errorHandler,
    notFoundHandler
};
