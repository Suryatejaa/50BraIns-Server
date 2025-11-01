/**
 * Global Console Logger Utility
 * Compresses console.logs in production while preserving startup logs
 * Usage: Import and call setupGlobalConsoleCompression() at the top of index.js files
 */

const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;
const originalConsoleInfo = console.info;
const originalConsoleDebug = console.debug;

// Track if we're in startup phase (before server starts listening)
let isStartupPhase = true;
let startupEndMarked = false;

// Define startup keywords that should always be logged
const STARTUP_KEYWORDS = [
    '🔧', '🚀', '✅', '❌', '⚠️', '📡', '💾', '🔌', '🌐', '📊', '👋',
    'Starting', 'started', 'running', 'connected', 'listening',
    'initialization', 'Service', 'Gateway', 'Server', 'Port:',
    'Environment:', 'Health:', 'Time:', 'RabbitMQ', 'Database',
    'Redis', 'HTTP server', 'WebSocket', 'API Documentation'
];

// Define keywords that should be suppressed in production (method logs)
const METHOD_LOG_KEYWORDS = [
    'User logged in successfully',
    'Password changed for user',
    'Username updated for user',
    'Email updated for user',
    'OTP generated and stored',
    'JWT Secret:',
    'Data from userData:',
    'Registering user with data:',
    'User registered:',
    'Refresh Token Debug:',
    'No refresh token found',
    'Published event to',
    'Event publish failed',
    'Received event:',
    'Handling event:',
    'Processing event:',
    'Event processed successfully',
    'Notification processed',
    'Score updated',
    'Cache invalidated',
    'Sync completed'
];

// Service identification
let serviceName = 'Unknown Service';
let servicePort = 'Unknown Port';

/**
 * Check if log should be shown during startup phase
 */
function shouldShowInStartup(message) {
    if (!isStartupPhase && !startupEndMarked) return false;

    const messageStr = String(message);
    return STARTUP_KEYWORDS.some(keyword =>
        messageStr.includes(keyword) ||
        messageStr.toLowerCase().includes(keyword.toLowerCase())
    );
}

/**
 * Check if log should be compressed in production (method logs)
 */
function shouldCompressInProduction(message) {
    if (process.env.NODE_ENV !== 'production') return false;
    if (isStartupPhase || !startupEndMarked) return false;

    const messageStr = String(message);
    return METHOD_LOG_KEYWORDS.some(keyword =>
        messageStr.includes(keyword) ||
        messageStr.toLowerCase().includes(keyword.toLowerCase())
    );
}

/**
 * Create compressed log message
 */
function createCompressedLog(level, args) {
    const timestamp = new Date().toISOString().substr(11, 8); // HH:mm:ss
    const message = args.join(' ');
    const truncated = message.length > 100 ? message.substr(0, 97) + '...' : message;
    return `[${timestamp}][${level.toUpperCase()}][${serviceName}] ${truncated}`;
}

/**
 * Enhanced console.log with production compression
 */
function enhancedConsoleLog(...args) {
    const message = args.join(' ');

    // Always show startup logs
    if (shouldShowInStartup(message)) {
        originalConsoleLog(...args);
        return;
    }

    // Compress method logs in production
    if (shouldCompressInProduction(message)) {
        // Show compressed version
        originalConsoleLog(createCompressedLog('info', args));
        return;
    }

    // Show normal logs in development or non-method logs
    if (process.env.NODE_ENV !== 'production' || isStartupPhase) {
        originalConsoleLog(...args);
    }
}

/**
 * Enhanced console.warn with production compression
 */
function enhancedConsoleWarn(...args) {
    const message = args.join(' ');

    if (shouldShowInStartup(message) || process.env.NODE_ENV !== 'production') {
        originalConsoleWarn(...args);
    } else if (shouldCompressInProduction(message)) {
        originalConsoleLog(createCompressedLog('warn', args));
    } else {
        originalConsoleWarn(...args);
    }
}

