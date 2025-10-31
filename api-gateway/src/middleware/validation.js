const Joi = require("joi");
const logger = require("../utils/logger");

// Common validation schemas
const commonSchemas = {
    id: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
            "string.pattern.base": "Invalid ID format",
            "any.required": "ID is required",
        }),

    email: Joi.string().email().required().messages({
        "string.email": "Please provide a valid email address",
        "any.required": "Email is required",
    }),

    password: Joi.string()
        .min(8)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .messages({
            "string.min": "Password must be at least 8 characters long",
            "string.pattern.base":
                "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
        }),

    pagination: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(10),
        sort: Joi.string()
            .valid("asc", "desc", "ascending", "descending")
            .default("desc"),
        sortBy: Joi.string().default("createdAt"),
    }),
};

// Request validation schemas by route
const validationSchemas = {
    // Auth routes
    "POST:/api/auth/register": {
        body: Joi.object({
            email: commonSchemas.email,
            password: commonSchemas.password.required(),
            firstName: Joi.string().min(1).max(50).optional().messages({
                'string.min': 'First name must be at least 1 character long',
                'string.max': 'First name cannot exceed 50 characters'
            }),
            lastName: Joi.string().min(1).max(50).optional().messages({
                'string.min': 'Last name must be at least 1 character long',
                'string.max': 'Last name cannot exceed 50 characters'
            }),
            username: Joi.string().min(3).max(30).pattern(/^[a-zA-Z0-9._-]+$/).optional().messages({
                'string.pattern.base': 'Username can only contain letters, numbers, periods, underscores, and hyphens',
                'string.min': 'Username must be at least 3 characters long',
                'string.max': 'Username cannot exceed 30 characters'
            }),
            roles: Joi.array()
                .items(
                    Joi.string().valid(
                        "USER",
                        "INFLUENCER",
                        "BRAND",
                        "CREW",
                        "ADMIN",
                        "SUPER_ADMIN",
                        "MODERATOR",
                        "WRITER",
                        "EDITOR",
                    ),
                )
                .min(1)
                .default(["USER"]),
            instagramHandle: Joi.string().allow('').optional().messages({
                'string.base': 'Instagram handle must be a string'
            })
        }),
    },

    "POST:/api/auth/login": {
        body: Joi.object({
            email: commonSchemas.email,
            password: Joi.string().required().messages({
                "any.required": "Password is required",
            }),
            rememberMe: Joi.boolean().default(false),
        }),
    },

    "POST:/api/auth/forgot-password": {
        body: Joi.object({
            email: commonSchemas.email,
        }),
    },

    "POST:/api/auth/reset-password": {
        body: Joi.object({
            email: commonSchemas.email,
            otp: Joi.string().length(6).pattern(/^\d+$/).required().messages({
                "string.length": "OTP must be exactly 6 digits",
                "string.pattern.base": "OTP must contain only numbers",
                "any.required": "OTP is required",
            }),
            newPassword: commonSchemas.password.required(),
            confirmPassword: Joi.string()
                .valid(Joi.ref("newPassword"))
                .required()
                .messages({
                    "any.only": "Password confirmation must match password",
                }),
        }),
    },

    // OTP-based authentication routes
    "POST:/api/auth/verify-registration-otp": {
        body: Joi.object({
            email: commonSchemas.email,
            otp: Joi.string().length(6).pattern(/^\d+$/).required().messages({
                "string.length": "OTP must be exactly 6 digits",
                "string.pattern.base": "OTP must contain only numbers",
                "any.required": "OTP is required",
            }),
        }),
    },

    "POST:/api/auth/otp-login/initiate": {
        body: Joi.object({
            email: commonSchemas.email,
        }),
    },

    "POST:/api/auth/otp-login/complete": {
        body: Joi.object({
            email: commonSchemas.email,
            otp: Joi.string().length(6).pattern(/^\d+$/).required().messages({
                "string.length": "OTP must be exactly 6 digits",
                "string.pattern.base": "OTP must contain only numbers",
                "any.required": "OTP is required",
            }),
        }),
    },

    "POST:/api/auth/change-password/initiate": {
        body: Joi.object({
            currentPassword: Joi.string().required().messages({
                "any.required": "Current password is required",
            })
        }),
    },

    "POST:/api/auth/change-password/complete": {
        body: Joi.object({
            otp: Joi.string().length(6).pattern(/^\d+$/).required().messages({
                "string.length": "OTP must be exactly 6 digits",
                "string.pattern.base": "OTP must contain only numbers",
                "any.required": "OTP is required",
            }),
            newPassword: commonSchemas.password.required(),
            confirmPassword: Joi.string()
                .valid(Joi.ref("newPassword"))
                .required()
                .messages({
                    "any.only": "Password confirmation must match new password",
                }),
        }),
    },

    "PUT:/api/auth/profile": {
        body: Joi.object({
            firstName: Joi.string().min(1).max(50),
            lastName: Joi.string().min(1).max(50),
            email: commonSchemas.email.optional(),
            bio: Joi.string().max(500).allow(""),
            avatar: Joi.string().uri().allow(""),
        }).min(1),
    },

    // Clan feed route - allows empty strings for search functionality
    "GET:/api/clans/feed": {
        query: Joi.object({
            category: Joi.string().allow('').optional(),
            location: Joi.string().allow('').optional(),
            visibility: Joi.string().valid('PUBLIC', 'PRIVATE', 'INVITE_ONLY').optional(),
            isVerified: Joi.string().valid('true', 'false').optional(),
            minMembers: Joi.number().integer().min(0).optional(),
            maxMembers: Joi.number().integer().min(1).optional(),
            sortBy: Joi.string().valid('reputationScore', 'score', 'rank', 'name', 'createdAt', 'memberCount', 'totalGigs', 'averageRating').optional(),
            order: Joi.string().valid('asc', 'desc').optional(),
            page: Joi.number().integer().min(1).optional(),
            limit: Joi.number().integer().min(1).max(100).optional(),
        }),
    },

    // Clan ID route - allows CUID format IDs
    "GET:/api/clans/*": {
        params: Joi.object({
            clanId: Joi.string().pattern(/^c[a-z0-9]{24}$/).required().messages({
                "string.pattern.base": "Invalid clan ID format - must be a valid CUID",
                "any.required": "Clan ID is required",
            }),
        }),
    },

    // Alternative pattern for clan ID routes
    "*:/api/clans/*": {
        params: Joi.object({
            clanId: Joi.string().pattern(/^c[a-z0-9]{24}$/).required().messages({
                "string.pattern.base": "Invalid clan ID format - must be a valid CUID",
                "any.required": "Clan ID is required",
            }),
        }),
    },

    // Generic query validation for GET requests
    "GET:*": {
        query: Joi.object({
            page: Joi.number().integer().min(1).default(1),
            limit: Joi.number().integer().min(1).max(100).default(10),
            sort: Joi.string().valid("asc", "desc", "ascending", "descending").default("desc"),
            sortBy: Joi.string().default("createdAt"),
            search: Joi.string().max(100),
            filter: Joi.string().max(200),
            fields: Joi.string().max(200),
            // Common filters across services
            status: Joi.alternatives().try(
                Joi.string(),
                Joi.array().items(Joi.string())
            ),
            category: Joi.alternatives().try(
                Joi.string(),
                Joi.array().items(Joi.string())
            ),
            // Add more common query parameters
            budgetMin: Joi.number().min(0),
            budgetMax: Joi.number().min(0),
            urgency: Joi.alternatives().try(
                Joi.string(),
                Joi.array().items(Joi.string())
            ),
            location: Joi.string(),
            deadline: Joi.string(),
            roleRequired: Joi.alternatives().try(
                Joi.string(),
                Joi.array().items(Joi.string())
            ),
        }).options({ allowUnknown: true, stripUnknown: false }),
    },
};

