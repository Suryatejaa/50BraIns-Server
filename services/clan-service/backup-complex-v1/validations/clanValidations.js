const Joi = require('joi');

// Clan creation validation
const createClanSchema = Joi.object({
    name: Joi.string()
        .min(2)
        .max(50)
        .required()
        .messages({
            'string.min': 'Clan name must be at least 2 characters long',
            'string.max': 'Clan name cannot exceed 50 characters',
            'any.required': 'Clan name is required'
        }),

    slug: Joi.string()
        .pattern(/^[a-z0-9-]+$/)
        .min(2)
        .max(30)
        .required()
        .messages({
            'string.pattern.base': 'Slug can only contain lowercase letters, numbers, and hyphens',
            'string.min': 'Slug must be at least 2 characters long',
            'string.max': 'Slug cannot exceed 30 characters',
            'any.required': 'Slug is required'
        }),

    description: Joi.string()
        .max(500)
        .optional()
        .messages({
            'string.max': 'Description cannot exceed 500 characters'
        }),

    tagline: Joi.string()
        .max(100)
        .optional()
        .messages({
            'string.max': 'Tagline cannot exceed 100 characters'
        }),

    visibility: Joi.string()
        .valid('PUBLIC', 'PRIVATE', 'INVITE_ONLY')
        .default('PUBLIC')
        .messages({
            'any.only': 'Visibility must be PUBLIC, PRIVATE, or INVITE_ONLY'
        }),

    email: Joi.string()
        .email()
        .optional()
        .messages({
            'string.email': 'Please provide a valid email address'
        }),

    website: Joi.string()
        .uri()
        .optional()
        .messages({
            'string.uri': 'Please provide a valid website URL'
        }),

    instagramHandle: Joi.string()
        .pattern(/^[a-zA-Z0-9._]+$/)
        .max(30)
        .optional()
        .messages({
            'string.pattern.base': 'Instagram handle can only contain letters, numbers, dots, and underscores'
        }),

    twitterHandle: Joi.string()
        .pattern(/^[a-zA-Z0-9_]+$/)
        .max(15)
        .optional()
        .messages({
            'string.pattern.base': 'Twitter handle can only contain letters, numbers, and underscores'
        }),

    linkedinHandle: Joi.string()
        .pattern(/^[a-zA-Z0-9-]+$/)
        .max(100)
        .optional()
        .messages({
            'string.pattern.base': 'LinkedIn handle can only contain letters, numbers, and hyphens'
        }),

    requiresApproval: Joi.boolean()
        .default(true),

    isPaidMembership: Joi.boolean()
        .default(false),

    membershipFee: Joi.number()
        .min(0)
        .max(10000)
        .optional()
        .when('isPaidMembership', {
            is: true,
            then: Joi.required(),
            otherwise: Joi.optional()
        })
        .messages({
            'number.min': 'Membership fee cannot be negative',
            'number.max': 'Membership fee cannot exceed $10,000',
            'any.required': 'Membership fee is required when paid membership is enabled'
        }),

    maxMembers: Joi.number()
        .integer()
        .min(1)
        .max(1000)
        .default(50)
        .messages({
            'number.integer': 'Max members must be a whole number',
            'number.min': 'Max members must be at least 1',
            'number.max': 'Max members cannot exceed 1000'
        }),

    primaryCategory: Joi.string()
        .max(50)
        .optional()
        .messages({
            'string.max': 'Primary category cannot exceed 50 characters'
        }),

    categories: Joi.array()
        .items(Joi.string().max(50))
        .max(10)
        .default([])
        .messages({
            'array.max': 'Cannot have more than 10 categories'
        }),

    skills: Joi.array()
        .items(Joi.string().max(50))
        .max(20)
        .default([])
        .messages({
            'array.max': 'Cannot have more than 20 skills'
        }),

    location: Joi.string()
        .max(100)
        .optional()
        .messages({
            'string.max': 'Location cannot exceed 100 characters'
        }),

    timezone: Joi.string()
        .max(50)
        .optional()
        .messages({
            'string.max': 'Timezone cannot exceed 50 characters'
        })
});

