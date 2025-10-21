const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');
const hpp = require('hpp');

const config = require('./config');
const logger = require('./utils/logger');
const proxyMiddleware = require('./middleware/proxy');
const authMiddleware = require('./middleware/auth');
const { errorHandler } = require('./middleware/error');
const monitoringRouter = require('./middleware/monitoring');
const { collectRequestMetrics } = require('./middleware/monitoring');
const validationMiddleware = require('./middleware/validation');

const app = express();

// Trust proxy (for production behind load balancer/reverse proxy)
app.set('trust proxy', config.trustProxy);

// Security middleware stack
app.use(helmet({
    contentSecurityPolicy: config.nodeEnv === 'production' ? {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    } : false,
    crossOriginEmbedderPolicy: false,
}));

// XSS Protection
app.use((req, res, next) => {
    if (req.body && typeof req.body === 'object') {
        Object.keys(req.body).forEach(key => {
            if (typeof req.body[key] === 'string') {
                req.body[key] = xss(req.body[key]);
            }
        });
    }
    next();
});

// Security middleware
app.use(mongoSanitize());
app.use(hpp({ whitelist: ['sort', 'fields', 'page', 'limit', 'filter'] }));

// CORS configuration
// CORS configuration with debugging
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = config.cors.allowedOrigins;

        console.log('🔍 CORS Debug:');
        console.log('  Request Origin:', origin);
        console.log('  Allowed Origins:', allowedOrigins);
        console.log('  Allow No Origin:', config.cors.allowNoOrigin);

        if (!origin && config.cors.allowNoOrigin) {
            console.log('✅ Allowing request with no origin');
            return callback(null, true);
        }
        if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
            console.log('✅ Origin allowed');
            callback(null, true);
        } else {
            console.log('❌ Origin NOT allowed');
            const error = new Error(`Origin ${origin} not allowed by CORS policy`);
            error.status = 403;
            callback(error);
        }
    },
    credentials: config.cors.credentials,
    optionsSuccessStatus: 200,
    methods: config.cors.methods,
    allowedHeaders: config.cors.allowedHeaders,
    exposedHeaders: config.cors.exposedHeaders,
    maxAge: config.cors.maxAge
};

app.use(cors(corsOptions));

// Compression and body parsing
app.use(compression({
    filter: (req, res) => {
        if (req.headers['x-no-compression']) return false;
        return compression.filter(req, res);
    },
    level: config.nodeEnv === 'production' ? 6 : 1
}));

app.use(express.json({
    limit: config.requestLimits.jsonLimit,
    verify: (req, res, buf) => { req.rawBody = buf; }
}));

app.use(express.urlencoded({
    extended: true,
    limit: config.requestLimits.urlEncodedLimit
}));

app.use(cookieParser());

// Request middleware
app.use((req, res, next) => {
    // URL normalization
    const normalizedPath = req.path.replace(/\/+/g, '/');
    if (req.path !== normalizedPath) {
        logger.debug(`URL normalized: ${req.path} -> ${normalizedPath}`, { requestId: req.requestId });
        req.url = req.url.replace(req.path, normalizedPath);
        req.path = normalizedPath;
    }

    // Request ID and timing
    req.requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    req.startTime = Date.now();

    res.setHeader('X-Request-ID', req.requestId);
    res.setHeader('X-Powered-By', '50BraIns API Gateway');

    next();
});

// Request logging
if (config.nodeEnv !== 'test') {
    app.use(morgan('combined', {
        stream: { write: (msg) => logger.info(msg.trim()) },
        skip: (req, res) => res.statusCode < 400
    }));

    if (config.nodeEnv === 'development') {
        app.use(morgan('dev'));
    }
}

app.use(collectRequestMetrics);

// Rate limiting
const createRateLimiter = (windowMs, max, message, skipSuccessfulRequests = false) => rateLimit({
    windowMs,
    max,
    message: { error: message, retryAfter: Math.ceil(windowMs / 1000) },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    keyGenerator: (req) => `${req.ip}:${req.path}`,
    handler: (req, res) => {
        logger.warn(`Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`, {
            requestId: req.requestId,
            ip: req.ip,
            path: req.path,
            userAgent: req.get('User-Agent')
        });
        res.status(429).json({
            error: 'Too many requests',
            message: 'Rate limit exceeded. Please try again later.',
            retryAfter: Math.ceil(windowMs / 1000)
        });
    }
});

const globalLimiter = createRateLimiter(
    config.rateLimits.global.windowMs,
    config.rateLimits.global.max,
    'Too many requests from this IP, please try again later'
);

const authLimiter = createRateLimiter(
    config.rateLimits.auth.windowMs,
    config.rateLimits.auth.max,
    'Too many authentication attempts, please try again later',
    true
);