// Get validation schema for a route
function getValidationSchema(method, path) {
    const routeKey = `${method}:${path}`;

    // Check for exact match first
    if (validationSchemas[routeKey]) {
        return validationSchemas[routeKey];
    }

    // Check for wildcard matches
    for (const [pattern, schema] of Object.entries(validationSchemas)) {
        const [patternMethod, patternPath] = pattern.split(":");

        if (patternMethod === method || patternMethod === "*") {
            if (
                patternPath === "*" ||
                path.startsWith(patternPath.replace("*", ""))
            ) {
                return schema;
            }
        }
    }

    return null;
}

// Validate request data
function validateData(data, schema, options = {}) {
    const defaultOptions = {
        abortEarly: false,
        allowUnknown: false,
        stripUnknown: true,
        convert: true,
    };

    const validationOptions = { ...defaultOptions, ...options };

    const { error, value } = schema.validate(data, validationOptions);

    if (error) {
        const validationError = new Error("Validation failed");
        validationError.name = "ValidationError";
        validationError.details = error.details.map((detail) => ({
            message: detail.message,
            path: detail.path,
            type: detail.type,
            context: detail.context,
        }));
        throw validationError;
    }

    return value;
}

// Main validation middleware
function validationMiddleware(req, res, next) {
    try {
        // Skip validation for clan routes - they have their own validation
        if (req.path.startsWith('/api/clans/') || req.path.startsWith('/api/clan/')) {
            return next();
        }

        const schema = getValidationSchema(req.method, req.path);

        if (!schema) {
            // No validation schema defined for this route
            return next();
        }

        // Validate body
        if (schema.body && req.body) {
            req.body = validateData(req.body, schema.body);
        }

        // Validate query parameters
        if (schema.query && req.query) {
            req.query = validateData(req.query, schema.query);
        }

        // Validate URL parameters
        if (schema.params && req.params) {
            req.params = validateData(req.params, schema.params);
        }

        // Validate headers
        if (schema.headers && req.headers) {
            const validatedHeaders = validateData(req.headers, schema.headers, {
                allowUnknown: true,
                stripUnknown: false,
            });
            // Don't replace headers, just validate
        }

        logger.debug(`Validation passed for ${req.method} ${req.path}`, {
            requestId: req.requestId,
        });

        next();
    } catch (error) {
        // Sanitize body for logging (remove sensitive fields)
        const sanitizedBody = req.body ? { ...req.body } : {};
        if (sanitizedBody.password) sanitizedBody.password = '[REDACTED]';
        if (sanitizedBody.currentPassword) sanitizedBody.currentPassword = '[REDACTED]';
        if (sanitizedBody.newPassword) sanitizedBody.newPassword = '[REDACTED]';
        if (sanitizedBody.confirmPassword) sanitizedBody.confirmPassword = '[REDACTED]';

        logger.warn(`Validation failed for ${req.method} ${req.path}`, {
            error: error.message,
            details: error.details,
            requestId: req.requestId,
            body: sanitizedBody,
            query: req.query,
            params: req.params,
        });

        // Format validation error response
        const errorResponse = {
            error: "Validation Error",
            message: "Request validation failed",
            code: "VALIDATION_ERROR",
            requestId: req.requestId,
            details: {},
        };

        if (error.details) {
            error.details.forEach((detail) => {
                const field = detail.path.join(".");
                if (!errorResponse.details[field]) {
                    errorResponse.details[field] = [];
                }
                errorResponse.details[field].push(detail.message);
            });
        }

        return res.status(400).json(errorResponse);
    }
}