/**
 * Enhanced console.error (always show errors)
 */
function enhancedConsoleError(...args) {
    originalConsoleError(...args);
}

/**
 * Enhanced console.info with production compression
 */
function enhancedConsoleInfo(...args) {
    const message = args.join(' ');

    if (shouldShowInStartup(message) || process.env.NODE_ENV !== 'production') {
        originalConsoleInfo(...args);
    } else if (shouldCompressInProduction(message)) {
        originalConsoleLog(createCompressedLog('info', args));
    } else {
        originalConsoleInfo(...args);
    }
}

/**
 * Enhanced console.debug (only show in development)
 */
function enhancedConsoleDebug(...args) {
    if (process.env.NODE_ENV !== 'production') {
        originalConsoleDebug(...args);
    }
}

/**
 * Mark the end of startup phase
 */
function markStartupEnd(serviceName_override, port_override) {
    if (serviceName_override) serviceName = serviceName_override;
    if (port_override) servicePort = port_override;

    isStartupPhase = false;
    startupEndMarked = true;

    if (process.env.NODE_ENV === 'production') {
        originalConsoleLog(`🔄 [${serviceName}] Production logging enabled - method logs compressed`);
    }
}

/**
 * Reset startup phase (for testing)
 */
function resetStartupPhase() {
    isStartupPhase = true;
    startupEndMarked = false;
}

/**
 * Setup global console compression
 */
function setupGlobalConsoleCompression(serviceNameParam = null, options = {}) {
    // Detect service name from package.json or process.cwd()
    if (!serviceNameParam) {
        try {
            const path = require('path');
            const fs = require('fs');
            const cwd = process.cwd();
            const packageJsonPath = path.join(cwd, 'package.json');

            if (fs.existsSync(packageJsonPath)) {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                serviceName = packageJson.name || path.basename(cwd);
            } else {
                serviceName = path.basename(cwd);
            }
        } catch (error) {
            serviceName = 'Unknown Service';
        }
    } else {
        serviceName = serviceNameParam;
    }

    // Override console methods
    console.log = enhancedConsoleLog;
    console.warn = enhancedConsoleWarn;
    console.error = enhancedConsoleError;
    console.info = enhancedConsoleInfo;
    console.debug = enhancedConsoleDebug;

    // Add utility functions to console object
    console.markStartupEnd = markStartupEnd;
    console.resetStartupPhase = resetStartupPhase;
    console.isProductionMode = () => process.env.NODE_ENV === 'production';
    console.getServiceInfo = () => ({ serviceName, servicePort, isStartupPhase, startupEndMarked });

    // Log setup
    if (process.env.NODE_ENV === 'production') {
        originalConsoleLog(`🔧 [${serviceName}] Global console compression enabled for production`);
        originalConsoleLog(`🔧 [${serviceName}] Startup logs: ENABLED | Method logs: COMPRESSED`);
    } else {
        originalConsoleLog(`🔧 [${serviceName}] Global console compression setup (development mode - all logs enabled)`);
    }

    return {
        markStartupEnd,
        resetStartupPhase,
        isStartupPhase: () => isStartupPhase,
        serviceName: () => serviceName,
        original: {
            log: originalConsoleLog,
            warn: originalConsoleWarn,
            error: originalConsoleError,
            info: originalConsoleInfo,
            debug: originalConsoleDebug
        }
    };
}

/**
 * Restore original console methods
 */
function restoreOriginalConsole() {
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
    console.info = originalConsoleInfo;
    console.debug = originalConsoleDebug;

    // Remove utility functions
    delete console.markStartupEnd;
    delete console.resetStartupPhase;
    delete console.isProductionMode;
    delete console.getServiceInfo;

    originalConsoleLog('🔄 Original console methods restored');
}

module.exports = {
    setupGlobalConsoleCompression,
    restoreOriginalConsole,
    markStartupEnd,
    resetStartupPhase,
    STARTUP_KEYWORDS,
    METHOD_LOG_KEYWORDS
};