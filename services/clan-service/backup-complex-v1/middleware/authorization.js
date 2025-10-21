/**
 * Authorization Middleware
 * Handles role-based access control and clan-specific permissions
 */

const { UnauthorizedError, ForbiddenError } = require('./errorHandler');
const { prisma } = require('../config/database');
const logger = require('../config/logger');

// Require authentication
function requireAuth(req, res, next) {
    if (!req.user || !req.user.isAuthenticated) {
        throw new UnauthorizedError('Authentication required');
    }
    next();
}

// Require specific roles
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user || !req.user.isAuthenticated) {
            throw new UnauthorizedError('Authentication required');
        }

        const hasRole = roles.some(role => req.user.hasRole(role));
        if (!hasRole) {
            throw new ForbiddenError(`Access denied. Required roles: ${roles.join(', ')}`);
        }

        next();
    };
}

// Require admin access
function requireAdmin(req, res, next) {
    if (!req.user || !req.user.isAuthenticated) {
        throw new UnauthorizedError('Authentication required');
    }

    if (!req.user.isAdmin()) {
        throw new ForbiddenError('Admin access required');
    }

    next();
}

// Require clan membership or admin
async function requireClanAccess(requiredRoles = [], allowAdmin = true) {
    return async (req, res, next) => {
        try {
            if (!req.user || !req.user.isAuthenticated) {
                throw new UnauthorizedError('Authentication required');
            }

            const clanId = req.params.clanId || req.body.clanId;
            if (!clanId) {
                throw new ForbiddenError('Clan ID required');
            }

            // Admin can access everything (unless disabled)
            if (allowAdmin && req.user.isAdmin()) {
                return next();
            }

            // Check clan membership
            const membership = await prisma.clanMember.findUnique({
                where: {
                    userId_clanId: {
                        userId: req.user.id,
                        clanId: clanId
                    }
                },
                include: {
                    clan: {
                        select: {
                            id: true,
                            name: true,
                            clanHeadId: true,
                            visibility: true
                        }
                    }
                }
            });

            if (!membership) {
                // Check if clan head (owner)
                const clan = await prisma.clan.findUnique({
                    where: { id: clanId },
                    select: { clanHeadId: true, visibility: true }
                });

                if (clan?.clanHeadId === req.user.id) {
                    req.userClanRole = 'HEAD';
                    req.clanMembership = { clan, role: 'HEAD', isCore: true };
                    return next();
                }

                throw new ForbiddenError('Clan membership required');
            }

            // Check if user has required role
            if (requiredRoles.length > 0) {
                const hasRequiredRole = requiredRoles.includes(membership.role);
                if (!hasRequiredRole) {
                    throw new ForbiddenError(`Required clan roles: ${requiredRoles.join(', ')}`);
                }
            }

            // Add clan context to request
            req.userClanRole = membership.role;
            req.clanMembership = membership;

            next();
        } catch (error) {
            logger.error('Clan access check failed:', error);
            next(error);
        }
    };
}

// Require clan leadership (HEAD, CO_HEAD, ADMIN)
function requireClanLeadership() {
    return requireClanAccess(['HEAD', 'CO_HEAD', 'ADMIN']);
}

// Require clan head (owner) only
function requireClanHead() {
    return requireClanAccess(['HEAD']);
}

// Check specific clan permissions
async function requireClanPermission(permission) {
    return async (req, res, next) => {
        try {
            if (!req.user || !req.user.isAuthenticated) {
                throw new UnauthorizedError('Authentication required');
            }

            const clanId = req.params.clanId || req.body.clanId;
            if (!clanId) {
                throw new ForbiddenError('Clan ID required');
            }

            // Admin can do everything
            if (req.user.isAdmin()) {
                return next();
            }

            // Check membership and permissions
            const membership = await prisma.clanMember.findUnique({
                where: {
                    userId_clanId: {
                        userId: req.user.id,
                        clanId: clanId
                    }
                }
            });

            if (!membership) {
                // Check if clan head
                const clan = await prisma.clan.findUnique({
                    where: { id: clanId },
                    select: { clanHeadId: true }
                });

                if (clan?.clanHeadId !== req.user.id) {
                    throw new ForbiddenError('Clan membership required');
                }

                // Clan head has all permissions
                return next();
            }

            // Check specific permission
            if (!membership.permissions.includes(permission)) {
                throw new ForbiddenError(`Permission required: ${permission}`);
            }

            req.userClanRole = membership.role;
            req.clanMembership = membership;

            next();
        } catch (error) {
            logger.error('Permission check failed:', error);
            next(error);
        }
    };
}

