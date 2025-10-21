const rateLimit = require('express-rate-limit');

// Payment rate limiting - very restrictive for security
const paymentRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Only 5 payment attempts per 15 minutes per user
    keyGenerator: (req) => {
        // Rate limit based on user ID if available, otherwise IP
        return req.user?.id || req.ip;
    },
    message: {
        success: false,
        error: 'Too many payment attempts',
        message: 'You have exceeded the payment attempt limit. Please try again later.',
        retryAfter: '15 minutes',
        timestamp: new Date().toISOString()
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        console.warn(`Payment rate limit exceeded for user: ${req.user?.id || req.ip}`);
        res.status(429).json({
            success: false,
            error: 'Too many payment attempts',
            message: 'You have exceeded the payment attempt limit. Please try again later.',
            retryAfter: '15 minutes',
            timestamp: new Date().toISOString()
        });
    }
});

// General API rate limiting
const generalRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes per IP
    message: {
        success: false,
        error: 'Too many requests',
        message: 'You have exceeded the request limit. Please try again later.',
        retryAfter: '15 minutes',
        timestamp: new Date().toISOString()
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Boost operation rate limiting
const boostRateLimit = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // 10 boost attempts per 5 minutes per user
    keyGenerator: (req) => {
        return req.user?.id || req.ip;
    },
    message: {
        success: false,
        error: 'Too many boost attempts',
        message: 'You have exceeded the boost attempt limit. Please try again later.',
        retryAfter: '5 minutes',
        timestamp: new Date().toISOString()
    },
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = {
    paymentRateLimit,
    generalRateLimit,
    boostRateLimit
};
