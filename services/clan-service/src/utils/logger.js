/**
 * Logger utility for clan service
 */

const logLevels = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
};

const currentLogLevel = process.env.LOG_LEVEL || 'INFO';
const levelValue = logLevels[currentLogLevel] || logLevels.INFO;

class Logger {
    constructor() {
        this.serviceName = 'Clan Service';
    }

    formatMessage(level, message, data = {}) {
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [${this.serviceName}] [${level}]`;
        
        if (Object.keys(data).length > 0) {
            return `${prefix} ${message} ${JSON.stringify(data)}`;
        }
        
        return `${prefix} ${message}`;
    }

    error(message, data = {}) {
        if (levelValue >= logLevels.ERROR) {
            console.error(this.formatMessage('ERROR', message, data));
        }
    }

    warn(message, data = {}) {
        if (levelValue >= logLevels.WARN) {
            console.warn(this.formatMessage('WARN', message, data));
        }
    }

    info(message, data = {}) {
        if (levelValue >= logLevels.INFO) {
            console.info(this.formatMessage('INFO', message, data));
        }
    }

    debug(message, data = {}) {
        if (levelValue >= logLevels.DEBUG) {
            console.debug(this.formatMessage('DEBUG', message, data));
        }
    }

    // Specialized logging methods
    logConnection(userId, clanId, action = 'connected') {
        this.info(`User ${action} to clan chat`, { userId, clanId, action });
    }

    logMessage(userId, clanId, messageType = 'TEXT') {
        this.debug('Message processed', { userId, clanId, messageType });
    }

    logError(operation, error, context = {}) {
        this.error(`Error in ${operation}`, { 
            operation, 
            error: error.message, 
            stack: error.stack,
            ...context 
        });
    }
}

module.exports = new Logger();

