const Joi = require('joi');
const authService = require('../services/auth.service');
const { catchAsync, ValidationError, AuthError } = require('../utils/errors.utils');
const logger = require('../utils/logger.utils');

// Validation schemas
const registerSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
    }),
    password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]')).required().messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        'any.required': 'Password is required'
    }),
    username: Joi.string().alphanum().min(3).max(30).optional().messages({
        'string.alphanum': 'Username must only contain letters and numbers',
        'string.min': 'Username must be at least 3 characters long',
        'string.max': 'Username cannot exceed 30 characters'
    }),
    roles: Joi.array().items(Joi.string().valid('USER', 'INFLUENCER', 'BRAND', 'CREW', 'ADMIN', 'SUPER_ADMIN', 'MODERATOR')).min(1).default(['USER']),
    instagramHandle: Joi.string().allow('').optional().messages({
        'string.base': 'Instagram handle must be a string'
    })
});

const loginSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
    }),
    password: Joi.string().required().messages({
        'any.required': 'Password is required'
    }),
    rememberMe: Joi.boolean().default(false).messages({
        'boolean.base': 'Remember me must be a boolean value'
    })
});

const changePasswordSchema = Joi.object({
    currentPassword: Joi.string().required().messages({
        'any.required': 'Current password is required'
    }),
    newPassword: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]')).required().messages({
        'string.min': 'New password must be at least 8 characters long',
        'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        'any.required': 'New password is required'
    })
});

const emailSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
    })
});

/**
 * Register a new user
 */
const register = catchAsync(async (req, res) => {
    logger.info('Register endpoint hit', {
        body: req.body,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });

    // Validate input
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
        logger.warn('Validation error in register:', error.details[0].message);
        throw new ValidationError(error.details[0].message);
    }

    logger.info('Starting user registration process', { email: value.email });

    // Register user through service
    console.log('Registering user with data:', value);
    const user = await authService.register(value);

    console.log('User registered:', user);
    if (!user) {
        logger.error('User registration failed: service returned undefined');
        return res.status(500).json({ success: false, error: 'User registration failed' });
    }

    logger.info(`User registered successfully: ${user.email}`, {
        userId: user.id,
        email: user.email,
        roles: user.roles,
        ip: req.ip
    });

    // Cookie settings that support cross-origin development
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',  // ✅ Allow HTTP in dev
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',  // ✅ Allow cross-site
        domain: process.env.NODE_ENV === 'production' ? '.up.railway.app' : undefined
    };

    res.cookie('refreshToken', user.tokens.refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Set access token as cookie for easier API testing (Postman, etc.)
    res.cookie('accessToken', user.tokens.accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000 // 15 minutes (same as JWT expiry)
    });

    res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: user
    });
});

/**
 * Authenticate user
 */
const login = catchAsync(async (req, res) => {
    // Validate input
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
        throw new ValidationError(error.details[0].message);
    }

    // Login user through service
    const result = await authService.login(value);

    logger.info(`User logged in successfully: ${result.user.email}`, {
        userId: result.user.id,
        email: result.user.email,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });    // Cookie settings that support cross-origin development
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',  // ✅ Allow HTTP in dev
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',  // ✅ Allow cross-site
        domain: process.env.NODE_ENV === 'production' ? '.up.railway.app' : undefined
    };

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', result.tokens.refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Set access token as cookie for easier API testing (Postman, etc.)
    res.cookie('accessToken', result.tokens.accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000 // 15 minutes (same as JWT expiry)
    });

    res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
            user: result.user,
            accessToken: result.tokens.accessToken,
            refreshToken: result.tokens.refreshToken, // <-- Add refreshToken to response for tests
            expiresIn: result.tokens.expiresIn
        }
    });
});

/**
 * Refresh access token
 */
const refresh = catchAsync(async (req, res) => {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    // Enhanced debugging for refresh token issues
    console.log('🔄 Refresh Token Debug:', {
        hasCookies: !!req.cookies,
        cookieRefreshToken: req.cookies?.refreshToken ? 'Present' : 'Missing',
        bodyRefreshToken: req.body?.refreshToken ? 'Present' : 'Missing',
        headers: req.headers,
        body: req.body
    });

    if (!refreshToken) {
        console.log('❌ No refresh token found in cookies or body');
        throw new ValidationError('Refresh token is required');
    }

    // Refresh tokens through service
    const tokens = await authService.refreshToken(refreshToken);

    logger.info('Tokens refreshed successfully', {
        ip: req.ip
    });    // Cookie settings that support cross-origin development
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',  // ✅ Allow HTTP in dev
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',  // ✅ Allow cross-site
        domain: process.env.NODE_ENV === 'production' ? '.up.railway.app' : undefined
    };

    // Set new refresh token as httpOnly cookie
    res.cookie('refreshToken', tokens.refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Set new access token as cookie for easier API testing
    res.cookie('accessToken', tokens.accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000 // 15 minutes
    });

    res.status(200).json({
        success: true,
        message: 'Tokens refreshed successfully',
        data: {
            accessToken: tokens.accessToken,
            expiresIn: tokens.expiresIn
        }
    });
});