// Check if user can modify another user's role/membership
async function requireSeniorRole() {
    return async (req, res, next) => {
        try {
            if (!req.user || !req.user.isAuthenticated) {
                throw new UnauthorizedError('Authentication required');
            }

            const clanId = req.params.clanId;
            const targetUserId = req.params.userId || req.body.userId;

            if (!clanId || !targetUserId) {
                throw new ForbiddenError('Clan ID and User ID required');
            }

            // Admin can do everything
            if (req.user.isAdmin()) {
                return next();
            }

            // Can't modify yourself
            if (targetUserId === req.user.id) {
                throw new ForbiddenError('Cannot modify your own membership');
            }

            // Get both memberships
            const [userMembership, targetMembership] = await Promise.all([
                prisma.clanMember.findUnique({
                    where: {
                        userId_clanId: {
                            userId: req.user.id,
                            clanId: clanId
                        }
                    }
                }),
                prisma.clanMember.findUnique({
                    where: {
                        userId_clanId: {
                            userId: targetUserId,
                            clanId: clanId
                        }
                    }
                })
            ]);

            if (!userMembership) {
                // Check if clan head
                const clan = await prisma.clan.findUnique({
                    where: { id: clanId },
                    select: { clanHeadId: true }
                });

                if (clan?.clanHeadId !== req.user.id) {
                    throw new ForbiddenError('Clan membership required');
                }

                // Clan head can modify anyone
                return next();
            }

            // Role hierarchy check
            const roleHierarchy = {
                'TRAINEE': 1,
                'MEMBER': 2,
                'SENIOR_MEMBER': 3,
                'ADMIN': 4,
                'CO_HEAD': 5,
                'HEAD': 6
            };

            const userRoleLevel = roleHierarchy[userMembership.role] || 0;
            const targetRoleLevel = roleHierarchy[targetMembership?.role] || 0;

            if (userRoleLevel <= targetRoleLevel) {
                throw new ForbiddenError('Insufficient permissions to modify this member');
            }

            req.userClanRole = userMembership.role;
            req.clanMembership = userMembership;

            next();
        } catch (error) {
            logger.error('Senior role check failed:', error);
            next(error);
        }
    };
}

// Check if user can view private clan information
async function requireClanViewAccess() {
    return async (req, res, next) => {
        try {
            const clanId = req.params.clanId;
            if (!clanId) {
                throw new ForbiddenError('Clan ID required');
            }

            const clan = await prisma.clan.findUnique({
                where: { id: clanId },
                select: {
                    id: true,
                    visibility: true,
                    clanHeadId: true
                }
            });

            if (!clan) {
                throw new ForbiddenError('Clan not found');
            }

            // Public clans can be viewed by anyone
            if (clan.visibility === 'PUBLIC') {
                return next();
            }

            // Private clans require authentication
            if (!req.user || !req.user.isAuthenticated) {
                throw new UnauthorizedError('Authentication required for private clan');
            }

            // Admin can view everything
            if (req.user.isAdmin()) {
                return next();
            }

            // Check if member or clan head
            const isMember = await prisma.clanMember.findUnique({
                where: {
                    userId_clanId: {
                        userId: req.user.id,
                        clanId: clanId
                    }
                }
            });

            const isClanHead = clan.clanHeadId === req.user.id;

            if (!isMember && !isClanHead) {
                throw new ForbiddenError('Access denied to private clan');
            }

            next();
        } catch (error) {
            logger.error('Clan view access check failed:', error);
            next(error);
        }
    };
}

module.exports = {
    requireAuth,
    requireRole,
    requireAdmin,
    requireClanAccess,
    requireClanLeadership,
    requireClanHead,
    requireClanPermission,
    requireSeniorRole,
    requireClanViewAccess
};
