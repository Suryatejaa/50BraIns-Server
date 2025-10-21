const winston = require('winston');
const path = require('path');
const fs = require('fs');
const config = require('../config');

// Create logs directory if it doesn't exist
if (config.logging.enableFileLogging) {
    const logDir = path.resolve(config.logging.logDirectory);
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
}

// Custom format for better readability
const customFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.prettyPrint()
);

// Console format for development
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({
        format: 'HH:mm:ss'
    }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let metaStr = '';
        if (Object.keys(meta).length > 0) {
            metaStr = ' ' + JSON.stringify(meta, null, 2);
        }
        return `${timestamp} [${level}]: ${message}${metaStr}`;
    })
);

// Create transports array
const transports = [];

// Console transport
transports.push(
    new winston.transports.Console({
        level: config.logging.level,
        format: config.nodeEnv === 'production' ? customFormat : consoleFormat,
        handleExceptions: true,
        handleRejections: true
    })
);

// File transports (if enabled)
if (config.logging.enableFileLogging) {
    // Combined log file
    transports.push(
        new winston.transports.File({
            filename: path.join(config.logging.logDirectory, 'combined.log'),
            level: 'info',
            format: customFormat,
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 5,
            tailable: true
        })
    );

    // Error log file
    transports.push(
        new winston.transports.File({
            filename: path.join(config.logging.logDirectory, 'error.log'),
            level: 'error',
            format: customFormat,
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 5,
            tailable: true
        })
    );

    // Access log file (for HTTP requests)
    transports.push(
        new winston.transports.File({
            filename: path.join(config.logging.logDirectory, 'access.log'),
            level: 'http',
            format: customFormat,
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 10,
            tailable: true
        })
    );
}

// Create logger instance
const logger = winston.createLogger({
    level: config.logging.level,
    format: customFormat,
    defaultMeta: {
        service: 'api-gateway',
        environment: config.nodeEnv,
        pid: process.pid
    },
    transports,
    exitOnError: false
});

// Stream interface for Morgan
logger.stream = {
    write: function (message) {
        logger.http(message.trim());
    }
};

// Helper methods
logger.logRequest = (req, res, duration) => {
    const logData = {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        requestId: req.requestId
    };

    if (res.statusCode >= 400) {
        logger.warn('HTTP Request', logData);
    } else {
        logger.http('HTTP Request', logData);
    }
};

logger.logError = (error, req = null) => {
    const logData = {
        error: error.message,
        stack: error.stack,
        status: error.status || error.statusCode || 500
    };

    if (req) {
        logData.method = req.method;
        logData.url = req.originalUrl;
        logData.ip = req.ip;
        logData.requestId = req.requestId;
        logData.userAgent = req.get('User-Agent');
    }

    logger.error('Application Error', logData);
};

logger.logServiceCall = (serviceName, method, url, duration, status) => {
    const logData = {
        service: serviceName,
        method,
        url,
        duration: `${duration}ms`,
        status
    };

    if (status >= 400) {
        logger.warn('Service Call Failed', logData);
    } else {
        logger.info('Service Call Success', logData);
    }
};

// Handle uncaught exceptions and rejections
logger.exceptions.handle(
    new winston.transports.Console({
        format: consoleFormat
    })
);

if (config.logging.enableFileLogging) {
    logger.exceptions.handle(
        new winston.transports.File({
            filename: path.join(config.logging.logDirectory, 'exceptions.log'),
            format: customFormat
        })
    );
}

module.exports = logger;