const speedLimiter = config.nodeEnv === 'test' ? (req, res, next) => next() : slowDown({
    windowMs: 15 * 60 * 1000,
    delayAfter: config.rateLimits.speedLimiter.delayAfter,
    delayMs: () => config.rateLimits.speedLimiter.delayMs,
    maxDelayMs: config.rateLimits.speedLimiter.maxDelayMs,
    keyGenerator: (req) => req.ip,
    validate: { delayMs: false }
});

app.use(globalLimiter);
app.use(speedLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
    const healthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.nodeEnv,
        version: process.env.npm_package_version || '1.0.0',
        services: {}
    };

    for (const [serviceName, serviceConfig] of Object.entries(config.services)) {
        healthStatus.services[serviceName] = {
            url: serviceConfig.url,
            status: 'unknown'
        };
    }

    res.json(healthStatus);
});

// Monitoring endpoint
if (config.enableMonitoring) {
    app.use(config.monitoringPath, monitoringRouter);
}

// API documentation endpoint
app.get('/api-docs', (req, res) => {
    res.json({
        title: '50BraIns API Gateway',
        version: '1.0.0',
        description: 'Centralized API Gateway for 50BraIns microservices',
        services: Object.keys(config.services),
        endpoints: {
            health: '/health',
            monitoring: config.enableMonitoring ? config.monitoringPath : null,
            auth: '/api/auth/*',
            user: '/api/user/*',
            clan: '/api/clan/*',
            clans: '/api/clans/*',
            gig: '/api/gig/*',
            credit: '/api/credit/*',
            reputation: '/api/reputation/*',
            workHistory: '/api/work-history/*',
            socialMedia: '/api/social-media/*',
            portfolio: '/api/portfolio/*',
            achievements: '/api/achievements/*',
            summary: '/api/summary/*',
            search: '/api/search/*',
            public: '/api/public/*',
            analytics: '/api/analytics/*',
            admin: '/api/admin/*',
            sync: '/api/sync/*',
            internalRoutes: {
                users: '/api/internal/users/*',
                usersBatch: '/api/internal/users/batch',
                gig: '/api/internal/gig/*',
                clan: '/api/internal/clan/*'
            },
            publicRoutes: {
                creditPackages: '/api/credit/public/packages',
                creditPricing: '/api/credit/public/boost-pricing',
                clanFeed: '/api/clans/feed',
                gigFeed: '/api/gigs/feed',
                userFeed: '/api/feed/users',
                reputation: '/api/reputation/*',
                publicProfiles: '/api/public/*'
            },
            healthChecks: {
                auth: '/api/auth/health',
                user: '/api/user/health',
                clan: '/api/clan/health',
                gig: '/api/gig/health',
                credit: '/api/credit/health',
                reputation: '/api/reputation/health',
                workHistory: '/api/work-history/health',
                socialMedia: '/api/social-media/health',
                notification: '/api/notification/health'
            },
            feed: {
                users: '/api/feed/users',
                clans: '/api/clans/feed',
                gigs: '/api/gigs/feed'
            }
        }
    });
});


// Route-specific rate limiting and middleware
app.use('/api/auth', authLimiter);
app.use(validationMiddleware);

// =============================================================================
// INTERNAL SERVICE ROUTES (No Authentication Required) - HIGHEST PRIORITY
// =============================================================================

// Internal service communication routes (bypass all auth and rate limiting)
app.use('/api/internal/users', proxyMiddleware('user')); // User service internal calls
app.use('/api/internal/gig', proxyMiddleware('gig')); // Gig service internal calls
app.use('/api/internal/clan', proxyMiddleware('clan')); // Clan service internal calls
app.use('/api/internal', proxyMiddleware('user')); // Default internal calls to user service

// =============================================================================
// PUBLIC ROUTES (No Authentication Required) - ORDER MATTERS: Most specific first
// =============================================================================

// Health check routes for all services
app.use('/api/auth/health', proxyMiddleware('auth'));
app.use('/api/user/health', proxyMiddleware('user'));
app.use('/api/clan/health', proxyMiddleware('clan'));
app.use('/api/clans/health', proxyMiddleware('clan')); // New clan service health endpoint
app.use('/api/gig/health', proxyMiddleware('gig'));
app.use('/api/credit/health', proxyMiddleware('credit'));
app.use('/api/reputation/health', proxyMiddleware('reputation'));
app.use('/api/work-history/health', proxyMiddleware('workHistory'));
app.use('/api/social-media/health', proxyMiddleware('socialMedia'));
app.use('/api/notifications/health', proxyMiddleware('notification'));

// Public service-specific routes (most specific first)
app.use('/api/credit/public', proxyMiddleware('credit')); // Credit packages, pricing
app.use('/api/clan/public', proxyMiddleware('clan')); // Public clan info
app.use('/api/gig/public', proxyMiddleware('gig')); // Public gig categories, stats

