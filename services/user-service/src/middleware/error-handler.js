// src/middleware/error-handler.js
const { StatusCodes } = require('http-status-codes');
const logger = require('../utils/logger');

// Base error class
class ApiError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

// Specific error types
class BadRequestError extends ApiError {
    constructor(message = 'Bad request') {
        super(message, StatusCodes.BAD_REQUEST);
    }
}

class NotFoundError extends ApiError {
    constructor(message = 'Resource not found') {
        super(message, StatusCodes.NOT_FOUND);
    }
}

class UnauthorizedError extends ApiError {
    constructor(message = 'Unauthorized') {
        super(message, StatusCodes.UNAUTHORIZED);
    }
}

class ForbiddenError extends ApiError {
    constructor(message = 'Forbidden') {
        super(message, StatusCodes.FORBIDDEN);
    }
}

class ConflictError extends ApiError {
    constructor(message = 'Conflict') {
        super(message, StatusCodes.CONFLICT);
    }
}

// Error handler middleware
const errorHandler = (err, req, res, next) => {
    // Log error
    logger.error(`${err.name || 'Error'}: ${err.message}`, {
        path: req.path,
        method: req.method,
        stack: err.stack,
        user: req.user ? req.user.id : 'unauthenticated'
    });

    // Known errors
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            success: false,
            error: err.status,
            message: err.message
        });
    }

    // Prisma errors
    if (err.name === 'PrismaClientKnownRequestError') {
        // Handle unique constraint violations
        if (err.code === 'P2002') {
            return res.status(StatusCodes.CONFLICT).json({
                success: false,
                error: 'Conflict',
                message: `A user with this ${err.meta.target[0]} already exists`
            });
        }

        // Handle not found errors
        if (err.code === 'P2025') {
            return res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                error: 'Not Found',
                message: 'Resource not found'
            });
        }
    }

    // Default to 500 server error
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Server Error',
        message: process.env.NODE_ENV === 'production'
            ? 'Something went wrong'
            : err.message || 'Something went wrong'
    });
};

module.exports = {
    ApiError,
    BadRequestError,
    NotFoundError,
    UnauthorizedError,
    ForbiddenError,
    ConflictError,
    errorHandler,
};
