const prometheus = require('prom-client');
const logger = require('../utils/logger');
const { getCircuitBreakerStates, checkServiceHealth } = require('./proxy');

// Create a Registry to register the metrics
const register = new prometheus.Registry();

// Add default metrics
prometheus.collectDefaultMetrics({
    register,
    prefix: 'gateway_',
    gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5]
});

// Custom metrics
const httpRequestDuration = new prometheus.Histogram({
    name: 'gateway_http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code', 'service'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const httpRequestTotal = new prometheus.Counter({
    name: 'gateway_http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code', 'service']
});

const httpRequestsInFlight = new prometheus.Gauge({
    name: 'gateway_http_requests_in_flight',
    help: 'Number of HTTP requests currently being processed',
    labelNames: ['method', 'route', 'service']
});

const serviceHealthStatus = new prometheus.Gauge({
    name: 'gateway_service_health_status',
    help: 'Health status of backend services (1 = healthy, 0 = unhealthy)',
    labelNames: ['service']
});

const circuitBreakerStatus = new prometheus.Gauge({
    name: 'gateway_circuit_breaker_status',
    help: 'Circuit breaker status (0 = closed, 1 = half-open, 2 = open)',
    labelNames: ['service']
});

const serviceRequestDuration = new prometheus.Histogram({
    name: 'gateway_service_request_duration_seconds',
    help: 'Duration of requests to backend services in seconds',
    labelNames: ['service', 'method', 'status_code'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const rateLimitHits = new prometheus.Counter({
    name: 'gateway_rate_limit_hits_total',
    help: 'Total number of rate limit hits',
    labelNames: ['route', 'limit_type']
});

const errorTotal = new prometheus.Counter({
    name: 'gateway_errors_total',
    help: 'Total number of errors',
    labelNames: ['type', 'code', 'service']
});

// Register all metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(httpRequestsInFlight);
register.registerMetric(serviceHealthStatus);
register.registerMetric(circuitBreakerStatus);
register.registerMetric(serviceRequestDuration);
register.registerMetric(rateLimitHits);
register.registerMetric(errorTotal);

// Middleware to collect request metrics
function collectRequestMetrics(req, res, next) {
    const startTime = Date.now();
    const route = getRoutePattern(req.path);
    const service = getServiceFromRoute(req.path);

    // Increment in-flight requests
    httpRequestsInFlight.inc({
        method: req.method,
        route,
        service
    });

    // Override res.end to capture metrics
    const originalEnd = res.end;
    res.end = function (...args) {
        const duration = (Date.now() - startTime) / 1000;
        const statusCode = res.statusCode.toString();

        // Record metrics
        httpRequestDuration.observe({
            method: req.method,
            route,
            status_code: statusCode,
            service
        }, duration);

        httpRequestTotal.inc({
            method: req.method,
            route,
            status_code: statusCode,
            service
        });

        // Decrement in-flight requests
        httpRequestsInFlight.dec({
            method: req.method,
            route,
            service
        });

        // Record errors
        if (res.statusCode >= 400) {
            const errorType = res.statusCode >= 500 ? 'server_error' : 'client_error';
            errorTotal.inc({
                type: errorType,
                code: statusCode,
                service
            });
        }

        // Call original end
        originalEnd.apply(this, args);
    };

    next();
}

// Extract route pattern from path
function getRoutePattern(path) {
    // Simple route pattern extraction
    if (path.startsWith('/api/auth')) return '/api/auth/*';
    if (path.startsWith('/api/')) return '/api/*';
    if (path === '/health') return '/health';
    if (path === '/metrics') return '/metrics';
    if (path === '/api-docs') return '/api-docs';
    return 'other';
}

// Extract service name from route
function getServiceFromRoute(path) {
    if (path.startsWith('/api/auth')) return 'auth';
    if (path.startsWith('/api/users')) return 'users';
    if (path.startsWith('/api/posts')) return 'posts';
    return 'gateway';
}

// Update service health metrics
async function updateServiceHealthMetrics() {
    try {
        const services = Object.keys(require('../config').services);

        for (const serviceName of services) {
            try {
                const health = await checkServiceHealth(serviceName);
                serviceHealthStatus.set({ service: serviceName }, health.status === 'healthy' ? 1 : 0);
            } catch (error) {
                serviceHealthStatus.set({ service: serviceName }, 0);
                logger.debug(`Health check failed for ${serviceName}:`, error.message);
            }
        }
    } catch (error) {
        logger.error('Error updating service health metrics:', error);
    }
}

// Update circuit breaker metrics
function updateCircuitBreakerMetrics() {
    try {
        const circuitBreakerStates = getCircuitBreakerStates();

        for (const [serviceName, state] of Object.entries(circuitBreakerStates)) {
            let statusValue = 0; // closed
            if (state.state === 'HALF_OPEN') statusValue = 1;
            if (state.state === 'OPEN') statusValue = 2;

            circuitBreakerStatus.set({ service: serviceName }, statusValue);
        }
    } catch (error) {
        logger.error('Error updating circuit breaker metrics:', error);
    }
}

// Record service request metrics
function recordServiceRequest(serviceName, method, statusCode, duration) {
    serviceRequestDuration.observe({
        service: serviceName,
        method: method,
        status_code: statusCode.toString()
    }, duration / 1000);
}

// Record rate limit hits
function recordRateLimitHit(route, limitType) {
    rateLimitHits.inc({
        route: getRoutePattern(route),
        limit_type: limitType
    });
}

// Metrics endpoint middleware
async function metricsEndpoint(req, res, next) {
    try {
        // Update dynamic metrics before serving
        await updateServiceHealthMetrics();
        updateCircuitBreakerMetrics();

        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (error) {
        logger.error('Error serving metrics:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to collect metrics'
        });
    }
}

// Health dashboard endpoint
function healthDashboard(req, res) {
    const circuitBreakerStates = getCircuitBreakerStates();

    const dashboard = {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        services: {},
        circuitBreakers: circuitBreakerStates,
        endpoints: {
            metrics: '/metrics',
            health: '/health'
        }
    };

    // Add service health (this would be populated by the health check)
    const services = Object.keys(require('../config').services);
    for (const serviceName of services) {
        dashboard.services[serviceName] = {
            status: 'unknown', // This would be updated by actual health checks
            circuitBreaker: circuitBreakerStates[serviceName]?.state || 'CLOSED'
        };
    }

    res.json(dashboard);
}

// Start periodic metric updates
function startMetricUpdates() {
    // Update service health every 30 seconds
    setInterval(updateServiceHealthMetrics, 30000);

    // Update circuit breaker status every 10 seconds
    setInterval(updateCircuitBreakerMetrics, 10000);

    logger.info('Started periodic metric updates');
}

// Express router for monitoring endpoints
const express = require('express');
const router = express.Router();

router.get('/', metricsEndpoint);
router.get('/health', healthDashboard);
router.get('/dashboard', healthDashboard);

// Initialize monitoring
function initializeMonitoring() {
    startMetricUpdates();
    logger.info('Monitoring initialized');
}

module.exports = router;
module.exports.collectRequestMetrics = collectRequestMetrics;
module.exports.recordServiceRequest = recordServiceRequest;
module.exports.recordRateLimitHit = recordRateLimitHit;
module.exports.initializeMonitoring = initializeMonitoring;
module.exports.register = register;
