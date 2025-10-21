/**
 * Error Handler Middleware
 * Centralized error handling for the Clan Service
 */

const logger = require('../config/logger');

// Custom error classes
class AppError extends Error {
    constructor(message, statusCode, errorCode = null) {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

class ValidationError extends AppError {
    constructor(message, details = null) {
        super(message, 400, 'VALIDATION_ERROR');
        this.details = details;
    }
}

class NotFoundError extends AppError {
    constructor(resource) {
        super(`${resource} not found`, 404, 'NOT_FOUND');
    }
}

class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized access') {
        super(message, 401, 'UNAUTHORIZED');
    }
}

class ForbiddenError extends AppError {
    constructor(message = 'Forbidden access') {
        super(message, 403, 'FORBIDDEN');
    }
}

class ConflictError extends AppError {
    constructor(message) {
        super(message, 409, 'CONFLICT');
    }
}

// Error handler middleware
function errorHandler(error, req, res, next) {
    let statusCode = 500;
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let message = 'Internal server error';
    let details = null;

    // Handle known error types
    if (error.isOperational) {
        statusCode = error.statusCode;
        errorCode = error.errorCode;
        message = error.message;
        details = error.details;
    } else if (error.name === 'ValidationError') {
        statusCode = 400;
        errorCode = 'VALIDATION_ERROR';
        message = 'Validation failed';
        details = error.details || error.message;
    } else if (error.name === 'PrismaClientKnownRequestError') {
        // Handle Prisma errors
        statusCode = 400;
        errorCode = 'DATABASE_ERROR';

        switch (error.code) {
            case 'P2002':
                message = 'A record with this data already exists';
                errorCode = 'DUPLICATE_ENTRY';
                statusCode = 409;
                break;
            case 'P2025':
                message = 'Record not found';
                errorCode = 'NOT_FOUND';
                statusCode = 404;
                break;
            case 'P2003':
                message = 'Foreign key constraint failed';
                errorCode = 'CONSTRAINT_ERROR';
                break;
            default:
                message = 'Database operation failed';
        }
    } else if (error.name === 'JsonWebTokenError') {
        statusCode = 401;
        errorCode = 'INVALID_TOKEN';
        message = 'Invalid authentication token';
    } else if (error.name === 'TokenExpiredError') {
        statusCode = 401;
        errorCode = 'TOKEN_EXPIRED';
        message = 'Authentication token has expired';
    } else if (error.name === 'CastError') {
        statusCode = 400;
        errorCode = 'INVALID_ID';
        message = 'Invalid ID format';
    } else if (error.name === 'MulterError') {
        statusCode = 400;
        errorCode = 'FILE_UPLOAD_ERROR';
        message = 'File upload failed';

        if (error.code === 'LIMIT_FILE_SIZE') {
            message = 'File size too large';
        } else if (error.code === 'LIMIT_FILE_COUNT') {
            message = 'Too many files';
        } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
            message = 'Unexpected file field';
        }
    }

    // Log error
    const errorInfo = {
        statusCode,
        errorCode,
        message,
        url: req.originalUrl,
        method: req.method,
        userId: req.user?.id || 'anonymous',
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress,
        timestamp: new Date().toISOString()
    };

    if (statusCode >= 500) {
        logger.error('Server Error', { ...errorInfo, stack: error.stack });
    } else {
        logger.warn('Client Error', errorInfo);
    }

    // Prepare response
    const response = {
        error: true,
        errorCode,
        message,
        timestamp: new Date().toISOString(),
        path: req.originalUrl
    };

    // Add details in development mode
    if (process.env.NODE_ENV === 'development') {
        response.details = details;
        if (statusCode >= 500) {
            response.stack = error.stack;
        }
    }

    // Add request ID if available
    if (req.requestId) {
        response.requestId = req.requestId;
    }

    res.status(statusCode).json(response);
}

// Async error wrapper
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

// 404 handler
function notFound(req, res, next) {
    const error = new NotFoundError(`Route ${req.originalUrl} not found`);
    next(error);
}

module.exports = {
    errorHandler,
    asyncHandler,
    notFound,
    AppError,
    ValidationError,
    NotFoundError,
    UnauthorizedError,
    ForbiddenError,
    ConflictError
};
