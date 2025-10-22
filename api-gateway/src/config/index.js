require('dotenv').config();

const config = {
    // Server configuration
    port: parseInt(process.env.PORT, 10) || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    trustProxy: process.env.TRUST_PROXY === 'true' || process.env.NODE_ENV === 'production',

    // Clustering configuration
    enableClustering: process.env.ENABLE_CLUSTERING === 'true',
    maxClusters: parseInt(process.env.MAX_CLUSTERS, 10) || null,

    // CORS configuration
    cors: {
        allowedOrigins: process.env.CORS_ORIGINS
            ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
            : [
                'http://localhost:5173',
                'http://localhost:5174',
                'http://localhost:3001',
                'https://50brains.com',
                'https://www.50brains.com',
                'https://app.50brains.com'
            ],
        credentials: process.env.CORS_CREDENTIALS === 'true',
        allowNoOrigin: process.env.CORS_ALLOW_NO_ORIGIN === 'true',
        methods: process.env.CORS_METHODS
            ? process.env.CORS_METHODS.split(',').map(method => method.trim())
            : ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        allowedHeaders: process.env.CORS_ALLOWED_HEADERS
            ? process.env.CORS_ALLOWED_HEADERS.split(',').map(header => header.trim())
            : ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
        exposedHeaders: process.env.CORS_EXPOSED_HEADERS
            ? process.env.CORS_EXPOSED_HEADERS.split(',').map(header => header.trim())
            : ['Set-Cookie', 'X-Request-ID'],
        maxAge: parseInt(process.env.CORS_MAX_AGE, 10) || 86400 // 24 hours
    },

    // Rate limiting configuration - More permissive for development
    rateLimits: {
        global: {
            windowMs: parseInt(process.env.GLOBAL_RATE_LIMIT_WINDOW, 10) || 15 * 60 * 1000, // 15 minutes
            max: parseInt(process.env.GLOBAL_RATE_LIMIT_MAX, 10) || (process.env.NODE_ENV === 'production' ? 1000 : 50000) // Much higher for dev
        },
        auth: {
            windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW, 10) || 15 * 60 * 1000, // 15 minutes
            max: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || (process.env.NODE_ENV === 'production' ? 5 : 1000) // Much higher for dev
        },
        speedLimiter: {
            delayAfter: parseInt(process.env.SPEED_LIMITER_DELAY_AFTER, 10) || 100,
            delayMs: parseInt(process.env.SPEED_LIMITER_DELAY_MS, 10) || 500,
            maxDelayMs: parseInt(process.env.SPEED_LIMITER_MAX_DELAY, 10) || 20000
        }
    },

    // Request size limits
    requestLimits: {
        jsonLimit: process.env.JSON_LIMIT || '10mb',
        urlEncodedLimit: process.env.URL_ENCODED_LIMIT || '10mb'
    },    // Service configuration
    services: {
        auth: {
            name: 'auth-service',
            url: process.env.AUTH_SERVICE_URL || 'http://localhost:4001',
            timeout: parseInt(process.env.AUTH_SERVICE_TIMEOUT, 10) || 30000,
            retries: parseInt(process.env.AUTH_SERVICE_RETRIES, 10) || 3,
            healthCheck: process.env.AUTH_SERVICE_HEALTH_CHECK || '/health'
        },
        user: {
            name: 'user-service',
            url: process.env.USER_SERVICE_URL || 'http://localhost:4002',
            timeout: parseInt(process.env.USER_SERVICE_TIMEOUT, 10) || 30000,
            retries: parseInt(process.env.USER_SERVICE_RETRIES, 10) || 3,
            healthCheck: process.env.USER_SERVICE_HEALTH_CHECK || '/health'
        },
        clan: {
            name: 'clan-service',
            url: process.env.CLAN_SERVICE_URL || 'http://localhost:4003',
            timeout: parseInt(process.env.CLAN_SERVICE_TIMEOUT, 10) || 30000,
            retries: parseInt(process.env.CLAN_SERVICE_RETRIES, 10) || 3,
            healthCheck: process.env.CLAN_SERVICE_HEALTH_CHECK || '/health'
        },
        gig: {
            name: 'gig-service',
            url: process.env.GIG_SERVICE_URL || 'http://localhost:4004',
            timeout: parseInt(process.env.GIG_SERVICE_TIMEOUT, 10) || 30000,
            retries: parseInt(process.env.GIG_SERVICE_RETRIES, 10) || 3,
            healthCheck: process.env.GIG_SERVICE_HEALTH_CHECK || '/health'
        },
        credit: {
            name: 'credit-service',
            url: process.env.CREDIT_SERVICE_URL || 'http://localhost:4005',
            timeout: parseInt(process.env.CREDIT_SERVICE_TIMEOUT, 10) || 30000,
            retries: parseInt(process.env.CREDIT_SERVICE_RETRIES, 10) || 3,
            healthCheck: process.env.CREDIT_SERVICE_HEALTH_CHECK || '/health'
        },
        reputation: {
            name: 'reputation-service',
            url: process.env.REPUTATION_SERVICE_URL || 'http://localhost:4006',
            timeout: parseInt(process.env.REPUTATION_SERVICE_TIMEOUT, 10) || 30000,
            retries: parseInt(process.env.REPUTATION_SERVICE_RETRIES, 10) || 3,
            healthCheck: process.env.REPUTATION_SERVICE_HEALTH_CHECK || '/health'
        },
        workHistory: {
            name: 'work-history-service',
            url: process.env.WORK_HISTORY_SERVICE_URL || 'http://localhost:4007',
            timeout: parseInt(process.env.WORK_HISTORY_SERVICE_TIMEOUT, 10) || 30000,
            retries: parseInt(process.env.WORK_HISTORY_SERVICE_RETRIES, 10) || 3,
            healthCheck: process.env.WORK_HISTORY_SERVICE_HEALTH_CHECK || '/health'
        },
        socialMedia: {
            name: 'social-media-service',
            url: process.env.SOCIAL_MEDIA_SERVICE_URL || 'http://localhost:4008',
            timeout: parseInt(process.env.SOCIAL_MEDIA_SERVICE_TIMEOUT, 10) || 30000,
            retries: parseInt(process.env.SOCIAL_MEDIA_SERVICE_RETRIES, 10) || 3,
            healthCheck: process.env.SOCIAL_MEDIA_SERVICE_HEALTH_CHECK || '/health'
        },
        notification: {
            name: 'notification-service',
            url: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4009',
            timeout: parseInt(process.env.NOTIFICATION_SERVICE_TIMEOUT, 10) || 30000,
            retries: parseInt(process.env.NOTIFICATION_SERVICE_RETRIES, 10) || 3,
            healthCheck: process.env.NOTIFICATION_SERVICE_HEALTH_CHECK || '/health'
        }
    },

    // Security configuration
    security: {
        jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
        bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
        sessionSecret: process.env.SESSION_SECRET || 'your-super-secret-session-key-change-in-production'
    },

    // Monitoring configuration
    enableMonitoring: process.env.ENABLE_MONITORING === 'true',
    monitoringPath: process.env.MONITORING_PATH || '/metrics',

    // Logging configuration
    logging: {
        level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
        format: process.env.LOG_FORMAT || 'combined',
        enableFileLogging: process.env.ENABLE_FILE_LOGGING === 'true',
        logDirectory: process.env.LOG_DIRECTORY || './logs'
    },

    // Proxy configuration
    proxy: {
        timeout: parseInt(process.env.PROXY_TIMEOUT, 10) || 30000,
        retries: parseInt(process.env.PROXY_RETRIES, 10) || 3,
        retryDelay: parseInt(process.env.PROXY_RETRY_DELAY, 10) || 1000,
        followRedirects: process.env.PROXY_FOLLOW_REDIRECTS === 'true',
        changeOrigin: process.env.PROXY_CHANGE_ORIGIN !== 'false' // Default to true
    }
};

// Validation
if (!config.security.jwtSecret || config.security.jwtSecret === 'your-super-secret-jwt-key-change-in-production') {
    if (config.nodeEnv === 'production') {
        throw new Error('JWT_SECRET must be set in production environment');
    }
    console.warn('⚠️  Warning: Using default JWT_SECRET. Please set JWT_SECRET environment variable.');
}

if (!config.security.sessionSecret || config.security.sessionSecret === 'your-super-secret-session-key-change-in-production') {
    if (config.nodeEnv === 'production') {
        throw new Error('SESSION_SECRET must be set in production environment');
    }
    console.warn('⚠️  Warning: Using default SESSION_SECRET. Please set SESSION_SECRET environment variable.');
}

module.exports = config;
