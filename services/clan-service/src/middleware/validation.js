/**
 * Validation middleware for clan operations
 */

const { body, param, query, validationResult } = require('express-validator');

/**
 * Validate clan creation data
 */
const validateClanCreation = [
    // Basic required fields
    body('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Clan name must be between 2 and 100 characters')
        .matches(/^[a-zA-Z0-9\s\-_\.]+$/)
        .withMessage('Clan name can only contain letters, numbers, spaces, hyphens, underscores, and dots')
        .notEmpty()
        .withMessage('Clan name is required'),

    body('description')
        .trim()
        .isLength({ min: 10, max: 1000 })
        .withMessage('Description must be between 10 and 1000 characters')
        .notEmpty()
        .withMessage('Description is required'),

    // Optional fields with validation
    body('tagline')
        .optional()
        .trim()
        .isLength({ min: 5, max: 200 })
        .withMessage('Tagline must be between 5 and 200 characters'),

    body('visibility')
        .optional()
        .isIn(['PUBLIC', 'PRIVATE', 'INVITE_ONLY'])
        .withMessage('Visibility must be PUBLIC, PRIVATE, or INVITE_ONLY'),

    body('primaryCategory')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Primary category must be between 2 and 50 characters'),

    body('categories')
        .optional()
        .isArray({ min: 0, max: 10 })
        .withMessage('Categories must be an array with maximum 10 items')
        .custom((categories) => {
            if (categories && categories.length > 0) {
                for (let category of categories) {
                    if (typeof category !== 'string' || category.trim().length < 2 || category.trim().length > 50) {
                        throw new Error('Each category must be a string between 2 and 50 characters');
                    }
                }
            }
            return true;
        }),

    body('skills')
        .optional()
        .isArray({ min: 0, max: 20 })
        .withMessage('Skills must be an array with maximum 20 items')
        .custom((skills) => {
            if (skills && skills.length > 0) {
                for (let skill of skills) {
                    if (typeof skill !== 'string' || skill.trim().length < 2 || skill.trim().length > 50) {
                        throw new Error('Each skill must be a string between 2 and 50 characters');
                    }
                }
            }
            return true;
        }),

    body('location')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Location must be between 2 and 100 characters'),

    body('timezone')
        .optional()
        .trim()
        .matches(/^[A-Za-z_]+(\/[A-Za-z_]+)*$/)
        .withMessage('Timezone must be in valid format (e.g., UTC, America/New_York)'),

    body('maxMembers')
        .optional()
        .isInt({ min: 2, max: 255 })
        .withMessage('Max members must be between 2 and 255'),

    body('requiresApproval')
        .optional()
        .isBoolean()
        .withMessage('Requires approval must be a boolean'),

    body('isPaidMembership')
        .optional()
        .isBoolean()
        .withMessage('Is paid membership must be a boolean'),

    body('membershipFee')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Membership fee must be a positive number'),

    // Social media handles
    body('email')
        .optional()
        .isEmail()
        .withMessage('Email must be a valid email address'),

    body('website')
        .optional()
        .isURL()
        .withMessage('Website must be a valid URL'),

    body('instagramHandle')
        .optional()
        .trim()
        .matches(/^[a-zA-Z0-9._]+$/)
        .withMessage('Instagram handle can only contain letters, numbers, dots, and underscores'),

    body('twitterHandle')
        .optional()
        .trim()
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Twitter handle can only contain letters, numbers, and underscores'),

    body('linkedinHandle')
        .optional()
        .trim()
        .matches(/^[a-zA-Z0-9\-]+$/)
        .withMessage('LinkedIn handle can only contain letters, numbers, and hyphens'),

    // Portfolio arrays
    body('portfolioImages')
        .optional()
        .isArray({ min: 0, max: 20 })
        .withMessage('Portfolio images must be an array with maximum 20 items')
        .custom((images) => {
            if (images && images.length > 0) {
                for (let image of images) {
                    if (typeof image !== 'string' || !image.trim()) {
                        throw new Error('Each portfolio image must be a non-empty string');
                    }
                }
            }
            return true;
        }),

    body('portfolioVideos')
        .optional()
        .isArray({ min: 0, max: 10 })
        .withMessage('Portfolio videos must be an array with maximum 10 items')
        .custom((videos) => {
            if (videos && videos.length > 0) {
                for (let video of videos) {
                    if (typeof video !== 'string' || !video.trim()) {
                        throw new Error('Each portfolio video must be a non-empty string');
                    }
                }
            }
            return true;
        }),

    body('showcaseProjects')
        .optional()
        .isArray({ min: 0, max: 15 })
        .withMessage('Showcase projects must be an array with maximum 15 items')
        .custom((projects) => {
            if (projects && projects.length > 0) {
                for (let project of projects) {
                    if (typeof project !== 'string' || !project.trim()) {
                        throw new Error('Each showcase project must be a non-empty string');
                    }
                }
            }
            return true;
        }),

    // Check for validation errors
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array().map(err => ({
                    field: err.path,
                    message: err.msg,
                    value: err.value
                }))
            });
        }
        next();
    }
];

/**
 * Validate clan update data
 */