// Public feed routes
app.use('/api/feed/users', proxyMiddleware('user')); // Public user feed
app.use('/api/feed/top-users', proxyMiddleware('user')); // Public top users
app.use('/api/clans/feed', proxyMiddleware('clan')); // Public clan feed  
app.use('/api/gigs/feed', proxyMiddleware('gig')); // Public gig feed
app.use('/api/gig/feed', proxyMiddleware('gig')); // Alternative gig feed route

// Public data access routes
app.use('/api/public', proxyMiddleware('user')); // Public profiles, stats

// Public analytics routes
app.use('/api/analytics/trending-influencers', proxyMiddleware('user'));
app.use('/api/analytics/popular-brands', proxyMiddleware('user'));
app.use('/api/analytics/search-trends', proxyMiddleware('user'));

// =============================================================================
// PROTECTED ROUTES (Authentication Required) - ORDER MATTERS: Most specific first
// =============================================================================

// Auth service routes
app.use('/api/auth', proxyMiddleware('auth'));

// User service routes
app.use('/api/search', authMiddleware, proxyMiddleware('user'));
app.use('/api/sync', authMiddleware, proxyMiddleware('user'));
app.use('/api/admin', authMiddleware, proxyMiddleware('user'));
app.use('/api/analytics', authMiddleware, proxyMiddleware('user')); // Protected analytics
app.use('/api/user', authMiddleware, proxyMiddleware('user'));

// Clan service routes - Public routes first (MOST SPECIFIC FIRST - order matters!)
app.use('/api/clans/health', proxyMiddleware('clan')); // Health check (no auth)
app.use('/api/clans/feed', proxyMiddleware('clan')); // Public clan feed (no auth)
app.use('/api/clans/featured', proxyMiddleware('clan')); // Featured clans (no auth)
app.use('/api/clans/my', authMiddleware, proxyMiddleware('clan')); // User's own clans (require auth)

// Clan service routes - Protected routes (MUST come before the broad :clanId route)
app.use('/api/members', authMiddleware, proxyMiddleware('clan')); // Clan member management
app.use('/api/clans', authMiddleware, proxyMiddleware('clan')); // Main clan operations (require auth)

// Public individual clan viewing (no auth required) - MUST come LAST
app.use('/api/clans/:clanId', proxyMiddleware('clan')); // View individual clan (no auth)
app.use('/api/clan', authMiddleware, proxyMiddleware('clan')); // Legacy clan routes

// Gig service routes (order matters - more specific routes first)
app.use('/api/crew', authMiddleware, proxyMiddleware('gig')); // Crew bid management (MUST be before /api/gig)
app.use('/api/my', authMiddleware, proxyMiddleware('gig')); // User's posted gigs, applications
app.use('/api/applications', authMiddleware, proxyMiddleware('gig')); // Gig applications
app.use('/api/submissions', authMiddleware, proxyMiddleware('gig')); // Gig work submissions
app.use('/api/gig', authMiddleware, proxyMiddleware('gig'));

app.use('/api/reputation', proxyMiddleware('reputation')); // Public reputation data (no auth required)

// Credit service routes
app.use('/api/credit', authMiddleware, proxyMiddleware('credit'));

// Work History service routes
app.use('/api/work-history', authMiddleware, proxyMiddleware('workHistory')); // Protected work history operations
app.use('/api/portfolio', proxyMiddleware('workHistory')); // Public portfolio viewing (no auth)
app.use('/api/achievements', proxyMiddleware('workHistory')); // Public achievements viewing (no auth)
app.use('/api/summary', proxyMiddleware('workHistory')); // Public summaries and stats (no auth)  
// Social Media service routes
app.use('/api/social-media', authMiddleware, proxyMiddleware('socialMedia'));

// Notification service routes
app.use('/api/notification', authMiddleware, proxyMiddleware('notification'));
app.use('/api/admin/notification', authMiddleware, proxyMiddleware('notification'));

// WebSocket support for notifications (no auth required for WebSocket upgrade)
app.use('/api/notifications/ws', proxyMiddleware('notification'));

// 404 handler
app.use('*', (req, res) => {
    logger.warn(`404 - Route not found: ${req.method} ${req.originalUrl}`, {
        requestId: req.requestId,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });

    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.originalUrl} not found`,
        availableEndpoints: [
            '/health',
            '/api-docs',
            '/api/auth',
            '/api/clan',
            '/api/user',
            '/api/gig',
            '/api/search',
            '/api/public',
            '/api/analytics',
            '/api/admin',
            '/api/sync'
        ]
    });
});

// Global error handler
app.use(errorHandler);

module.exports = app;
