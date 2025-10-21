const logger = require('../utils/logger');
const config = require('../config');

// Custom error class for API errors
class APIError extends Error {
    constructor(message, statusCode = 500, code = null, details = null) {
        super(message);
        this.name = 'APIError';
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

// Validation error handler
function handleValidationError(error) {
    const errors = {};

    if (error.details) {
        error.details.forEach(detail => {
            const key = detail.path.join('.');
            errors[key] = detail.message;
        });
    }

    return new APIError(
        'Validation failed',
        400,
        'VALIDATION_ERROR',
        errors
    );
}

// Database error handler
function handleDatabaseError(error) {
    if (error.code === 11000) {
        // Duplicate key error
        const field = Object.keys(error.keyValue)[0];
        return new APIError(
            `${field} already exists`,
            409,
            'DUPLICATE_ENTRY'
        );
    }

    if (error.name === 'CastError') {
        return new APIError(
            'Invalid ID format',
            400,
            'INVALID_ID'
        );
    }

    return new APIError(
        'Database operation failed',
        500,
        'DATABASE_ERROR'
    );
}

// JWT error handler
function handleJWTError(error) {
    if (error.name === 'JsonWebTokenError') {
        return new APIError(
            'Invalid token',
            401,
            'INVALID_TOKEN'
        );
    }

    if (error.name === 'TokenExpiredError') {
        return new APIError(
            'Token expired',
            401,
            'TOKEN_EXPIRED'
        );
    }

    return new APIError(
        'Authentication failed',
        401,
        'AUTH_ERROR'
    );
}

// Rate limit error handler
function handleRateLimitError(error) {
    return new APIError(
        'Too many requests',
        429,
        'RATE_LIMIT_EXCEEDED',
        {
            retryAfter: error.retryAfter || 60
        }
    );
}

// Proxy error handler
function handleProxyError(error, serviceName) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        return new APIError(
            `${serviceName} service is unavailable`,
            503,
            'SERVICE_UNAVAILABLE'
        );
    }

    if (error.code === 'ETIMEDOUT') {
        return new APIError(
            `${serviceName} service timeout`,
            504,
            'SERVICE_TIMEOUT'
        );
    }

    return new APIError(
        `${serviceName} service error`,
        502,
        'SERVICE_ERROR'
    );
}

// Main error handling middleware
function errorHandler(error, req, res, next) {
    let err = error;

    // Log the error
    logger.logError(err, req);

    // Handle different types of errors
    if (err.name === 'ValidationError') {
        err = handleValidationError(err);
    } else if (err.name === 'MongoError' || err.name === 'MongoServerError') {
        err = handleDatabaseError(err);
    } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        err = handleJWTError(err);
    } else if (err.name === 'RateLimitError') {
        err = handleRateLimitError(err);
    } else if (err.isProxyError) {
        err = handleProxyError(err, err.serviceName);
    }

    // Ensure we have an APIError
    if (!(err instanceof APIError)) {
        err = new APIError(
            config.nodeEnv === 'production' ? 'Something went wrong' : err.message,
            err.statusCode || err.status || 500,
            err.code || 'INTERNAL_ERROR'
        );
    }

    // Prepare error response
    const errorResponse = {
        error: getErrorTitle(err.statusCode),
        message: err.message,
        code: err.code,
        requestId: req.requestId,
        timestamp: new Date().toISOString()
    };

    // Add details in development or for client errors
    if (config.nodeEnv !== 'production' || err.statusCode < 500) {
        if (err.details) {
            errorResponse.details = err.details;
        }

        // Add stack trace in development
        if (config.nodeEnv === 'development') {
            errorResponse.stack = err.stack;
        }
    }

    // Add retry information for certain errors
    if (err.statusCode === 429 && err.details && err.details.retryAfter) {
        res.setHeader('Retry-After', err.details.retryAfter);
        errorResponse.retryAfter = err.details.retryAfter;
    }

    if (err.statusCode === 503) {
        res.setHeader('Retry-After', 30);
        errorResponse.retryAfter = 30;
    }

    // Send error response
    res.status(err.statusCode).json(errorResponse);
}

// Get error title based on status code
function getErrorTitle(statusCode) {
    const errorTitles = {
        400: 'Bad Request',
        401: 'Unauthorized',
        403: 'Forbidden',
        404: 'Not Found',
        405: 'Method Not Allowed',
        409: 'Conflict',
        422: 'Unprocessable Entity',
        429: 'Too Many Requests',
        500: 'Internal Server Error',
        502: 'Bad Gateway',
        503: 'Service Unavailable',
        504: 'Gateway Timeout'
    };

    return errorTitles[statusCode] || 'Error';
}

// Async error wrapper
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

// 404 handler
function notFoundHandler(req, res, next) {
    const error = new APIError(
        `Route ${req.method} ${req.originalUrl} not found`,
        404,
        'ROUTE_NOT_FOUND'
    );

    next(error);
}

// Graceful shutdown error handler
function handleGracefulShutdown(error) {
    logger.error('Graceful shutdown due to error:', error);

    // Give ongoing requests time to complete
    setTimeout(() => {
        process.exit(1);
    }, 5000);
}

// Uncaught exception handler
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    handleGracefulShutdown(error);
});

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    handleGracefulShutdown(reason);
});

module.exports = {
    errorHandler,
    notFoundHandler,
    asyncHandler,
    APIError
};
