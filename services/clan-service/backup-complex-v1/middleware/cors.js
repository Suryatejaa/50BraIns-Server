/**
 * CORS Handler Middleware
 * Handles Cross-Origin Resource Sharing for API Gateway integration
 * Note: Main CORS is handled by API Gateway, this is for fallback
 */

module.exports = (req, res, next) => {
    // Set CORS headers for API Gateway integration
    res.header('Access-Control-Allow-Origin', process.env.GATEWAY_URL || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-user-id, x-user-email, x-user-roles');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400'); // 24 hours

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    next();
};