// Specific validation middleware factory
function validate(schema) {
    return (req, res, next) => {
        try {
            if (schema.body && req.body) {
                req.body = validateData(req.body, schema.body);
            }

            if (schema.query && req.query) {
                req.query = validateData(req.query, schema.query);
            }

            if (schema.params && req.params) {
                req.params = validateData(req.params, schema.params);
            }

            next();
        } catch (error) {
            const errorResponse = {
                error: "Validation Error",
                message: "Request validation failed",
                code: "VALIDATION_ERROR",
                requestId: req.requestId,
                details: {},
            };

            if (error.details) {
                error.details.forEach((detail) => {
                    const field = detail.path.join(".");
                    if (!errorResponse.details[field]) {
                        errorResponse.details[field] = [];
                    }
                    errorResponse.details[field].push(detail.message);
                });
            }

            return res.status(400).json(errorResponse);
        }
    };
}

// Sanitize input data
function sanitizeInput(data) {
    if (typeof data === "string") {
        return data.trim();
    }

    if (Array.isArray(data)) {
        return data.map(sanitizeInput);
    }

    if (data && typeof data === "object") {
        const sanitized = {};
        for (const [key, value] of Object.entries(data)) {
            sanitized[key] = sanitizeInput(value);
        }
        return sanitized;
    }

    return data;
}

// Input sanitization middleware
function sanitizationMiddleware(req, res, next) {
    if (req.body) {
        req.body = sanitizeInput(req.body);
    }

    if (req.query) {
        req.query = sanitizeInput(req.query);
    }

    if (req.params) {
        req.params = sanitizeInput(req.params);
    }

    next();
}

module.exports = validationMiddleware;
module.exports.validate = validate;
module.exports.sanitizationMiddleware = sanitizationMiddleware;
module.exports.commonSchemas = commonSchemas;
module.exports.validationSchemas = validationSchemas;