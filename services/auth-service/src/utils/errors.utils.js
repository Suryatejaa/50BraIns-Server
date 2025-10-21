/**
 * Custom error classes for better error handling
 */

class AppError extends Error {
    constructor(message, statusCode, code = null) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

class ValidationError extends AppError {
    constructor(message) {
        super(message, 400, 'VALIDATION_ERROR');
    }
}

class AuthError extends AppError {
    constructor(message) {
        super(message, 401, 'AUTH_ERROR');
    }
}

class ForbiddenError extends AppError {
    constructor(message) {
        super(message, 403, 'FORBIDDEN_ERROR');
    }
}

class NotFoundError extends AppError {
    constructor(message) {
        super(message, 404, 'NOT_FOUND_ERROR');
    }
}

class ConflictError extends AppError {
    constructor(message) {
        super(message, 409, 'CONFLICT_ERROR');
    }
}

class RateLimitError extends AppError {
    constructor(message = 'Too many requests') {
        super(message, 429, 'RATE_LIMIT_ERROR');
    }
}

class InternalServerError extends AppError {
    constructor(message = 'Internal server error') {
        super(message, 500, 'INTERNAL_SERVER_ERROR');
    }
}

class DatabaseError extends AppError {
    constructor(message = 'Database error') {
        super(message, 500, 'DATABASE_ERROR');
    }
}

class ExternalServiceError extends AppError {
    constructor(message = 'External service error') {
        super(message, 502, 'EXTERNAL_SERVICE_ERROR');
    }
}

/**
 * Error response formatter
 */
const formatErrorResponse = (error, req = null) => {
    const response = {
        success: false,
        error: {
            message: error.message,
            code: error.code || 'UNKNOWN_ERROR',
            timestamp: new Date().toISOString()
        }
    };

    // Add request ID if available
    if (req && req.id) {
        response.error.requestId = req.id;
    }

    // Add stack trace in development
    if (process.env.NODE_ENV === 'development') {
        response.error.stack = error.stack;
    }

    // Add validation details for validation errors
    if (error.details) {
        response.error.details = error.details;
    }

    return response;
};

/**
 * Check if error is operational (known/expected error)
 */
const isOperationalError = (error) => {
    if (error instanceof AppError) {
        return error.isOperational;
    }
    return false;
};

/**
 * Handle Prisma errors
 */
const handlePrismaError = (error) => {
    if (error.code === 'P2002') {
        // Unique constraint violation
        const field = error.meta?.target?.[0] || 'field';
        return new ConflictError(`${field} already exists`);
    }

    if (error.code === 'P2025') {
        // Record not found
        return new NotFoundError('Record not found');
    }

    if (error.code === 'P2003') {
        // Foreign key constraint violation
        return new ValidationError('Related record not found');
    }

    if (error.code === 'P2014') {
        // Required relation violation
        return new ValidationError('Required relation missing');
    }

    // Generic database error
    return new DatabaseError('Database operation failed');
};

/**
 * Handle JWT errors
 */
const handleJWTError = (error) => {
    if (error.name === 'JsonWebTokenError') {
        return new AuthError('Invalid token');
    }

    if (error.name === 'TokenExpiredError') {
        return new AuthError('Token expired');
    }

    if (error.name === 'NotBeforeError') {
        return new AuthError('Token not active');
    }

    return new AuthError('Token error');
};

/**
 * Handle async errors
 */
const catchAsync = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * Send error response and log error details
 */
const sendErrorResponse = (error, req, res) => {
    // Log error stack and details for debugging
    if (error && error.stack) {
        console.error('Auth controller error stack:', error.stack);
    }
    try { console.error('Auth controller error details:', JSON.stringify(error)); } catch { }
    // Use formatErrorResponse for consistent error output
    const response = formatErrorResponse(error, req);
    res.status(error.statusCode || 500).json(response);
};

module.exports = {
    AppError,
    ValidationError,
    AuthError,
    ForbiddenError,
    NotFoundError,
    ConflictError,
    RateLimitError,
    InternalServerError,
    DatabaseError,
    ExternalServiceError,
    formatErrorResponse,
    isOperationalError,
    handlePrismaError,
    handleJWTError,
    catchAsync,
    sendErrorResponse // export the new function
};
