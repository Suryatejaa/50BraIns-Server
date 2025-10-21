const logger = require('./logger');

const errorHandler = (error, req, res, next) => {
    // Log the error
    logger.error('Express error handler:', {
        error: error.message,
        stack: error.stack,
        requestId: req.requestId,
        method: req.method,
        url: req.originalUrl,
        userAgent: req.get('User-Agent'),
        ip: req.ip
    });

    // Default error response
    let status = 500;
    let message = 'Internal Server Error';
    let details = null;

    // Handle specific error types
    if (error.name === 'ValidationError') {
        status = 400;
        message = 'Validation Error';
        details = error.details;
    } else if (error.name === 'UnauthorizedError') {
        status = 401;
        message = 'Unauthorized';
    } else if (error.name === 'ForbiddenError') {
        status = 403;
        message = 'Forbidden';
    } else if (error.name === 'NotFoundError') {
        status = 404;
        message = 'Not Found';
    } else if (error.name === 'ConflictError') {
        status = 409;
        message = 'Conflict';
    } else if (error.name === 'TooManyRequestsError') {
        status = 429;
        message = 'Too Many Requests';
    } else if (error.code === 'P2002') {
        // Prisma unique constraint violation
        status = 409;
        message = 'Duplicate record';
        details = 'A record with this information already exists';
    } else if (error.code === 'P2025') {
        // Prisma record not found
        status = 404;
        message = 'Record not found';
    } else if (error.message) {
        // Use the error message if available
        message = error.message;
    }

    // Don't expose internal errors in production
    if (process.env.NODE_ENV === 'production' && status === 500) {
        message = 'Internal Server Error';
        details = null;
    }

    // Send error response
    const errorResponse = {
        success: false,
        error: message,
        status,
        timestamp: new Date().toISOString(),
        requestId: req.requestId
    };

    if (details) {
        errorResponse.details = details;
    }

    // Add stack trace in development
    if (process.env.NODE_ENV === 'development' && error.stack) {
        errorResponse.stack = error.stack;
    }

    res.status(status).json(errorResponse);
};

// Custom error classes
class ValidationError extends Error {
    constructor(message, details = null) {
        super(message);
        this.name = 'ValidationError';
        this.details = details;
    }
}

class UnauthorizedError extends Error {
    constructor(message = 'Unauthorized') {
        super(message);
        this.name = 'UnauthorizedError';
    }
}

class ForbiddenError extends Error {
    constructor(message = 'Forbidden') {
        super(message);
        this.name = 'ForbiddenError';
    }
}

class NotFoundError extends Error {
    constructor(message = 'Not Found') {
        super(message);
        this.name = 'NotFoundError';
    }
}

class ConflictError extends Error {
    constructor(message = 'Conflict') {
        super(message);
        this.name = 'ConflictError';
    }
}

class TooManyRequestsError extends Error {
    constructor(message = 'Too Many Requests') {
        super(message);
        this.name = 'TooManyRequestsError';
    }
}

module.exports = {
    errorHandler,
    ValidationError,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    ConflictError,
    TooManyRequestsError
};
