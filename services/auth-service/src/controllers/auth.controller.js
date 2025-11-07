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
    username: Joi.string().min(3).max(30).pattern(/^[a-zA-Z0-9._-]+$/).optional().messages({
        'string.pattern.base': 'Username can only contain letters, numbers, periods, underscores, and hyphens',
        'string.min': 'Username must be at least 3 characters long',
        'string.max': 'Username cannot exceed 30 characters'
    }),
    roles: Joi.array().items(Joi.string().valid('USER', 'INFLUENCER', 'BRAND', 'CREW', 'ADMIN', 'SUPER_ADMIN', 'MODERATOR')).min(1).default(['USER']),
    instagramHandle: Joi.string().allow('').optional().messages({
        'string.base': 'Instagram handle must be a string'
    }),
    isAgreedToTermsAndRefundPolicy: Joi.boolean().valid(true).required().messages({
        'any.only': 'You must agree to the Terms of Service and Refund Policy to create an account',
        'any.required': 'Agreement to Terms of Service and Refund Policy is required'
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
    // Sanitize body for logging (remove sensitive fields)
    const sanitizedBody = req.body ? { ...req.body } : {};
    if (sanitizedBody.password) sanitizedBody.password = '[REDACTED]';

    logger.info('Register endpoint hit', {
        body: sanitizedBody,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });
    console.log('Register request body:', sanitizedBody);
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

    logger.info(`User registered successfully: ${user.user?.email}`, {
        userId: user.user?.id,
        email: user.user?.email,
        roles: user.user?.roles,
        ip: req.ip
    });

    // Check if this is the new OTP flow (no tokens) or legacy flow (with tokens)
    if (user.tokens) {
        // Legacy flow - set cookies and return tokens
        const isProduction = process.env.NODE_ENV === 'production';
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            domain: process.env.NODE_ENV === 'production' ? '.50brains.in' : undefined
        };

        res.cookie('refreshToken', user.tokens.refreshToken, {
            ...cookieOptions,
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.cookie('accessToken', user.tokens.accessToken, {
            ...cookieOptions,
            maxAge: 15 * 60 * 1000 // 15 minutes
        });

        console.log('🍪 Cookies set in register:', {
            refreshTokenCookie: 'Set',
            accessTokenCookie: 'Set',
            domain: cookieOptions.domain,
            secure: cookieOptions.secure
        });

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: user
        });
    } else {
        // New OTP flow - no tokens, user needs to verify email
        res.status(201).json({
            success: true,
            message: user.message,
            data: {
                user: user.user,
                otpSent: user.otpSent,
                nextStep: user.nextStep
            }
        });
    }
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
    });    // Cookie settings that support cross-origin development and production
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
        httpOnly: true,
        secure: isProduction,  // HTTPS only in production
        sameSite: isProduction ? 'none' : 'lax',  // Allow cross-site in production
        domain: isProduction ? process.env.COOKIE_DOMAIN || '.50brains.in' : undefined  // Configurable domain
    };

    console.log('🍪 Cookie Configuration:', {
        isProduction,
        domain: cookieOptions.domain,
        secure: cookieOptions.secure,
        sameSite: cookieOptions.sameSite,
        actualDomain: req.get('host'),
        origin: req.get('origin'),
        COOKIE_DOMAIN_ENV: process.env.COOKIE_DOMAIN
    });

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

    console.log('🍪 Login cookies set:', {
        refreshTokenCookie: 'Set',
        accessTokenCookie: 'Set',
        domain: cookieOptions.domain,
        secure: cookieOptions.secure
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
    const debugInfo = {
        hasCookies: !!req.cookies,
        cookieRefreshToken: req.cookies?.refreshToken ? 'Present' : 'Missing',
        bodyRefreshToken: req.body?.refreshToken ? 'Present' : 'Missing',
        cookieNames: Object.keys(req.cookies || {}),
        userAgent: req.get('User-Agent'),
        host: req.get('host'),
        origin: req.get('origin'),
        referer: req.get('referer'),
        refreshTokenLength: req.cookies?.refreshToken ? req.cookies.refreshToken.length : 0,
        NODE_ENV: process.env.NODE_ENV
    };
    console.log('🔄 Refresh Token Debug:', debugInfo);
    // Explicit production debug (bypasses compression)
    if (process.env.NODE_ENV === 'production') {
        console.log('[PROD-DEBUG] Refresh Debug - Has Cookies:', !!req.cookies);
        console.log('[PROD-DEBUG] Refresh Debug - Cookie Token:', req.cookies?.refreshToken ? 'PRESENT' : 'MISSING');
        console.log('[PROD-DEBUG] Refresh Debug - Host:', req.get('host'));
        console.log('[PROD-DEBUG] Refresh Debug - Origin:', req.get('origin'));
    }

    if (!refreshToken) {
        console.log('❌ No refresh token found in cookies or body');
        throw new ValidationError('Refresh token is required');
    }

    // Refresh tokens through service
    const tokens = await authService.refreshToken(refreshToken);

    logger.info('Tokens refreshed successfully', {
        ip: req.ip
    });

    // Cookie settings that support cross-origin development and production
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
        httpOnly: true,
        secure: isProduction,  // HTTPS only in production
        sameSite: isProduction ? 'none' : 'lax',  // Allow cross-site in production
        domain: isProduction ? process.env.COOKIE_DOMAIN || '.50brains.in' : undefined  // Configurable domain
    };

    const cookieDebugInfo = {
        isProduction,
        domain: cookieOptions.domain,
        secure: cookieOptions.secure,
        sameSite: cookieOptions.sameSite,
        actualDomain: req.get('host'),
        origin: req.get('origin'),
        COOKIE_DOMAIN_ENV: process.env.COOKIE_DOMAIN
    };
    console.log('🍪 Refresh Cookie Configuration:', cookieDebugInfo);
    // Explicit production debug (bypasses compression)
    if (process.env.NODE_ENV === 'production') {
        console.log('[PROD-DEBUG] Cookie Config - Domain:', cookieOptions.domain);
        console.log('[PROD-DEBUG] Cookie Config - Secure:', cookieOptions.secure);
        console.log('[PROD-DEBUG] Cookie Config - SameSite:', cookieOptions.sameSite);
        console.log('[PROD-DEBUG] Cookie Config - ENV Domain:', process.env.COOKIE_DOMAIN);
    }

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

    console.log('🍪 Refresh tokens cookies set:', {
        refreshTokenCookie: 'Set',
        accessTokenCookie: 'Set',
        domain: cookieOptions.domain,
        secure: cookieOptions.secure
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

const deactivateAccount = catchAsync(async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const password = req.body.password;
        if (!userId) {
            throw new ValidationError('User ID is required for account deactivation');
        }
        if (!password) {
            throw new ValidationError('Password is required for account deactivation');
        }
        await authService.deactivateAccount(userId, password);
        res.clearCookie('refreshToken');
        res.clearCookie('accessToken');
        logger.info('User account deactivated successfully', {
            userId,
            ip: req.ip
        });
        res.status(200).json({
            success: true,
            message: 'Account deactivated successfully'
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

const deleteAccount = catchAsync(async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const password = req.body.password;
        if (!userId) {
            throw new ValidationError('User ID is required for account deletion');
        }
        await authService.deleteAccount(userId, password);
        res.clearCookie('refreshToken');
        res.clearCookie('accessToken');
        logger.info('User account deleted successfully', {
            userId,
            ip: req.ip
        });
        res.status(200).json({ success: true, message: 'Account deleted successfully' });
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

// Validation schemas for profile updates
const updateUsernameSchema = Joi.object({
    username: Joi.string().min(3).max(30).pattern(/^[a-zA-Z0-9._-]+$/).required().messages({
        'string.pattern.base': 'Username can only contain letters, numbers, periods, underscores, and hyphens',
        'string.min': 'Username must be at least 3 characters long',
        'string.max': 'Username cannot exceed 30 characters',
        'any.required': 'Username is required'
    })
});

const initiateEmailUpdateSchema = Joi.object({
    newEmail: Joi.string().email().required().messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'New email is required'
    })
});

const completeEmailUpdateSchema = Joi.object({
    newEmail: Joi.string().email().required().messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'New email is required'
    }),
    otp: Joi.string().length(6).pattern(/^\d+$/).required().messages({
        'string.length': 'OTP must be 6 digits',
        'string.pattern.base': 'OTP must contain only numbers',
        'any.required': 'OTP is required'
    })
});

/**
 * Update username
 */
const updateUsername = catchAsync(async (req, res) => {
    // Validate input
    const { error, value } = updateUsernameSchema.validate(req.body);
    if (error) {
        throw new ValidationError(error.details[0].message);
    }

    const userId = req.user.id;

    // Update username through service
    const result = await authService.updateUsername(userId, value.username);

    logger.info(`Username updated successfully: ${req.user.email}`, {
        userId,
        oldUsername: req.user.username,
        newUsername: value.username,
        ip: req.ip
    });

    res.status(200).json({
        success: true,
        message: result.message,
        data: result.data
    });
});

/**
 * Initiate email update
 */
const initiateEmailUpdate = catchAsync(async (req, res) => {
    // Validate input
    const { error, value } = initiateEmailUpdateSchema.validate(req.body);
    if (error) {
        throw new ValidationError(error.details[0].message);
    }

    const userId = req.user.id;

    // Initiate email update through service
    const result = await authService.initiateEmailUpdate(userId, value.newEmail);

    logger.info(`Email update initiated: ${req.user.email} -> ${value.newEmail}`, {
        userId,
        currentEmail: req.user.email,
        newEmail: value.newEmail,
        ip: req.ip
    });

    res.status(200).json({
        success: true,
        message: result.message,
        data: result.data
    });
});

/**
 * Complete email update
 */
const completeEmailUpdate = catchAsync(async (req, res) => {
    // Validate input
    const { error, value } = completeEmailUpdateSchema.validate(req.body);
    if (error) {
        throw new ValidationError(error.details[0].message);
    }

    const userId = req.user.id;

    // Complete email update through service
    const result = await authService.completeEmailUpdate(userId, value.newEmail, value.otp);

    logger.info(`Email updated successfully: ${req.user.email} -> ${value.newEmail}`, {
        userId,
        oldEmail: req.user.email,
        newEmail: value.newEmail,
        ip: req.ip
    });

    res.status(200).json({
        success: true,
        message: result.message,
        data: result.data
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
    disable2FA,
    deactivateAccount,
    deleteAccount,
    updateUsername,
    initiateEmailUpdate,
    completeEmailUpdate
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
