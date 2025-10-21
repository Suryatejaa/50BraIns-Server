const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');

// Routes that don't require authentication
const publicRoutes = [
    '/health',
    '/api-docs',
    '/metrics',
    // Auth service public routes
    '/api/auth/health',
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/auth/verify-email',
    '/api/auth/refresh-token',
    '/api/public'
];

// Routes that require authentication
const protectedRoutes = [
    '/api/auth/logout',
    '/api/auth/profile',
    '/api/auth/change-password',
    '/api/auth/delete-account'
];

// Admin routes that require additional permissions
const adminRoutes = [
    '/api/auth/admin'
];

// Check if route is public
function isPublicRoute(path) {
    return publicRoutes.some(route => {
        if (route.endsWith('*')) {
            return path.startsWith(route.slice(0, -1));
        }
        return path === route || path.startsWith(route + '/');
    });
}

// Check if route is admin-only
function isAdminRoute(path) {
    return adminRoutes.some(route => {
        if (route.endsWith('*')) {
            return path.startsWith(route.slice(0, -1));
        }
        return path === route || path.startsWith(route + '/');
    });
}

// Extract token from request
// Extract token from request
function extractToken(req) {
    // Priority 1: Check parsed cookies (requires cookie-parser middleware)
    if (req.cookies && req.cookies.accessToken) {
        console.log('✅ Token found in req.cookies.accessToken');
        return req.cookies.accessToken;
    }

    // Priority 2: Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        console.log('✅ Token found in Authorization header');
        return authHeader.substring(7);
    }

    // Priority 3: Manual cookie parsing from raw cookie header
    if (req.headers.cookie) {
        console.log('🔍 Raw cookie header:', req.headers.cookie);
        const cookies = req.headers.cookie.split('; ');
        for (const cookie of cookies) {
            const [name, value] = cookie.split('=');
            if (name === 'accessToken') {
                console.log('✅ Token found via manual cookie parsing');
                return value;
            }
        }
    }

    // Priority 4: Check query parameter
    if (req.query && req.query.token) {
        console.log('✅ Token found in query parameter');
        return req.query.token;
    }

    console.log('❌ No token found in any location');
    return null;
}

// Verify JWT token
// Verify JWT token
function verifyToken(token) {
    console.log('🔧 Gateway JWT Secret:', config.security.jwtSecret);

    try {
        const decoded = jwt.verify(token, config.security.jwtSecret);
        console.log('✅ Token verified successfully:', decoded);
        return decoded;
    } catch (error) {
        console.log('❌ Token verification error:', error.message);

        // Test with possible auth service secrets
        const possibleSecrets = [
            'your-super-secret-jwt-key-change-in-production',
            'dev-jwt-secret-key-not-for-production-change-this',
            'jwt-secret',
            'secret',
            'dev-jwt-secret-key-not-for-production-change-this'
        ];

        for (const testSecret of possibleSecrets) {
            try {
                const testDecoded = jwt.verify(token, testSecret);
                console.log(`🎯 TOKEN WORKS WITH SECRET: "${testSecret}"`);
                console.log('🎯 Decoded payload:', testDecoded);
                break;
            } catch (e) {
                console.log(`❌ Failed with secret: "${testSecret}"`);
            }
        }

        if (error.name === 'TokenExpiredError') {
            const expiredError = new Error('Token has expired');
            expiredError.code = 'TOKEN_EXPIRED';
            expiredError.status = 401;
            throw expiredError;
        } else if (error.name === 'JsonWebTokenError') {
            const invalidError = new Error('Invalid token');
            invalidError.code = 'INVALID_TOKEN';
            invalidError.status = 401;
            throw invalidError;
        }
        throw error;
    }
}