// Clan update validation
const updateClanSchema = Joi.object({
    name: Joi.string()
        .min(2)
        .max(50)
        .optional()
        .messages({
            'string.min': 'Clan name must be at least 2 characters long',
            'string.max': 'Clan name cannot exceed 50 characters'
        }),

    description: Joi.string()
        .max(500)
        .optional()
        .messages({
            'string.max': 'Description cannot exceed 500 characters'
        }),

    tagline: Joi.string()
        .max(100)
        .optional()
        .messages({
            'string.max': 'Tagline cannot exceed 100 characters'
        }),

    visibility: Joi.string()
        .valid('PUBLIC', 'PRIVATE', 'INVITE_ONLY')
        .optional()
        .messages({
            'any.only': 'Visibility must be PUBLIC, PRIVATE, or INVITE_ONLY'
        }),

    email: Joi.string()
        .email()
        .optional()
        .allow(null)
        .messages({
            'string.email': 'Please provide a valid email address'
        }),

    website: Joi.string()
        .uri()
        .optional()
        .allow(null)
        .messages({
            'string.uri': 'Please provide a valid website URL'
        }),

    instagramHandle: Joi.string()
        .pattern(/^[a-zA-Z0-9._]+$/)
        .max(30)
        .optional()
        .allow(null)
        .messages({
            'string.pattern.base': 'Instagram handle can only contain letters, numbers, dots, and underscores'
        }),

    twitterHandle: Joi.string()
        .pattern(/^[a-zA-Z0-9_]+$/)
        .max(15)
        .optional()
        .allow(null)
        .messages({
            'string.pattern.base': 'Twitter handle can only contain letters, numbers, and underscores'
        }),

    linkedinHandle: Joi.string()
        .pattern(/^[a-zA-Z0-9-]+$/)
        .max(100)
        .optional()
        .allow(null)
        .messages({
            'string.pattern.base': 'LinkedIn handle can only contain letters, numbers, and hyphens'
        }),

    requiresApproval: Joi.boolean()
        .optional(),

    isPaidMembership: Joi.boolean()
        .optional(),

    membershipFee: Joi.number()
        .min(0)
        .max(10000)
        .optional()
        .allow(null)
        .messages({
            'number.min': 'Membership fee cannot be negative',
            'number.max': 'Membership fee cannot exceed $10,000'
        }),

    maxMembers: Joi.number()
        .integer()
        .min(1)
        .max(1000)
        .optional()
        .messages({
            'number.integer': 'Max members must be a whole number',
            'number.min': 'Max members must be at least 1',
            'number.max': 'Max members cannot exceed 1000'
        }),

    primaryCategory: Joi.string()
        .max(50)
        .optional()
        .allow(null)
        .messages({
            'string.max': 'Primary category cannot exceed 50 characters'
        }),

    categories: Joi.array()
        .items(Joi.string().max(50))
        .max(10)
        .optional()
        .messages({
            'array.max': 'Cannot have more than 10 categories'
        }),

    skills: Joi.array()
        .items(Joi.string().max(50))
        .max(20)
        .optional()
        .messages({
            'array.max': 'Cannot have more than 20 skills'
        }),

    location: Joi.string()
        .max(100)
        .optional()
        .allow(null)
        .messages({
            'string.max': 'Location cannot exceed 100 characters'
        }),

    timezone: Joi.string()
        .max(50)
        .optional()
        .allow(null)
        .messages({
            'string.max': 'Timezone cannot exceed 50 characters'
        })
});

// Member invitation validation
const inviteMemberSchema = Joi.object({
    clanId: Joi.string()
        .required()
        .messages({
            'any.required': 'Clan ID is required'
        }),

    invitedUserId: Joi.string()
        .optional()
        .messages({
            'any.required': 'Either invited user ID or email is required'
        }),

    invitedEmail: Joi.string()
        .email()
        .optional()
        .messages({
            'string.email': 'Please provide a valid email address'
        }),

    role: Joi.string()
        .valid('HEAD', 'CO_HEAD', 'ADMIN', 'SENIOR_MEMBER', 'MEMBER', 'TRAINEE')
        .default('MEMBER')
        .messages({
            'any.only': 'Role must be HEAD, CO_HEAD, ADMIN, SENIOR_MEMBER, MEMBER, or TRAINEE'
        }),

    customRole: Joi.string()
        .max(50)
        .optional()
        .messages({
            'string.max': 'Custom role cannot exceed 50 characters'
        }),

    message: Joi.string()
        .max(500)
        .optional()
        .messages({
            'string.max': 'Invitation message cannot exceed 500 characters'
        })
}).or('invitedUserId', 'invitedEmail');

// Member role update validation
const updateMemberRoleSchema = Joi.object({
    role: Joi.string()
        .valid('HEAD', 'CO_HEAD', 'ADMIN', 'SENIOR_MEMBER', 'MEMBER', 'TRAINEE')
        .required()
        .messages({
            'any.only': 'Role must be HEAD, CO_HEAD, ADMIN, SENIOR_MEMBER, MEMBER, or TRAINEE',
            'any.required': 'Role is required'
        }),

    customRole: Joi.string()
        .max(50)
        .optional()
        .messages({
            'string.max': 'Custom role cannot exceed 50 characters'
        })
});

// Query parameters validation
const getClansQuerySchema = Joi.object({
    category: Joi.string()
        .max(50)
        .optional(),

    location: Joi.string()
        .max(100)
        .optional(),

    visibility: Joi.string()
        .valid('PUBLIC', 'PRIVATE', 'INVITE_ONLY')
        .optional(),

    isVerified: Joi.boolean()
        .optional(),

    minMembers: Joi.number()
        .integer()
        .min(0)
        .optional(),

    maxMembers: Joi.number()
        .integer()
        .min(0)
        .optional(),

    sortBy: Joi.string()
        .valid('score', 'name', 'createdAt', 'reputationScore', 'totalGigs', 'averageRating')
        .default('score')
        .optional(),

    order: Joi.string()
        .valid('asc', 'desc')
        .default('desc')
        .optional(),

    page: Joi.number()
        .integer()
        .min(1)
        .default(1)
        .optional(),

    limit: Joi.number()
        .integer()
        .min(1)
        .max(100)
        .default(20)
        .optional()
});

// Clan ID validation
const clanIdSchema = Joi.object({
    clanId: Joi.string()
        .required()
        .messages({
            'any.required': 'Clan ID is required'
        })
});

// User ID validation
const userIdSchema = Joi.object({
    userId: Joi.string()
        .required()
        .messages({
            'any.required': 'User ID is required'
        })
});

module.exports = {
    createClanSchema,
    updateClanSchema,
    inviteMemberSchema,
    updateMemberRoleSchema,
    getClansQuerySchema,
    clanIdSchema,
    userIdSchema
}; 