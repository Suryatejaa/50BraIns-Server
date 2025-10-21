/**
 * Validation Middleware using Joi
 * Provides request validation for clan service endpoints
 */

const Joi = require('joi');
const { ValidationError } = require('./errorHandler');

// Validation wrapper
function validate(schema, property = 'body') {
    return (req, res, next) => {
        const { error, value } = schema.validate(req[property], {
            abortEarly: false,
            stripUnknown: true,
            allowUnknown: false
        });

        if (error) {
            const details = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                value: detail.context.value
            }));

            throw new ValidationError('Validation failed', details);
        }

        // Replace request property with validated and sanitized value
        req[property] = value;
        next();
    };
}

// Common validation schemas
const commonSchemas = {
    objectId: Joi.string().trim().min(1).max(100),
    email: Joi.string().email().lowercase().trim(),
    url: Joi.string().uri().trim(),
    slug: Joi.string().pattern(/^[a-z0-9-]+$/).min(3).max(50),
    pagination: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20),
        sortBy: Joi.string().valid('createdAt', 'updatedAt', 'name', 'members', 'rating').default('createdAt'),
        sortOrder: Joi.string().valid('asc', 'desc').default('desc')
    }),
    filters: Joi.object({
        search: Joi.string().trim().min(1).max(100),
        category: Joi.string().trim().min(1).max(50),
        location: Joi.string().trim().min(1).max(100),
        visibility: Joi.string().valid('PUBLIC', 'PRIVATE', 'INVITE_ONLY'),
        isVerified: Joi.boolean(),
        hasOpenings: Joi.boolean()
    })
};

// Clan validation schemas
const clanSchemas = {
    create: Joi.object({
        name: Joi.string().trim().min(2).max(100).required(),
        description: Joi.string().trim().max(1000),
        tagline: Joi.string().trim().max(200),
        visibility: Joi.string().valid('PUBLIC', 'PRIVATE', 'INVITE_ONLY').default('PUBLIC'),
        email: commonSchemas.email,
        website: commonSchemas.url,
        instagramHandle: Joi.string().trim().pattern(/^[a-zA-Z0-9._]+$/).max(50),
        twitterHandle: Joi.string().trim().pattern(/^[a-zA-Z0-9_]+$/).max(50),
        linkedinHandle: Joi.string().trim().max(100),
        requiresApproval: Joi.boolean().default(true),
        isPaidMembership: Joi.boolean().default(false),
        membershipFee: Joi.when('isPaidMembership', {
            is: true,
            then: Joi.number().positive().required(),
            otherwise: Joi.number().optional()
        }),
        maxMembers: Joi.number().integer().min(2).max(1000).default(50),
        primaryCategory: Joi.string().trim().max(50),
        categories: Joi.array().items(Joi.string().trim().max(50)).max(10),
        skills: Joi.array().items(Joi.string().trim().max(50)).max(20),
        location: Joi.string().trim().max(100),
        timezone: Joi.string().trim().max(50)
    }),

    update: Joi.object({
        name: Joi.string().trim().min(2).max(100),
        description: Joi.string().trim().max(1000),
        tagline: Joi.string().trim().max(200),
        visibility: Joi.string().valid('PUBLIC', 'PRIVATE', 'INVITE_ONLY'),
        email: commonSchemas.email,
        website: commonSchemas.url,
        instagramHandle: Joi.string().trim().pattern(/^[a-zA-Z0-9._]+$/).max(50),
        twitterHandle: Joi.string().trim().pattern(/^[a-zA-Z0-9_]+$/).max(50),
        linkedinHandle: Joi.string().trim().max(100),
        requiresApproval: Joi.boolean(),
        isPaidMembership: Joi.boolean(),
        membershipFee: Joi.number().positive(),
        maxMembers: Joi.number().integer().min(2).max(1000),
        primaryCategory: Joi.string().trim().max(50),
        categories: Joi.array().items(Joi.string().trim().max(50)).max(10),
        skills: Joi.array().items(Joi.string().trim().max(50)).max(20),
        location: Joi.string().trim().max(100),
        timezone: Joi.string().trim().max(50)
    }).min(1), // At least one field must be provided for update

    search: Joi.object({
        ...commonSchemas.pagination,
        ...commonSchemas.filters
    })
};

