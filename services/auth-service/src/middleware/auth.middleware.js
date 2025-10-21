const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { getFromCache, setToCache, deleteFromCache, redisClient } = require('../config/redis');
const logger = require('../utils/logger.utils');

const prisma = new PrismaClient();

// JWT Authentication middleware
const authenticate = async (req, res, next) => {
    try {
        // Extract token from cookies or Authorization header
        let token = req.cookies?.accessToken;


        if (!token) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7);
            }
        }
        logger.info(`[AUTH DEBUG] Received token: ${token}`);
        logger.info(`[AUTH DEBUG] JWT_SECRET in middleware: ${process.env.JWT_SECRET}`);
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Access token required',
                code: 'TOKEN_MISSING',
                timestamp: new Date().toISOString()
            });
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check if token is blacklisted
        const blacklistKey = `blacklist:${token}`;
        const isBlacklisted = await getFromCache(blacklistKey); if (isBlacklisted) {
            return res.status(401).json({
                success: false,
                error: 'Token has been invalidated',
                code: 'TOKEN_BLACKLISTED',
                timestamp: new Date().toISOString()
            });
        }

        // Check cache first for performance
        const cacheKey = `user:${decoded.userId}`;
        let user = await getFromCache(cacheKey);

        if (!user) {
            // Fetch from database if not in cache
            user = await prisma.user.findUnique({
                where: { id: decoded.userId }, select: {
                    id: true,
                    email: true,
                    username: true,
                    roles: true,
                    status: true,
                    isActive: true,
                    emailVerified: true,
                    lastLoginAt: true,
                    createdAt: true,
                    updatedAt: true,
                },
            }); if (!user) {
                return res.status(401).json({
                    success: false,
                    error: 'User not found',
                    code: 'USER_NOT_FOUND',
                    timestamp: new Date().toISOString()
                });
            }            // Cache user data for 15 minutes
            await setToCache(cacheKey, user, 900);
        }

        // Check if user account is active
        if (user.status === 'BANNED') {
            // Log security event
            logger.logSecurity('BANNED_USER_ACCESS_ATTEMPT', req, { userId: user.id });

            return res.status(403).json({
                success: false,
                error: 'Account has been banned',
                code: 'ACCOUNT_BANNED',
                timestamp: new Date().toISOString()
            });
        }

        if (user.status === 'SUSPENDED') {
            return res.status(403).json({
                success: false,
                error: 'Account has been suspended',
                code: 'ACCOUNT_SUSPENDED',
                timestamp: new Date().toISOString()
            });
        }

        if (user.status === 'INACTIVE') {
            return res.status(403).json({
                success: false,
                error: 'Account is inactive',
                code: 'ACCOUNT_INACTIVE',
                timestamp: new Date().toISOString()
            });
        }

        if (user.status !== 'ACTIVE' && user.status !== 'PENDING_VERIFICATION') {
            return res.status(403).json({
                success: false,
                error: 'Account access denied',
                code: 'ACCOUNT_ACCESS_DENIED',
                status: user.status,
                timestamp: new Date().toISOString()
            });
        }

        // Add user to request object
        req.user = user;
        req.token = token;

        next();
    } catch (error) {
        console.error('[AUTH MIDDLEWARE ERROR]', error);
        if (error.name === 'JsonWebTokenError') {
            logger.logSecurity('INVALID_TOKEN', req, { error: error.message });
            return res.status(401).json({
                success: false,
                error: 'Invalid access token',
                code: 'TOKEN_INVALID',
                timestamp: new Date().toISOString()
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'Access token expired',
                code: 'TOKEN_EXPIRED',
                timestamp: new Date().toISOString()
            });
        }

        logger.logError(error, req);
        return res.status(500).json({
            error: 'Authentication failed',
            code: 'AUTH_ERROR',
            timestamp: new Date().toISOString(),
            details: error.message,
            stack: error.stack
        });
    }
};

// roles-based authorization middleware
const authorize = (...allowedroles) => {
    return (req, res, next) => {
        if (!req.user || !Array.isArray(req.user.roles)) {
            return res.status(403).json({ success: false, error: 'Forbidden: No roles assigned' });
        }
        // Check if user has at least one allowed roles
        const hasroles = req.user.roles.some(roles => allowedroles.includes(roles));
        if (!hasroles) {
            return res.status(403).json({ success: false, error: 'Forbidden: Insufficient roles' });
        }
        next();
    };
};

// Admin middleware (shorthand for admin/moderator roles)
const adminOnly = authorize('ADMIN', 'MODERATOR');

// Super admin middleware (admin only)
const superAdminOnly = authorize('ADMIN');

// Self or admin middleware (users can access their own data, admins can access any)
const selfOrAdmin = (paramName = 'userId') => {
    return (req, res, next) => {
        if (
            req.user.id === req.params[paramName] ||
            (Array.isArray(req.user.roles) && req.user.roles.includes('ADMIN'))
        ) {
            return next();
        }
        return res.status(403).json({ success: false, error: 'Forbidden: Not self or admin' });
    };
};

// Email verification required middleware
const requireEmailVerification = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required',
            code: 'AUTH_REQUIRED',
            timestamp: new Date().toISOString()
        });
    }

    if (!req.user.emailVerified) {
        return res.status(403).json({
            error: 'Email verification required',
            code: 'EMAIL_VERIFICATION_REQUIRED',
            timestamp: new Date().toISOString()
        });
    }

    next();
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
    try {
        // Extract token from cookies or Authorization header
        let token = req.cookies?.accessToken;

        if (!token) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7);
            }
        }

        if (!token) {
            return next(); // Continue without authentication
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check cache first
        const cacheKey = `user:${decoded.userId}`;
        let user = await getFromCache(cacheKey);

        if (!user) {
            user = await prisma.user.findUnique({
                where: { id: decoded.userId },
                select: {
                    id: true,
                    email: true,
                    username: true,
                    roles: true,
                    status: true,
                    emailVerified: true,
                },
            });

            if (user && user.status === 'ACTIVE') {
                await setToCache(cacheKey, user, 900);
            }
        }

        // Only add user if account is active
        if (user && user.status === 'ACTIVE') {
            req.user = user;
            req.token = token;
        }

        next();
    } catch (error) {
        // Silently continue without authentication if token is invalid
        next();
    }
};

// Token blacklisting utility
const blacklistToken = async (token, expiresIn = 86400) => {
    try {
        const blacklistKey = `blacklist:${token}`;
        await setToCache(blacklistKey, true, expiresIn);
        logger.info('Token blacklisted successfully');
    } catch (error) {
        logger.error('Failed to blacklist token:', error);
    }
};

// Clear user cache utility
const clearUserCache = async (userId) => {
    try {
        const cacheKey = `user:${userId}`;
        await deleteFromCache(cacheKey);
    } catch (error) {
        logger.error('Failed to clear user cache:', error);
    }
};

// roles-based authorization middleware
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

module.exports = {
    authenticate,
    authorize,
    adminOnly,
    superAdminOnly,
    selfOrAdmin,
    requireEmailVerification,
    optionalAuth,
    blacklistToken,
    clearUserCache,
    requireroles,
    requireAdmin,
    requireSuperAdmin,
};
