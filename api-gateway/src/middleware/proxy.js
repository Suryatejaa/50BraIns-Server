const { createProxyMiddleware } = require('http-proxy-middleware');
const http = require('http');
const https = require('https');
const config = require('../config');
const logger = require('../utils/logger');

// Circuit breaker implementation
class CircuitBreaker {
    constructor(threshold = 5, timeout = 60000, monitoringPeriod = 10000) {
        this.threshold = threshold;
        this.timeout = timeout;
        this.monitoringPeriod = monitoringPeriod;
        this.failureCount = 0;
        this.lastFailureTime = null;
        this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
        this.nextAttempt = Date.now();
    }

    async call(fn) {
        if (this.state === 'OPEN') {
            if (Date.now() < this.nextAttempt) {
                throw new Error('Circuit breaker is OPEN');
            }
            this.state = 'HALF_OPEN';
        }

        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    onSuccess() {
        this.failureCount = 0;
        this.state = 'CLOSED';
        this.nextAttempt = Date.now();
    }

    onFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();

        if (this.failureCount >= this.threshold) {
            this.state = 'OPEN';
            this.nextAttempt = Date.now() + this.timeout;
            logger.warn(`Circuit breaker opened after ${this.failureCount} failures`);
        }
    }

    getState() {
        return this.state;
    }
}

// Circuit breakers for each service
const circuitBreakers = new Map();

// Get or create circuit breaker for service
function getCircuitBreaker(serviceName) {
    if (!circuitBreakers.has(serviceName)) {
        circuitBreakers.set(serviceName, new CircuitBreaker());
    }
    return circuitBreakers.get(serviceName);
}

// Retry mechanism with exponential backoff
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            if (attempt === maxRetries) {
                break;
            }

            const delay = baseDelay * Math.pow(2, attempt);
            logger.debug(`Retry attempt ${attempt + 1} after ${delay}ms`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}