// Member validation schemas
const memberSchemas = {
    invite: Joi.object({
        userId: commonSchemas.objectId.required(),
        role: Joi.string().valid('HEAD', 'CO_HEAD', 'ADMIN', 'SENIOR_MEMBER', 'MEMBER', 'TRAINEE').default('MEMBER'),
        customRole: Joi.string().trim().max(100),
        message: Joi.string().trim().max(500)
    }),

    inviteByEmail: Joi.object({
        email: commonSchemas.email.required(),
        role: Joi.string().valid('HEAD', 'CO_HEAD', 'ADMIN', 'SENIOR_MEMBER', 'MEMBER', 'TRAINEE').default('MEMBER'),
        customRole: Joi.string().trim().max(100),
        message: Joi.string().trim().max(500)
    }),

    updateRole: Joi.object({
        role: Joi.string().valid('HEAD', 'CO_HEAD', 'ADMIN', 'SENIOR_MEMBER', 'MEMBER', 'TRAINEE').required(),
        customRole: Joi.string().trim().max(100),
        permissions: Joi.array().items(
            Joi.string().valid(
                'INVITE_MEMBERS',
                'REMOVE_MEMBERS',
                'EDIT_CLAN_INFO',
                'MANAGE_PORTFOLIO',
                'APPLY_TO_GIGS',
                'MANAGE_FINANCES',
                'VIEW_ANALYTICS'
            )
        )
    }),

    joinRequest: Joi.object({
        message: Joi.string().trim().max(500),
        requestedRole: Joi.string().valid('MEMBER', 'TRAINEE').default('MEMBER'),
        portfolio: commonSchemas.url
    })
};

// Portfolio validation schemas
const portfolioSchemas = {
    create: Joi.object({
        title: Joi.string().trim().min(1).max(200).required(),
        description: Joi.string().trim().max(1000),
        mediaType: Joi.string().valid('IMAGE', 'VIDEO', 'DOCUMENT', 'LINK').required(),
        mediaUrl: commonSchemas.url.required(),
        thumbnailUrl: commonSchemas.url,
        projectType: Joi.string().valid('commercial', 'creative', 'client_work'),
        clientName: Joi.string().trim().max(100),
        projectDate: Joi.date(),
        projectValue: Joi.number().positive(),
        tags: Joi.array().items(Joi.string().trim().max(50)).max(10),
        skills: Joi.array().items(Joi.string().trim().max(50)).max(10),
        isPublic: Joi.boolean().default(true),
        isFeatured: Joi.boolean().default(false)
    }),

    update: Joi.object({
        title: Joi.string().trim().min(1).max(200),
        description: Joi.string().trim().max(1000),
        thumbnailUrl: commonSchemas.url,
        projectType: Joi.string().valid('commercial', 'creative', 'client_work'),
        clientName: Joi.string().trim().max(100),
        projectDate: Joi.date(),
        projectValue: Joi.number().positive(),
        tags: Joi.array().items(Joi.string().trim().max(50)).max(10),
        skills: Joi.array().items(Joi.string().trim().max(50)).max(10),
        isPublic: Joi.boolean(),
        isFeatured: Joi.boolean()
    }).min(1)
};

// Review validation schemas
const reviewSchemas = {
    create: Joi.object({
        rating: Joi.number().integer().min(1).max(5).required(),
        title: Joi.string().trim().max(200),
        content: Joi.string().trim().min(10).max(2000).required(),
        communicationRating: Joi.number().integer().min(1).max(5),
        qualityRating: Joi.number().integer().min(1).max(5),
        timelinessRating: Joi.number().integer().min(1).max(5),
        professionalismRating: Joi.number().integer().min(1).max(5),
        projectId: commonSchemas.objectId,
        projectType: Joi.string().trim().max(100)
    })
};

// Query parameter validation schemas
const querySchemas = {
    clanId: Joi.object({
        clanId: commonSchemas.objectId.required()
    }),

    userId: Joi.object({
        userId: commonSchemas.objectId.required()
    }),

    invitationId: Joi.object({
        invitationId: commonSchemas.objectId.required()
    }),

    pagination: commonSchemas.pagination,
    filters: commonSchemas.filters
};

module.exports = {
    validate,
    clanSchemas,
    memberSchemas,
    portfolioSchemas,
    reviewSchemas,
    querySchemas,
    commonSchemas
};
