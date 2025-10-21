// JWT authentication middleware
const authenticateJWT = (req, res, next) => {
    const userId = req.headers['x-user-id'];
    const userEmail = req.headers['x-user-email'];
    const userRoles = req.headers['x-user-roles'];
    const isAdmin = req.headers['x-user-is-admin'];

    // If we have user headers from API Gateway, use them
    if (userId && userId !== 'undefined') {
        req.user = {
            id: userId,
            email: userEmail || 'user@example.com',
            roles: userRoles ? userRoles.split(',') : ['user'],
            isAdmin: isAdmin === 'true',
            role: userRoles ? userRoles.split(',')[0] : 'USER'
        };
        return next();
    }

    // Check for Authorization header as fallback
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        // For development/testing - extract user ID from token
        // In production, this would validate the JWT token
        const token = authHeader.substring(7);

        // Simple token parsing for development (replace with proper JWT validation)
        try {
            // This is a simplified approach - in production use proper JWT verification
            req.user = {
                id: 'test-user-123', // In production, extract from validated JWT
                email: 'test@example.com',
                roles: ['user'],
                isAdmin: false,
                role: 'USER'
            };
            return next();
        } catch (error) {
            console.error('Token validation error:', error);
        }
    }

    // No valid authentication found
    return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Please provide valid authentication credentials',
        code: 'MISSING_AUTH',
        timestamp: new Date().toISOString()
    });
};

// Admin authorization middleware
const requireAdmin = (req, res, next) => {
    if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN')) {
        return res.status(403).json({
            success: false,
            error: 'Admin access required',
            message: 'This endpoint requires administrative privileges',
            code: 'INSUFFICIENT_PERMISSIONS',
            timestamp: new Date().toISOString()
        });
    }
    next();
};

module.exports = {
    authenticateJWT,
    requireAdmin
};
