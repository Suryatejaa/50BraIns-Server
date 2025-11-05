const winston = require('winston');
const path = require('path');

const NODE_ENV = process.env.NODE_ENV || 'development';

// Define log levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

// Define colors for each level
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
};

// Add colors to winston
winston.addColors(colors);

// Define log format
const format = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.errors({ stack: true }),
    winston.format.colorize({ all: true }),
    winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}`
    )
);

// Define log format for files (no colors)
const fileFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Define which logs to show based on environment
const level = () => {
    return NODE_ENV === 'development' ? 'debug' : 'warn';
};

// Create transports array
const transports = [
    // Console transport
    new winston.transports.Console({
        level: level(),
        format: format,
        silent: NODE_ENV === 'test' // Don't log during tests
    }),
];

// Add file transports for production
if (NODE_ENV === 'production') {
    transports.push(
        // Error log file
        new winston.transports.File({
            filename: path.join(process.cwd(), 'logs', 'error.log'),
            level: 'error',
            format: fileFormat,
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        // Combined log file
        new winston.transports.File({
            filename: path.join(process.cwd(), 'logs', 'combined.log'),
            format: fileFormat,
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        })
    );
}

// Create logger instance
const logger = winston.createLogger({
    level: level(),
    levels,
    format: fileFormat,
    transports,
    // Handle uncaught exceptions and unhandled rejections
    exceptionHandlers: [
        new winston.transports.File({
            filename: path.join(process.cwd(), 'logs', 'exceptions.log')
        }),
    ],
    rejectionHandlers: [
        new winston.transports.File({
            filename: path.join(process.cwd(), 'logs', 'rejections.log')
        }),
    ],
    exitOnError: false,
});

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Add helper methods
logger.logError = (error, req = null) => {
    const errorInfo = {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
    };

    if (req) {
        errorInfo.request = {
            method: req.method,
            url: req.originalUrl,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            userId: req.user?.id || 'anonymous',
        };
    }

    logger.error(JSON.stringify(errorInfo));
};

logger.logActivity = (action, userId, details = {}) => {
    logger.info(`Activity: ${action}`, {
        userId,
        action,
        details,
        timestamp: new Date().toISOString(),
    });
};

logger.logSecurity = (event, req, details = {}) => {
    logger.warn(`Security Event: ${event}`, {
        event,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id || 'anonymous',
        url: req.originalUrl,
        details,
        timestamp: new Date().toISOString(),
    });
};

module.exports = logger;