/**
 * Logout user
 */
const logout = catchAsync(async (req, res, next) => {
    try {
        const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
        const userId = req.user?.id;
        await authService.logout(refreshToken, userId);
        res.clearCookie('refreshToken');
        res.clearCookie('accessToken');
        logger.info('User logged out successfully', {
            userId,
            ip: req.ip
        });
        res.status(200).json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (err) {
        if (err instanceof ValidationError) {
            return res.status(400).json({ success: false, error: err.message });
        }
        if (err instanceof AuthError) {
            return res.status(401).json({ success: false, error: err.message });
        }
        next(err);
    }
});

const logoutAll = catchAsync(async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            throw new ValidationError('User ID is required for logout');
        }
        await authService.logoutAll(userId);
        res.clearCookie('refreshToken');
        res.clearCookie('accessToken');
        logger.info('User logged out from all sessions', {
            userId,
            ip: req.ip
        });
        res.status(200).json({
            success: true,
            message: 'Logged out from all devices successfully'
        });
    } catch (err) {
        if (err instanceof ValidationError) {
            return res.status(400).json({ success: false, error: err.message });
        }
        if (err instanceof AuthError) {
            return res.status(401).json({ success: false, error: err.message });
        }
        next(err);
    }
});

const changePassword = catchAsync(async (req, res, next) => {
    try {
        const { error, value } = changePasswordSchema.validate(req.body);
        if (error) {
            throw new ValidationError(error.details[0].message);
        }
        const userId = req.user.id;
        await authService.changePassword(userId, value.currentPassword, value.newPassword);
        logger.info('Password changed successfully', {
            userId,
            ip: req.ip
        });
        res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (err) {
        if (err instanceof ValidationError) {
            return res.status(400).json({ success: false, error: err.message });
        }
        if (err instanceof AuthError) {
            return res.status(401).json({ success: false, error: err.message });
        }
        next(err);
    }
});

/**
 * Request password reset
 */
const requestPasswordReset = catchAsync(async (req, res) => {
    // Validate input
    const { error, value } = emailSchema.validate(req.body);
    if (error) {
        throw new ValidationError(error.details[0].message);
    }

    // Request password reset through service
    const result = await authService.requestPasswordReset(value.email);

    logger.info('Password reset requested', {
        email: value.email,
        ip: req.ip
    });

    res.status(200).json({
        success: true,
        message: result.message
    });
});

/**
 * Verify email
 */
const verifyEmail = catchAsync(async (req, res) => {
    const { token } = req.params;

    if (!token) {
        throw new ValidationError('Verification token is required');
    }

    // Verify email through service
    const result = await authService.verifyEmail(token);

    logger.info('Email verification requested', {
        token: token.substring(0, 10) + '...',
        ip: req.ip
    });

    res.status(200).json({
        success: true,
        message: result.message
    });
});

/**
 * Setup 2FA (placeholder for future implementation)
 */
const setup2FA = catchAsync(async (req, res) => {
    logger.info('2FA setup requested', {
        userId: req.user.id,
        ip: req.ip
    });

    res.status(200).json({
        success: true,
        message: '2FA setup feature coming soon'
    });
});

/**
 * Verify 2FA (placeholder for future implementation)
 */
const verify2FA = catchAsync(async (req, res) => {
    logger.info('2FA verification requested', {
        userId: req.user.id,
        ip: req.ip
    });

    res.status(200).json({
        success: true,
        message: '2FA verification feature coming soon'
    });
});

/**
 * Disable 2FA (placeholder for future implementation)
 */
const disable2FA = catchAsync(async (req, res) => {
    logger.info('2FA disable requested', {
        userId: req.user.id,
        ip: req.ip
    });

    res.status(200).json({
        success: true,
        message: '2FA disable feature coming soon'
    });
});

module.exports = {
    register,
    login,
    refresh,
    logout,
    logoutAll,
    changePassword,
    requestPasswordReset,
    verifyEmail,
    setup2FA,
    verify2FA,
    disable2FA
};

// Global error handler for async routes (for direct use in tests or if not handled by middleware)
if (process.env.NODE_ENV === 'test') {
    process.on('unhandledRejection', (error) => {
        if (error && error.stack) {
            console.error('Unhandled rejection stack:', error.stack);
        }
        try { console.error('Unhandled rejection details:', JSON.stringify(error)); } catch { }
    });
}