// Create proxy middleware for a service
function createServiceProxy(serviceName) {
    const serviceConfig = config.services[serviceName];

    if (!serviceConfig) {
        throw new Error(`Service configuration not found for: ${serviceName}`);
    }

    const circuitBreaker = getCircuitBreaker(serviceName);

    return createProxyMiddleware({
        target: serviceConfig.url,
        changeOrigin: config.proxy.changeOrigin,
        timeout: serviceConfig.timeout || config.proxy.timeout,
        followRedirects: config.proxy.followRedirects,

        // Custom path rewrite to remove the service prefix
        pathRewrite: (path, req) => {
            // Handle kebab-case to camelCase service name mapping
            const serviceNameMap = {
                'socialMedia': 'social-media',
                'workHistory': 'work-history'
            };

            const apiServiceName = serviceNameMap[serviceName] || serviceName;
            const servicePath = `/api/${apiServiceName}`;

            if (path.startsWith(servicePath)) {
                let newPath;

                // Special handling for gig service - preserve service structure
                if (serviceName === 'gig') {
                    const remainingPath = path.substring(servicePath.length);
                    newPath = `/gig${remainingPath}` || '/gig';
                }

                else if (serviceName === 'notification') {
                    const remainingPath = path.substring(servicePath.length);
                    newPath = `/notifications${remainingPath}` || '/notifications';
                }

                else if (serviceName === 'clan') {
                    const remainingPath = path.substring(servicePath.length);
                    newPath = `/clan${remainingPath}` || '/clan';
                }

                else {
                    newPath = path.substring(servicePath.length) || '/';
                }

                logger.debug(`Path rewrite: ${path} -> ${newPath}`, {
                    service: serviceName,
                    apiServiceName: apiServiceName,
                    requestId: req.requestId
                });

                return newPath;
            }

            // Special handling for gig service routes that don't start with /api/gig
            if (serviceName === 'gig') {
                // Handle /api/internal/gig routes first
                if (path.startsWith('/api/internal/gig')) {
                    const remainingPath = path.substring('/api/internal/gig'.length);
                    const newPath = `/internal${remainingPath}` || '/internal';

                    logger.debug(`Gig service internal path rewrite: ${path} -> ${newPath}`, {
                        service: serviceName,
                        route: '/api/internal/gig',
                        requestId: req.requestId
                    });
                    return newPath;
                }

                // Handle /api/applications, /api/my, /api/submissions, /api/crew routes
                const gigServiceRoutes = ['/api/applications', '/api/my', '/api/submissions', '/api/crew'];
                for (const route of gigServiceRoutes) {
                    if (path.startsWith(route)) {
                        const remainingPath = path.substring(route.length);
                        const routePrefix = route.substring(5); // Remove '/api/' to get 'applications', 'my', 'submissions'
                        const newPath = `/${routePrefix}${remainingPath}` || `/${routePrefix}`;

                        logger.debug(`Gig service path rewrite: ${path} -> ${newPath}`, {
                            service: serviceName,
                            route: route,
                            requestId: req.requestId
                        });
                        return newPath;
                    }
                }
            }

            if (serviceName === 'user') {
                const userServiceRoutes = ['/api/internal/users', '/api/internal', '/api/public', '/api/search', '/api/sync', '/api/admin', '/api/feed', '/api/analytics', '/api/user'];
                for (const route of userServiceRoutes) {
                    if (path.startsWith(route)) {
                        const remainingPath = path.substring(route.length);
                        let routePrefix;

                        if (route === '/api/internal/users') {
                            routePrefix = 'internal/users';
                        } else if (route === '/api/internal') {
                            routePrefix = 'internal'; // Direct internal route mapping
                        } else if (route === '/api/public') {
                            routePrefix = 'public';
                        } else if (route === '/api/user') {
                            routePrefix = 'profile';
                        } else {
                            routePrefix = route.substring(5); // Remove '/api/' to get 'search', 'sync', 'admin', 'feed', 'analytics'
                        }

                        const newPath = `/${routePrefix}${remainingPath}` || `/${routePrefix}`;

                        logger.debug(`User service path rewrite: ${path} -> ${newPath}`, {
                            service: serviceName,
                            route: route,
                            requestId: req.requestId
                        });
                        return newPath;
                    }
                }
            }

            if (serviceName === 'notification') {
                // Handle WebSocket connections for notification service
                if (req.headers.upgrade === 'websocket') {
                    logger.debug(`WebSocket upgrade request for notification service: ${path}`, {
                        service: serviceName,
                        requestId: req.requestId
                    });
                    return '/'; // WebSocket connections go to root of notification service
                }

                const notificationServiceRoutes = ['/api/notification', '/api/admin/notification', '/api/notifications', '/api/admin/notifications'];
                for (const route of notificationServiceRoutes) {
                    if (path.startsWith(route)) {
                        const remainingPath = path.substring(route.length);
                        let routePrefix;

                        if (route === '/api/notification') {
                            routePrefix = 'notifications';
                        } else if (route === '/api/notifications') {
                            routePrefix = 'notifications';
                        } else {
                            routePrefix = route.substring(5); // Remove '/api/' to get 'admin'
                        }

                        const newPath = `/${routePrefix}${remainingPath}` || `/${routePrefix}`;

                        logger.debug(`Notification service path rewrite: ${path} -> ${newPath}`, {
                            service: serviceName,
                            route: route,
                            requestId: req.requestId
                        });
                        return newPath;
                    }
                }
            }

            if (serviceName === 'workHistory') {
                const workHistoryServiceRoutes = ['/api/work-history', '/api/portfolio', '/api/achievements', '/api/summary'];
                for (const route of workHistoryServiceRoutes) {
                    if (path.startsWith(route)) {
                        const remainingPath = path.substring(route.length);
                        let routePrefix;

                        if (route === '/api/work-history') {
                            routePrefix = 'work-history';
                        } else {
                            routePrefix = route.substring(5); // Remove '/api/' to get 'portfolio', 'achievements', 'summary'
                        }

                        const newPath = `/${routePrefix}${remainingPath}` || `/${routePrefix}`;

                        logger.debug(`Work History service path rewrite: ${path} -> ${newPath}`, {
                            service: serviceName,
                            route: route,
                            requestId: req.requestId
                        });
                        return newPath;
                    }
                }
            }

            if (serviceName === 'reputation') {
                const reputationServiceRoutes = ['/api/reputation'];
                for (const route of reputationServiceRoutes) {
                    if (path.startsWith(route)) {
                        const remainingPath = path.substring(route.length);
                        const newPath = `/api/reputation${remainingPath}` || '/api/reputation';

                        logger.debug(`Reputation service path rewrite: ${path} -> ${newPath}`, {
                            service: serviceName,
                            route: route,
                            requestId: req.requestId
                        });
                        return newPath;
                    }
                }
            }

            if (serviceName === 'clan') {
                // Handle internal clan routes first
                if (path.startsWith('/api/internal/clan')) {
                    const remainingPath = path.substring('/api/internal/clan'.length);
                    const newPath = `/internal${remainingPath}` || '/internal';

                    logger.debug(`Clan service internal path rewrite: ${path} -> ${newPath}`, {
                        service: serviceName,
                        route: '/api/internal/clan',
                        requestId: req.requestId
                    });
                    return newPath;
                }

                // Special handling for /api/clan/public route
                if (path.startsWith('/api/clan/public')) {
                    const remainingPath = path.substring('/api/clan/public'.length);
                    const newPath = `/public${remainingPath}` || '/public';

                    logger.debug(`Clan service path rewrite: ${path} -> ${newPath}`, {
                        service: serviceName,
                        route: '/api/clan/public',
                        requestId: req.requestId
                    });
                    return newPath;
                }

                // Handle new clan service routes
                if (path.startsWith('/api/clans')) {
                    const remainingPath = path.substring('/api/clans'.length);
                    const newPath = `/clans${remainingPath}` || '/clans';

                    logger.debug(`Clan service path rewrite: ${path} -> ${newPath}`, {
                        service: serviceName,
                        route: '/api/clans',
                        requestId: req.requestId
                    });
                    return newPath;
                }

                const clanServiceRoutes = ['/api/members', '/api/rankings', '/api/analytics', '/api/clan', '/api/admin', '/api/public'];
                for (const route of clanServiceRoutes) {
                    if (path.startsWith(route)) {
                        const remainingPath = path.substring(route.length);
                        let routePrefix;

                        if (route === '/api/clan') {
                            routePrefix = 'clans';
                        } else {
                            routePrefix = route.substring(5); // Remove '/api/' to get 'members', 'rankings', 'analytics'
                        }

                        const newPath = `/${routePrefix}${remainingPath}` || `/${routePrefix}`;

                        logger.debug(`Clan service path rewrite: ${path} -> ${newPath}`, {
                            service: serviceName,
                            route: route,
                            requestId: req.requestId
                        });
                        return newPath;
                    }
                }
            }

            return path;
        },

        // Handle proxy requests
        onProxyReq: (proxyReq, req, res) => {
            const startTime = Date.now();
            req.proxyStartTime = startTime;

            // Add custom headers
            proxyReq.setHeader('X-Forwarded-For', req.ip);
            proxyReq.setHeader('X-Request-ID', req.requestId);
            proxyReq.setHeader('X-Gateway-Service', serviceName);

            // Forward internal service headers if present
            if (req.headers['x-internal-service']) {
                proxyReq.setHeader('X-Internal-Service', req.headers['x-internal-service']);
            }
            if (req.headers['x-calling-service']) {
                proxyReq.setHeader('X-Calling-Service', req.headers['x-calling-service']);
            }

            // Remove CORS headers since we handle CORS at gateway level
            proxyReq.removeHeader('Origin');

            // Handle request body for POST/PUT/PATCH requests that have been parsed by express.json()
            if (req.body) {
                const bodyData = JSON.stringify(req.body);
                // The proxyReq is a ClientRequest object, we need to set the headers before writing the body
                proxyReq.setHeader('Content-Type', 'application/json');
                proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));

                logger.debug('Writing parsed body to proxy request.', { requestId: req.requestId, service: serviceName });

                // stream the content
                proxyReq.write(bodyData);
            }

            logger.debug(`Proxying request to ${serviceName}`, {
                method: req.method,
                path: req.path,
                target: serviceConfig.url,
                requestId: req.requestId
            });
        },

        // Handle proxy responses
        onProxyRes: (proxyRes, req, res) => {
            const duration = Date.now() - req.proxyStartTime;

            // Remove CORS headers from service response since we handle CORS at gateway
            delete proxyRes.headers['access-control-allow-origin'];
            delete proxyRes.headers['access-control-allow-credentials'];
            delete proxyRes.headers['access-control-allow-methods'];
            delete proxyRes.headers['access-control-allow-headers'];
            delete proxyRes.headers['access-control-expose-headers'];
            delete proxyRes.headers['access-control-max-age'];

            // Add gateway headers
            proxyRes.headers['X-Gateway-Service'] = serviceName;
            proxyRes.headers['X-Response-Time'] = `${duration}ms`;

            logger.logServiceCall(serviceName, req.method, req.path, duration, proxyRes.statusCode);

            // Circuit breaker logic
            if (proxyRes.statusCode >= 500) {
                circuitBreaker.onFailure();
            } else {
                circuitBreaker.onSuccess();
            }
        },

        // Handle proxy errors
        onError: (err, req, res) => {
            const duration = Date.now() - (req.proxyStartTime || Date.now());

            logger.error(`Proxy error for ${serviceName}`, {
                error: err.message,
                method: req.method,
                path: req.path,
                duration: `${duration}ms`,
                requestId: req.requestId,
                circuitBreakerState: circuitBreaker.getState()
            });

            circuitBreaker.onFailure();

            // Return appropriate error response
            if (!res.headersSent) {
                if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
                    res.status(503).json({
                        error: 'Service Unavailable',
                        message: `${serviceName} service is currently unavailable`,
                        code: 'SERVICE_UNAVAILABLE',
                        requestId: req.requestId,
                        retryAfter: 30
                    });
                } else if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT') {
                    res.status(504).json({
                        error: 'Gateway Timeout',
                        message: `${serviceName} service did not respond in time`,
                        code: 'GATEWAY_TIMEOUT',
                        requestId: req.requestId
                    });
                } else {
                    res.status(502).json({
                        error: 'Bad Gateway',
                        message: `Error communicating with ${serviceName} service`,
                        code: 'BAD_GATEWAY',
                        requestId: req.requestId
                    });
                }
            }
        }
    });
}

