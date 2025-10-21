// src/utils/auth.js
/**
 * Extract user information from API Gateway headers
 * Gateway forwards user info in headers after authentication
 */
const getUserFromHeaders = (req) => {
    const userId = req.headers['x-user-id'];
    const userEmail = req.headers['x-user-email'];
    const userRoles = req.headers['x-user-roles'];
    const isAdmin = req.headers['x-user-is-admin'];

    if (!userId || !userEmail) {
        return null; // No user authentication info
    }

    return {
        id: userId,
        email: userEmail,
        roles: userRoles ? userRoles.split(',').map(r => r.trim()) : ['USER'],
        isAdmin: isAdmin === 'true'
    };
};

/**
 * Check if user is authorized to access a resource
 * @param {Object} user - User object from headers
 * @param {string} resourceUserId - The user ID of the resource being accessed
 * @param {string[]} allowedRoles - Roles that can access the resource
 */
const isAuthorized = (user, resourceUserId = null, allowedRoles = []) => {
    if (!user) return false;

    // Check if user is accessing their own resource
    if (resourceUserId && user.id === resourceUserId) {
        return true;
    }

    // Check if user has admin privileges
    if (user.isAdmin || (Array.isArray(user.roles) && user.roles.some(r => ['ADMIN', 'SUPER_ADMIN'].includes(r)))) {
        return true;
    }

    // Check if user has any of the allowed roles
    if (allowedRoles.length > 0 && Array.isArray(user.roles)) {
        return user.roles.some(role => allowedRoles.includes(role));
    }

    return false;
};

/**
 * Middleware replacement to add user to req object from headers
 */
const addUserToRequest = (req, res, next) => {
    req.user = getUserFromHeaders(req);
    next();
};

module.exports = {
    getUserFromHeaders,
    isAuthorized,
    addUserToRequest
};
