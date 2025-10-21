const winston = require('winston');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;

        if (Object.keys(meta).length > 0) {
            log += ` ${JSON.stringify(meta)}`;
        }

        return log;
    })
);

// Console format for development
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let log = `${timestamp} ${level}: ${message}`;

        if (Object.keys(meta).length > 0) {
            log += ` ${JSON.stringify(meta, null, 2)}`;
        }

        return log;
    })
);

// Create logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: {
        service: 'notification-service',
        version: '1.0.0'
    },
    transports: [
        // Error log file
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),

        // Combined log file
        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),

        // Notification-specific logs
        new winston.transports.File({
            filename: path.join(logsDir, 'notifications.log'),
            level: 'info',
            maxsize: 5242880, // 5MB
            maxFiles: 3,
        })
    ]
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: consoleFormat
    }));
}

// Add console transport for production with JSON format
if (process.env.NODE_ENV === 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.json()
    }));
}

// Helper methods for notification-specific logging
logger.notification = (action, data) => {
    logger.info(`📬 ${action}`, {
        action,
        category: 'notification',
        ...data
    });
};

logger.email = (action, data) => {
    logger.info(`📧 ${action}`, {
        action,
        category: 'email',
        ...data
    });
};

logger.rabbitmq = (action, data) => {
    logger.info(`🐰 ${action}`, {
        action,
        category: 'rabbitmq',
        ...data
    });
};

logger.database = (action, data) => {
    logger.info(`🗄️ ${action}`, {
        action,
        category: 'database',
        ...data
    });
};

module.exports = logger;