const validateClanUpdate = [
    // Clan ID validation
    param('clanId')
        .isUUID()
        .withMessage('Invalid clan ID format'),

    // All fields are optional for updates, but if provided, they must be valid
    body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Clan name must be between 2 and 100 characters')
        .matches(/^[a-zA-Z0-9\s\-_\.]+$/)
        .withMessage('Clan name can only contain letters, numbers, spaces, hyphens, underscores, and dots'),

    body('description')
        .optional()
        .trim()
        .isLength({ min: 10, max: 1000 })
        .withMessage('Description must be between 10 and 1000 characters'),

    body('tagline')
        .optional()
        .trim()
        .isLength({ min: 5, max: 200 })
        .withMessage('Tagline must be between 5 and 200 characters'),

    body('visibility')
        .optional()
        .isIn(['PUBLIC', 'PRIVATE', 'INVITE_ONLY'])
        .withMessage('Visibility must be PUBLIC, PRIVATE, or INVITE_ONLY'),

    body('primaryCategory')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Primary category must be between 2 and 50 characters'),

    body('categories')
        .optional()
        .isArray({ min: 0, max: 10 })
        .withMessage('Categories must be an array with maximum 10 items'),

    body('skills')
        .optional()
        .isArray({ min: 0, max: 20 })
        .withMessage('Skills must be an array with maximum 20 items'),

    body('location')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Location must be between 2 and 100 characters'),

    body('timezone')
        .optional()
        .trim()
        .matches(/^[A-Za-z_]+(\/[A-Za-z_]+)*$/)
        .withMessage('Timezone must be in valid format'),

    body('maxMembers')
        .optional()
        .isInt({ min: 2, max: 255 })
        .withMessage('Max members must be between 2 and 255'),

    body('requiresApproval')
        .optional()
        .isBoolean()
        .withMessage('Requires approval must be a boolean'),

    body('isPaidMembership')
        .optional()
        .isBoolean()
        .withMessage('Is paid membership must be a boolean'),

    body('membershipFee')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Membership fee must be a positive number'),

    body('email')
        .optional()
        .isEmail()
        .withMessage('Email must be a valid email address'),

    body('website')
        .optional()
        .isURL()
        .withMessage('Website must be a valid URL'),

    body('instagramHandle')
        .optional()
        .trim()
        .matches(/^[a-zA-Z0-9._]+$/)
        .withMessage('Instagram handle can only contain letters, numbers, dots, and underscores'),

    body('twitterHandle')
        .optional()
        .trim()
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Twitter handle can only contain letters, numbers, and underscores'),

    body('linkedinHandle')
        .optional()
        .trim()
        .matches(/^[a-zA-Z0-9\-]+$/)
        .withMessage('LinkedIn handle can only contain letters, numbers, and hyphens'),

    body('portfolioImages')
        .optional()
        .isArray({ min: 0, max: 20 })
        .withMessage('Portfolio images must be an array with maximum 20 items'),

    body('portfolioVideos')
        .optional()
        .isArray({ min: 0, max: 10 })
        .withMessage('Portfolio videos must be an array with maximum 10 items'),

    body('showcaseProjects')
        .optional()
        .isArray({ min: 0, max: 15 })
        .withMessage('Showcase projects must be an array with maximum 15 items'),

    // Check for validation errors
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array().map(err => ({
                    field: err.path,
                    message: err.msg,
                    value: err.value
                }))
            });
        }
        next();
    }
];

/**
 * Validate clan ID parameter
 */
const validateClanId = [
    param('clanId')
        .matches(/^c[a-z0-9]{24}$/)
        .withMessage('Invalid clan ID format - must be a valid CUID'),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array().map(err => ({
                    field: err.path,
                    message: err.msg,
                    value: err.value
                }))
            });
        }
        next();
    }
];

/**
 * Validate query parameters for clan listing
 */
const validateClanQuery = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),

    query('category')
        .optional()
        .custom((value) => {
            if (value === undefined || value === null || value === '') {
                return true; // Allow empty/undefined values
            }
            if (typeof value === 'string' && value.trim().length >= 2 && value.trim().length <= 50) {
                return true;
            }
            throw new Error('Category must be between 2 and 50 characters');
        }),

    query('location')
        .optional()
        .custom((value) => {
            if (value === undefined || value === null || value === '') {
                return true; // Allow empty/undefined values
            }
            if (typeof value === 'string' && value.trim().length >= 2 && value.trim().length <= 100) {
                return true;
            }
            throw new Error('Location must be between 2 and 100 characters');
        }),

    query('visibility')
        .optional()
        .isIn(['PUBLIC', 'PRIVATE', 'INVITE_ONLY'])
        .withMessage('Visibility must be PUBLIC, PRIVATE, or INVITE_ONLY'),

    query('isVerified')
        .optional()
        .isIn(['true', 'false'])
        .withMessage('Is verified must be true or false'),

    query('minMembers')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Min members must be a non-negative integer'),

    query('maxMembers')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Max members must be a positive integer'),

    query('sortBy')
        .optional()
        .isIn(['reputationScore', 'score', 'rank', 'name', 'createdAt', 'memberCount', 'totalGigs', 'averageRating'])
        .withMessage('Sort by must be reputationScore, score, rank, name, createdAt, memberCount, totalGigs, or averageRating'),

    query('order')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('Order must be asc or desc'),

    // Check for validation errors
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array().map(err => ({
                    field: err.path,
                    message: err.msg,
                    value: err.value
                }))
            });
        }
        next();
    }
];

module.exports = {
    validateClanCreation,
    validateClanUpdate,
    validateClanId,
    validateClanQuery
};