// Middleware factory function
function proxyMiddleware(serviceName) {
    const serviceConfig = config.services[serviceName];

    if (!serviceConfig) {
        return (req, res, next) => {
            const error = new Error(`Service not configured: ${serviceName}`);
            error.status = 500;
            next(error);
        };
    }

    const proxy = createServiceProxy(serviceName);
    const circuitBreaker = getCircuitBreaker(serviceName);

    return (req, res, next) => {
        // Check circuit breaker state
        if (circuitBreaker.getState() === 'OPEN') {
            logger.warn(`Circuit breaker is OPEN for ${serviceName}`, {
                requestId: req.requestId,
                path: req.path
            });

            return res.status(503).json({
                error: 'Service Unavailable',
                message: `${serviceName} service is temporarily unavailable`,
                code: 'CIRCUIT_BREAKER_OPEN',
                requestId: req.requestId,
                retryAfter: 60
            });
        }

        // Apply retry logic with circuit breaker
        const proxyRequest = () => new Promise((resolve, reject) => {
            proxy(req, res, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });

        circuitBreaker.call(() =>
            retryWithBackoff(
                proxyRequest,
                serviceConfig.retries || config.proxy.retries,
                config.proxy.retryDelay
            )
        ).catch((error) => {
            logger.error(`All retry attempts failed for ${serviceName}`, {
                error: error.message,
                requestId: req.requestId,
                path: req.path
            });

            if (!res.headersSent) {
                res.status(503).json({
                    error: 'Service Unavailable',
                    message: `${serviceName} service is currently unavailable after multiple retry attempts`,
                    code: 'SERVICE_UNAVAILABLE_AFTER_RETRIES',
                    requestId: req.requestId
                });
            }
        });
    };
}

// Health check for services
async function checkServiceHealth(serviceName) {
    const serviceConfig = config.services[serviceName];
    if (!serviceConfig) {
        return { status: 'unknown', error: 'Service not configured' };
    }

    return new Promise((resolve) => {
        const url = `${serviceConfig.url}${serviceConfig.healthCheck}`;
        const isHttps = url.startsWith('https');
        const httpModule = isHttps ? https : http;

        const startTime = Date.now();

        const request = httpModule.get(url, { timeout: 5000 }, (response) => {
            const responseTime = Date.now() - startTime;
            resolve({
                status: response.statusCode >= 200 && response.statusCode < 300 ? 'healthy' : 'unhealthy',
                statusCode: response.statusCode,
                responseTime
            });
        });

        request.on('error', (error) => {
            resolve({
                status: 'unhealthy',
                error: error.message,
                responseTime: Date.now() - startTime
            });
        });

        request.on('timeout', () => {
            request.destroy();
            resolve({
                status: 'unhealthy',
                error: 'Timeout',
                responseTime: Date.now() - startTime
            });
        });
    });
}

// Export circuit breaker states for monitoring
function getCircuitBreakerStates() {
    const states = {};
    for (const [serviceName, circuitBreaker] of circuitBreakers.entries()) {
        states[serviceName] = {
            state: circuitBreaker.getState(),
            failureCount: circuitBreaker.failureCount,
            lastFailureTime: circuitBreaker.lastFailureTime
        };
    }
    return states;
}

module.exports = proxyMiddleware;
module.exports.checkServiceHealth = checkServiceHealth;
module.exports.getCircuitBreakerStates = getCircuitBreakerStates;
