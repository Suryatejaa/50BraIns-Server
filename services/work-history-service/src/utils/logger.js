const winston = require('winston');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.prettyPrint()
);

// Create logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: 'work-history-service' },
    transports: [
        // Error log file
        new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
            tailable: true
        }),

        // Combined log file
        new winston.transports.File({
            filename: path.join(logDir, 'combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
            tailable: true
        }),

        // Audit log for important events
        new winston.transports.File({
            filename: path.join(logDir, 'audit.log'),
            level: 'info',
            maxsize: 5242880, // 5MB
            maxFiles: 10,
            tailable: true,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            )
        })
    ]
});

// Add console logging in development
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
            winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
                const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
                return `${timestamp} [${service}] ${level}: ${message} ${metaStr}`;
            })
        )
    }));
}

// Helper function to safely serialize errors
function safeErrorSerialization(error) {
    if (!error) return null;

    const serialized = {
        message: error.message,
        name: error.name,
        stack: error.stack
    };

    // Add axios-specific error details if available
    if (error.response) {
        serialized.status = error.response.status;
        serialized.statusText = error.response.statusText;
        serialized.url = error.config?.url;
        serialized.method = error.config?.method;
    } else if (error.request) {
        serialized.url = error.config?.url;
        serialized.method = error.config?.method;
        serialized.code = error.code;
    }

    return serialized;
}

// Helper functions for specific log types
logger.auditLog = (action, userId, data = {}) => {
    logger.info('AUDIT', {
        action,
        userId,
        timestamp: new Date().toISOString(),
        ...data
    });
};

logger.errorWithContext = (message, error, context = {}) => {
    logger.error(message, {
        error: safeErrorSerialization(error),
        context,
        timestamp: new Date().toISOString()
    });
};

logger.performanceLog = (operation, duration, metadata = {}) => {
    logger.info('PERFORMANCE', {
        operation,
        duration,
        timestamp: new Date().toISOString(),
        ...metadata
    });
};

logger.securityLog = (event, userId, details = {}) => {
    logger.warn('SECURITY', {
        event,
        userId,
        timestamp: new Date().toISOString(),
        ...details
    });
};

logger.businessLog = (event, data = {}) => {
    logger.info('BUSINESS', {
        event,
        timestamp: new Date().toISOString(),
        ...data
    });
};

module.exports = logger;
