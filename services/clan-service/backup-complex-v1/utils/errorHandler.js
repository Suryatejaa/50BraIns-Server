class ClanError extends Error {
    constructor(message, statusCode = 500, code = 'CLAN_ERROR') {
        super(message);
        this.name = 'ClanError';
        this.statusCode = statusCode;
        this.code = code;
    }
}

class ClanNotFoundError extends ClanError {
    constructor(clanId) {
        super(`Clan with ID ${clanId} not found`, 404, 'CLAN_NOT_FOUND');
        this.name = 'ClanNotFoundError';
    }
}

class ClanAlreadyExistsError extends ClanError {
    constructor(slug) {
        super(`Clan with slug '${slug}' already exists`, 409, 'CLAN_ALREADY_EXISTS');
        this.name = 'ClanAlreadyExistsError';
    }
}

class ClanPermissionError extends ClanError {
    constructor(action) {
        super(`Insufficient permissions to ${action}`, 403, 'CLAN_PERMISSION_DENIED');
        this.name = 'ClanPermissionError';
    }
}

class ClanMemberError extends ClanError {
    constructor(message, statusCode = 400, code = 'CLAN_MEMBER_ERROR') {
        super(message, statusCode, code);
        this.name = 'ClanMemberError';
    }
}

class ClanMemberNotFoundError extends ClanMemberError {
    constructor(userId, clanId) {
        super(`User ${userId} is not a member of clan ${clanId}`, 404, 'CLAN_MEMBER_NOT_FOUND');
        this.name = 'ClanMemberNotFoundError';
    }
}

class ClanMemberAlreadyExistsError extends ClanMemberError {
    constructor(userId, clanId) {
        super(`User ${userId} is already a member of clan ${clanId}`, 409, 'CLAN_MEMBER_ALREADY_EXISTS');
        this.name = 'ClanMemberAlreadyExistsError';
    }
}

class ClanInvitationError extends ClanError {
    constructor(message, statusCode = 400, code = 'CLAN_INVITATION_ERROR') {
        super(message, statusCode, code);
        this.name = 'ClanInvitationError';
    }
}

class ClanInvitationNotFoundError extends ClanInvitationError {
    constructor(invitationId) {
        super(`Invitation with ID ${invitationId} not found`, 404, 'CLAN_INVITATION_NOT_FOUND');
        this.name = 'ClanInvitationNotFoundError';
    }
}

class ClanInvitationExpiredError extends ClanInvitationError {
    constructor(invitationId) {
        super(`Invitation with ID ${invitationId} has expired`, 410, 'CLAN_INVITATION_EXPIRED');
        this.name = 'ClanInvitationExpiredError';
    }
}

class ClanValidationError extends ClanError {
    constructor(message, details = null) {
        super(message, 400, 'CLAN_VALIDATION_ERROR');
        this.name = 'ClanValidationError';
        this.details = details;
    }
}

class ClanLimitError extends ClanError {
    constructor(message, statusCode = 400, code = 'CLAN_LIMIT_ERROR') {
        super(message, statusCode, code);
        this.name = 'ClanLimitError';
    }
}

class ClanMemberLimitError extends ClanLimitError {
    constructor(clanId, maxMembers) {
        super(`Clan ${clanId} has reached its maximum member limit of ${maxMembers}`, 400, 'CLAN_MEMBER_LIMIT_REACHED');
        this.name = 'ClanMemberLimitError';
    }
}

// Error handler middleware
const handleClanError = (error, req, res, next) => {
    console.error('Clan Service Error:', {
        name: error.name,
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        requestId: req.requestId,
        userId: req.user?.id,
        path: req.path,
        method: req.method
    });

    // Handle specific clan errors
    if (error instanceof ClanError) {
        return res.status(error.statusCode).json({
            success: false,
            error: error.message,
            code: error.code,
            details: error.details || null,
            timestamp: new Date().toISOString(),
            requestId: req.requestId
        });
    }

    // Handle validation errors
    if (error.isJoi) {
        return res.status(400).json({
            success: false,
            error: 'Validation Error',
            code: 'VALIDATION_ERROR',
            details: error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                type: detail.type
            })),
            timestamp: new Date().toISOString(),
            requestId: req.requestId
        });
    }

    // Handle Prisma errors
    if (error.code === 'P2002') {
        return res.status(409).json({
            success: false,
            error: 'Resource already exists',
            code: 'DUPLICATE_ENTRY',
            details: {
                field: error.meta?.target?.join('.') || 'unknown',
                message: 'A record with this value already exists'
            },
            timestamp: new Date().toISOString(),
            requestId: req.requestId
        });
    }

    if (error.code === 'P2025') {
        return res.status(404).json({
            success: false,
            error: 'Resource not found',
            code: 'NOT_FOUND',
            timestamp: new Date().toISOString(),
            requestId: req.requestId
        });
    }

    // Handle database connection errors
    if (error.code === 'P1001' || error.code === 'P1002') {
        return res.status(503).json({
            success: false,
            error: 'Database connection error',
            code: 'DATABASE_CONNECTION_ERROR',
            timestamp: new Date().toISOString(),
            requestId: req.requestId
        });
    }

    // Default error response
    return res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        code: 'INTERNAL_SERVER_ERROR',
        message: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred',
        timestamp: new Date().toISOString(),
        requestId: req.requestId
    });
};

// Validation middleware
const validateRequest = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const validationError = new ClanValidationError(
                'Validation failed',
                error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message,
                    type: detail.type
                }))
            );
            return next(validationError);
        }

        req.validatedBody = value;
        next();
    };
};

// Query validation middleware
const validateQuery = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.query, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const validationError = new ClanValidationError(
                'Query validation failed',
                error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message,
                    type: detail.type
                }))
            );
            return next(validationError);
        }

        req.validatedQuery = value;
        next();
    };
};

// Parameter validation middleware
const validateParams = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.params, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const validationError = new ClanValidationError(
                'Parameter validation failed',
                error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message,
                    type: detail.type
                }))
            );
            return next(validationError);
        }

        req.validatedParams = value;
        next();
    };
};

module.exports = {
    ClanError,
    ClanNotFoundError,
    ClanAlreadyExistsError,
    ClanPermissionError,
    ClanMemberError,
    ClanMemberNotFoundError,
    ClanMemberAlreadyExistsError,
    ClanInvitationError,
    ClanInvitationNotFoundError,
    ClanInvitationExpiredError,
    ClanValidationError,
    ClanLimitError,
    ClanMemberLimitError,
    handleClanError,
    validateRequest,
    validateQuery,
    validateParams
}; 