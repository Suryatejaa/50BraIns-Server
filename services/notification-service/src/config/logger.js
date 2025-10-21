/**
 * Winston Logger Configuration for Clan Service
 * Provides structured logging with daily rotation and different log levels
 */

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
        let logMessage = `${timestamp} [${level.toUpperCase()}] ${message}`;

        if (Object.keys(meta).length > 0) {
            logMessage += ` | ${JSON.stringify(meta)}`;
        }

        if (stack) {
            logMessage += `\n${stack}`;
        }

        return logMessage;
    })
);

// Create logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: 'clan-service' },
    transports: [
        // Console transport for development
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                logFormat
            )
        }),

        // File transport for all logs
        new DailyRotateFile({
            filename: path.join(process.env.LOG_FILE_PATH || './logs', 'clan-service-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: process.env.LOG_MAX_SIZE || '100m',
            maxFiles: process.env.LOG_MAX_FILES || '30d',
            level: 'info'
        }),

        // Separate file for errors
        new DailyRotateFile({
            filename: path.join(process.env.LOG_FILE_PATH || './logs', 'clan-service-error-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: process.env.LOG_MAX_SIZE || '100m',
            maxFiles: process.env.LOG_MAX_FILES || '30d',
            level: 'error'
        })
    ],

    // Handle exceptions and rejections
    exceptionHandlers: [
        new DailyRotateFile({
            filename: path.join(process.env.LOG_FILE_PATH || './logs', 'clan-service-exceptions-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '100m',
            maxFiles: '30d'
        })
    ],

    rejectionHandlers: [
        new DailyRotateFile({
            filename: path.join(process.env.LOG_FILE_PATH || './logs', 'clan-service-rejections-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '100m',
            maxFiles: '30d'
        })
    ]
});

// Helper functions for structured logging
logger.logRequest = (req, res, responseTime) => {
    const logData = {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`,
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress,
        userId: req.user?.id || 'anonymous'
    };

    if (res.statusCode >= 400) {
        logger.warn('HTTP Request', logData);
    } else {
        logger.info('HTTP Request', logData);
    }
};

logger.logDatabase = (operation, table, duration, error = null) => {
    const logData = {
        operation,
        table,
        duration: `${duration}ms`
    };

    if (error) {
        logger.error('Database Error', { ...logData, error: error.message });
    } else {
        logger.debug('Database Operation', logData);
    }
};

logger.logRabbitMQ = (action, queue, message, error = null) => {
    const logData = {
        action,
        queue,
        messageType: typeof message,
        timestamp: new Date().toISOString()
    };

    if (error) {
        logger.error('RabbitMQ Error', { ...logData, error: error.message });
    } else {
        logger.info('RabbitMQ Operation', logData);
    }
};

logger.logCache = (operation, key, hit = null, ttl = null) => {
    const logData = {
        operation,
        key,
        ...(hit !== null && { hit }),
        ...(ttl !== null && { ttl })
    };

    logger.debug('Cache Operation', logData);
};

module.exports = logger;
