const logger = require('../utils/logger.utils');

class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

const handleDuplicateFieldsDB = (err) => {
    if (err.code === 'P2002') {
        // Prisma unique constraint error
        const field = err.meta?.target?.[0] || 'field';
        const message = `Duplicate ${field}. Please use another value!`;
        return new AppError(message, 400);
    }

    if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0] || 'field';
        const message = `Duplicate ${field}. Please use another value!`;
        return new AppError(message, 400);
    }

    return new AppError('Duplicate field error', 400);
};

const handleValidationErrorDB = (err) => {
    if (err.code === 'P2000') {
        return new AppError('The provided value is too long for the field', 400);
    }
    if (err.code === 'P2001') {
        return new AppError('Record not found', 404);
    }
    if (err.code === 'P2003') {
        return new AppError('Foreign key constraint failed', 400);
    }
    if (err.code === 'P2025') {
        return new AppError('Record not found', 404);
    }

    const message = err.message || 'Invalid input data';
    return new AppError(message, 400);
};

const handleJWTError = () =>
    new AppError('Invalid token. Please log in again!', 401);

const handleJWTExpiredError = () =>
    new AppError('Your token has expired! Please log in again.', 401);

const sendErrorDev = (err, res) => {
    res.status(err.statusCode).json({
        success: false,
        error: err,
        message: err.message,
        stack: err.stack
    });
};

const sendErrorProd = (err, res) => {
    // Operational, trusted error: send message to client
    if (err.isOperational || err instanceof AppError) {
        res.status(err.statusCode).json({
            success: false,
            error: err.message
        });
    } else {
        // Programming or other unknown error: don't leak error details
        logger.error('ERROR 💥', err);
        res.status(500).json({
            success: false,
            error: 'Something went wrong!'
        });
    }
};

const errorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || err.status || 500;

    logger.error('Error occurred:', {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id
    });

    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, res);
    } else if (process.env.NODE_ENV === 'test' && err.statusCode === 500) {
        // Surface error details in test mode for 500 errors
        res.status(500).json({
            success: false,
            error: err.message,
            stack: err.stack,
            details: err.details || undefined
        });
    } else {
        let error = { ...err };
        error.message = err.message;

        if (error.code === 11000 || error.code === 'P2002') error = handleDuplicateFieldsDB(error);
        if (error.name === 'ValidationError' || error.code?.startsWith('P2')) error = handleValidationErrorDB(error);
        if (error.name === 'JsonWebTokenError') error = handleJWTError();
        if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

        sendErrorProd(error, res);
    }
};

const notFound = (req, res, next) => {
    const err = new AppError(`Not found - ${req.originalUrl}`, 404);
    next(err);
};

module.exports = { AppError, errorHandler, notFound };