// Main authentication middleware
async function authMiddleware(req, res, next) {
    const path = req.path;

    console.log(`Auth middleware - path: ${path}`);

    // Skip authentication for public routes
    if (isPublicRoute(path)) {
        logger.debug(`Public route accessed: ${path}`, {
            requestId: req.requestId,
            ip: req.ip
        });
        return next();
    }

    // Skip authentication for internal service calls
    if (req.headers['x-internal'] === 'true') {
        logger.debug(`Internal service call bypassing auth: ${path}`, {
            requestId: req.requestId,
            ip: req.ip
        });

        // Add internal service headers for downstream services
        req.headers['x-internal-call'] = 'true';
        req.headers['x-internal-service'] = req.headers['x-calling-service'] || 'unknown';

        return next();
    }

    try {
        const token = extractToken(req);
        console.log(`Extracted token: ${token}`);

        if (!token) {
            // Fallback: Check for x-user-id header (for development/testing)
            const userId = req.headers['x-user-id'];
            if (userId) {
                console.log(`✅ Using x-user-id fallback: ${userId}`);

                // Add user info to request using x-user-id
                req.user = {
                    id: userId,
                    email: `${userId}@temp.local`,
                    roles: ['user'],
                    isAdmin: false,
                    permissions: [],
                    tokenIat: Date.now(),
                    tokenExp: Date.now() + 3600000 // 1 hour from now
                };

                logger.debug(`Authenticated via x-user-id: ${userId}`, {
                    requestId: req.requestId,
                    ip: req.ip
                });

                return next();
            }

            logger.warn(`Unauthorized access attempt to protected route: ${path}`, {
                requestId: req.requestId,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Authentication token is required',
                code: 'MISSING_TOKEN',
                requestId: req.requestId
            });
        }

        // Verify token
        const decoded = verifyToken(token);

        // Add user info to request
        req.user = {
            id: decoded.id || decoded.userId,
            email: decoded.email,
            roles: decoded.roles || ['user'],
            isAdmin: decoded.isAdmin || false,
            permissions: decoded.permissions || [],
            tokenIat: decoded.iat,
            tokenExp: decoded.exp
        };

        // Check if user has admin access for admin routes
        if (isAdminRoute(path) && !req.user.isAdmin) {
            logger.warn(`Forbidden access attempt to admin route: ${path}`, {
                requestId: req.requestId,
                userId: req.user.id,
                userEmail: req.user.email,
                ip: req.ip
            });

            return res.status(403).json({
                error: 'Forbidden',
                message: 'Admin access required',
                code: 'INSUFFICIENT_PERMISSIONS',
                requestId: req.requestId
            });
        }

        // Add auth headers for downstream services
        req.headers['x-user-id'] = req.user.id;
        req.headers['x-user-email'] = req.user.email;
        req.headers['x-user-roles'] = req.user.roles.join(',');
        req.headers['x-user-is-admin'] = req.user.isAdmin.toString();

        logger.debug(`Authenticated request to: ${path}`, {
            requestId: req.requestId,
            userId: req.user.id,
            userEmail: req.user.email,
            userroles: req.user.roles
        });

        next();

    } catch (error) {
        logger.warn(`Authentication failed for route: ${path}`, {
            error: error.message,
            code: error.code,
            requestId: req.requestId,
            ip: req.ip
        });

        let statusCode = 401;
        let errorCode = 'AUTHENTICATION_FAILED';
        let message = 'Authentication failed';

        if (error.code === 'TOKEN_EXPIRED') {
            statusCode = 401;
            errorCode = 'TOKEN_EXPIRED';
            message = 'Authentication token has expired';
        } else if (error.code === 'INVALID_TOKEN') {
            statusCode = 401;
            errorCode = 'INVALID_TOKEN';
            message = 'Invalid authentication token';
        }

        return res.status(statusCode).json({
            error: 'Unauthorized',
            message,
            code: errorCode,
            requestId: req.requestId
        });
    }
}

// Optional authentication middleware (doesn't block if no token)
function optionalAuthMiddleware(req, res, next) {
    const token = extractToken(req);

    if (token) {
        try {
            const decoded = verifyToken(token);
            req.user = {
                id: decoded.id || decoded.userId,
                email: decoded.email,
                roles: decoded.roles || ['user'],
                isAdmin: decoded.isAdmin || false,
                permissions: decoded.permissions || []
            };

            // Add auth headers for downstream services
            req.headers['x-user-id'] = req.user.id;
            req.headers['x-user-email'] = req.user.email;
            req.headers['x-user-roles'] = req.user.roles.join(',');
            req.headers['x-user-is-admin'] = req.user.isAdmin.toString();

        } catch (error) {
            // Log but don't block request
            logger.debug(`Optional auth failed: ${error.message}`, {
                requestId: req.requestId,
                path: req.path
            });
        }
    }

    next();
}

// roles-based access control middleware
const requireroles = (allowedroles) => {
    return (req, res, next) => {
        if (!req.user || !Array.isArray(req.user.roles)) {
            return res.status(403).json({ success: false, error: 'Forbidden: No roles assigned' });
        }
        const hasroles = req.user.roles.some(roles => allowedroles.includes(roles));
        if (!hasroles) {
            return res.status(403).json({ success: false, error: 'Forbidden: Insufficient roles' });
        }
        next();
    };
};

// Admin roles middleware (ADMIN, MODERATOR, or SUPER_ADMIN)
const requireAdmin = requireroles(['ADMIN', 'MODERATOR', 'SUPER_ADMIN']);

// Super admin middleware (ADMIN only)
const requireSuperAdmin = requireroles(['SUPER_ADMIN']);

// Permission-based access control middleware
function requirePermission(permissions) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Authentication required',
                code: 'AUTHENTICATION_REQUIRED',
                requestId: req.requestId
            });
        }

        const userPermissions = req.user.permissions || [];
        const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];

        const hasRequiredPermission = requiredPermissions.every(permission =>
            userPermissions.includes(permission) || req.user.isAdmin
        );

        if (!hasRequiredPermission) {
            logger.warn(`Insufficient permissions for access`, {
                requestId: req.requestId,
                userId: req.user.id,
                userPermissions,
                requiredPermissions,
                path: req.path
            });

            return res.status(403).json({
                error: 'Forbidden',
                message: `Required permission(s): ${requiredPermissions.join(', ')}`,
                code: 'INSUFFICIENT_PERMISSIONS',
                requestId: req.requestId
            });
        }

        next();
    };
}

module.exports = authMiddleware;
module.exports.optionalAuth = optionalAuthMiddleware;
module.exports.requireroles = requireroles;
module.exports.requirePermission = requirePermission;
module.exports.isPublicRoute = isPublicRoute;
module.exports.isAdminRoute = isAdminRoute;
