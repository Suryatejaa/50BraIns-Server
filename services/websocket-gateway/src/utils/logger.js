/**
 * Logger utility for WebSocket Gateway Service
 */

class Logger {
    constructor() {
        this.logLevel = process.env.LOG_LEVEL || 'INFO';
        this.levels = {
            ERROR: 0,
            WARN: 1,
            INFO: 2,
            DEBUG: 3
        };
    }
    
    formatMessage(level, message, data = {}) {
        const timestamp = new Date().toISOString();
        const dataStr = Object.keys(data).length > 0 ? ` ${JSON.stringify(data)}` : '';
        return `[${timestamp}] [WebSocket Gateway] [${level}] ${message}${dataStr}`;
    }
    
    shouldLog(level) {
        return this.levels[level] <= this.levels[this.logLevel];
    }
    
    logError(message, data = {}) {
        if (this.shouldLog('ERROR')) {
            console.error(this.formatMessage('ERROR', message, data));
        }
    }
    
    logWarn(message, data = {}) {
        if (this.shouldLog('WARN')) {
            console.warn(this.formatMessage('WARN', message, data));
        }
    }
    
    logInfo(message, data = {}) {
        if (this.shouldLog('INFO')) {
            console.info(this.formatMessage('INFO', message, data));
        }
    }
    
    logDebug(message, data = {}) {
        if (this.shouldLog('DEBUG')) {
            console.debug(this.formatMessage('DEBUG', message, data));
        }
    }
    
    // Specialized logging methods
    logConnection(message, data = {}) {
        this.logInfo(`🔌 ${message}`, data);
    }
    
    logMessage(message, data = {}) {
        this.logInfo(`💬 ${message}`, data);
    }
}

module.exports = new Logger();
