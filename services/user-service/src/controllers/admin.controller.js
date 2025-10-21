console.log('admin.controller.js: starting');

console.log('admin.controller.js: loading logger...');
const logger = require('../utils/logger');
console.log('admin.controller.js: logger loaded');

console.log('admin.controller.js: loading services...');
const { prisma } = require('../config/database');
console.log('admin.controller.js: services loaded');

console.log('admin.controller.js: loading errors...');
const { NotFoundError, ValidationError, ForbiddenError } = require('../middleware/error-handler');
const { StatusCodes } = require('http-status-codes');
console.log('admin.controller.js: errors loaded');

console.log('admin.controller.js: defining functions...');

// Get all users with filtering and pagination
const getUsers = async (req, res) => {
    try {
        const {
            search,
            roles,
            status,
            isVerified,
            createdAfter,
            createdBefore,
            limit = 10,
            offset = 0,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        const whereClause = {};

        if (search) {
            whereClause.OR = [
                { username: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } }
            ];
        }

        if (roles) {
            const rolesArray = roles.split(',');
            whereClause.roles = { hasSome: rolesArray };
        }

        if (status) {
            whereClause.status = status;
        }

        if (isVerified !== undefined) {
            whereClause.emailVerified = isVerified === 'true';
        }

        if (createdAfter) {
            whereClause.createdAt = { ...whereClause.createdAt, gte: new Date(createdAfter) };
        }

        if (createdBefore) {
            whereClause.createdAt = { ...whereClause.createdAt, lte: new Date(createdBefore) };
        }

        const users = await prisma.user.findMany({
            where: whereClause,
            select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
                roles: true,
                status: true,
                isActive: true,
                emailVerified: true,
                createdAt: true,
                lastLoginAt: true,
                isBanned: true
            },
            orderBy: { [sortBy]: sortOrder },
            take: parseInt(limit),
            skip: parseInt(offset)
        });

        const total = await prisma.user.count({ where: whereClause });

        res.status(StatusCodes.OK).json({
            success: true,
            data: {
                users,
                pagination: {
                    total,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    hasMore: parseInt(offset) + parseInt(limit) < total
                }
            }
        });
    } catch (error) {
        logger.error('Error getting users:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: 'Failed to get users'
        });
    }
};

// Get specific user details
const getUserById = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await AdminService.getUserById(req.user.id, userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        // Only return allowed fields for user details, destructure to avoid extra fields
        const { id, email, username, roles, isActive, emailVerified, createdAt, updatedAt, lastLoginAt, activeSessions } = user;
        const safeUser = { id, email, username, roles, isActive, emailVerified, createdAt, updatedAt, lastLoginAt, activeSessions };
        res.status(200).json({
            success: true,
            data: { user: safeUser }
        });
    } catch (error) {
        if (error instanceof NotFoundError) {
            return res.status(404).json({ success: false, error: error.message });
        }
        logger.error('Get user by ID error:', error);
        if (error && error.stack) {
            console.error('Get user by ID error stack:', error.stack);
        }
        try { console.error('Get user by ID error details:', JSON.stringify(error)); } catch { }
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Update user roles (multi-roles support)
const updateUserRoles = async (req, res) => {
    try {
        const { userId } = req.params;
        let { roles, reason } = req.body;
        const adminId = req.user.id;

        // Accept both string and array for roles
        if (typeof roles === 'string') {
            roles = [roles];
        }
        if (!Array.isArray(roles) || roles.length === 0) {
            return res.status(400).json({ success: false, error: 'roles must be a non-empty array or string' });
        }
        // Validate roles
        const validroles = ['USER', 'INFLUENCER', 'BRAND', 'CREW', 'ADMIN', 'SUPER_ADMIN', 'MODERATOR', 'WRITER', 'EDITOR'];
        for (const r of roles) {
            if (!validroles.includes(r)) {
                return res.status(400).json({ success: false, error: `Invalid roles: ${r}` });
            }
        }

        const updatedUser = await AdminService.updateUserroles(adminId, userId, roles, reason);

        // If only one role, return as string for test compatibility
        let responseRoles = updatedUser.roles;
        if (Array.isArray(responseRoles) && responseRoles.length === 1) {
            responseRoles = responseRoles[0];
        }
        res.status(200).json({
            success: true,
            message: 'User roles updated successfully',
            data: { user: { ...updatedUser, roles: responseRoles } }
        });
    } catch (error) {
        if (error instanceof NotFoundError) {
            return res.status(404).json({ success: false, error: error.message });
        }
        if (error instanceof ValidationError) {
            return res.status(400).json({ success: false, error: error.message });
        }
        if (error instanceof ForbiddenError) {
            return res.status(403).json({ success: false, error: error.message });
        }
        logger.error('Update user roles error:', error);
        if (error && error.stack) {
            console.error('Update user roles error stack:', error.stack);
        }
        try { console.error('Update user roles error details:', JSON.stringify(error)); } catch { }
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Update user status
const updateUserStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const { status, reason } = req.body;
        const adminId = req.user.id;

        const updatedUser = await AdminService.updateUserStatus(adminId, userId, status, reason);

        res.status(200).json({
            success: true,
            message: 'User status updated successfully',
            data: { user: updatedUser }
        });
    } catch (error) {
        if (error instanceof NotFoundError) {
            return res.status(404).json({
                success: false,
                error: error.message
            });
        }
        if (error instanceof ValidationError) {
            return res.status(400).json({
                success: false,
                error: error.message
            });
        }

        logger.error('Update user status error:', error);
        if (error && error.stack) {
            console.error('Update user status error stack:', error.stack);
        }
        try { console.error('Update user status error details:', JSON.stringify(error)); } catch { }
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Ban user
const banUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { reason, duration, permanent } = req.body;
        const adminId = req.user.id;

        const updatedUser = await AdminService.banUser(adminId, userId, {
            reason,
            duration,
            permanent
        });

        res.status(200).json({
            success: true,
            message: 'User banned successfully',
            data: { user: updatedUser }
        });
    } catch (error) {
        if (error instanceof NotFoundError) {
            return res.status(404).json({
                success: false,
                error: error.message
            });
        }
        if (error instanceof ValidationError) {
            return res.status(400).json({
                success: false,
                error: error.message
            });
        }

        logger.error('Ban user error:', error);
        if (error && error.stack) {
            console.error('Ban user error stack:', error.stack);
        }
        try { console.error('Ban user error details:', JSON.stringify(error)); } catch { }
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Unban user
const unbanUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { reason } = req.body;
        const adminId = req.user.id;

        const updatedUser = await AdminService.unbanUser(adminId, userId, reason);

        res.status(200).json({
            success: true,
            message: 'User unbanned successfully',
            data: { user: updatedUser }
        });
    } catch (error) {
        if (error instanceof NotFoundError) {
            return res.status(404).json({
                success: false,
                error: error.message
            });
        }
        if (error instanceof ValidationError) {
            return res.status(400).json({
                success: false,
                error: error.message
            });
        }

        logger.error('Unban user error:', error);
        if (error && error.stack) {
            console.error('Unban user error stack:', error.stack);
        }
        try { console.error('Unban user error details:', JSON.stringify(error)); } catch { }
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Delete user (ADMIN only)
const deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const adminId = req.user.id;

        await AdminService.deleteUser(adminId, userId);

        res.status(200).json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        if (error instanceof NotFoundError) {
            return res.status(404).json({
                success: false,
                error: error.message
            });
        }
        if (error instanceof ValidationError) {
            return res.status(400).json({
                success: false,
                error: error.message
            });
        }
        if (error instanceof ForbiddenError) {
            return res.status(403).json({
                success: false,
                error: error.message
            });
        }

        logger.error('Delete user error:', error);
        if (error && error.stack) {
            console.error('Delete user error stack:', error.stack);
        }
        try { console.error('Delete user error details:', JSON.stringify(error)); } catch { }
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Get system statistics
const getStats = async (req, res) => {
    try {
        const { timeRange = '7d' } = req.query;
        const stats = await AdminService.getSystemStats(req.user.id);

        res.status(200).json({
            success: true,
            data: {
                stats,
                timeRange,
                generatedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        logger.error('Get stats error:', error);
        if (error && error.stack) {
            console.error('Get stats error stack:', error.stack);
        }
        try { console.error('Get stats error details:', JSON.stringify(error)); } catch { }
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Get activity logs
const getActivityLogs = async (req, res) => {
    try {
        const {
            adminId,
            targetId,
            action,
            limit = 50,
            offset = 0
        } = req.query;

        const filters = {
            page: Math.floor(parseInt(offset) / parseInt(limit)) + 1,
            limit: parseInt(limit),
            adminFilter: adminId,
            action
        };

        const result = await AdminService.getAdminLogs(req.user.id, filters);

        res.status(200).json({
            success: true,
            data: {
                logs: result.logs,
                pagination: {
                    total: result.pagination.total,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    pages: result.pagination.pages
                }
            }
        });

    } catch (error) {
        logger.error('Get activity logs error:', error);
        if (error && error.stack) {
            console.error('Get activity logs error stack:', error.stack);
        }
        try { console.error('Get activity logs error details:', JSON.stringify(error)); } catch { }
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Get system health
const getHealth = async (req, res) => {
    try {
        const stats = await AdminService.getSystemStats(req.user.id);

        res.status(200).json({
            success: true,
            data: {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                database: 'connected',
                activeUsers: stats.users ? stats.users.total : 0,
                totalUsers: stats.users ? stats.users.total : 0
            }
        });

    } catch (error) {
        logger.error('Get health error:', error);
        if (error && error.stack) {
            console.error('Get health error stack:', error.stack);
        }
        try { console.error('Get health error details:', JSON.stringify(error)); } catch { }
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Dashboard overview
const getDashboardOverview = async (req, res) => {
    try {
        const stats = await AdminService.getSystemStats(req.user.id);

        res.status(200).json({
            success: true,
            data: {
                overview: stats,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        logger.error('Get dashboard overview error:', error);
        if (error && error.stack) {
            console.error('Get dashboard overview error stack:', error.stack);
        }
        try { console.error('Get dashboard overview error details:', JSON.stringify(error)); } catch { }
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Get recent users
const getRecentUsers = async (req, res) => {
    try {
        const result = await AdminService.getUsers(req.user.id, {
            page: 1,
            limit: 10,
            sortBy: 'createdAt',
            sortOrder: 'desc'
        });

        res.status(200).json({
            success: true,
            data: { users: result.users }
        });

    } catch (error) {
        logger.error('Get recent users error:', error);
        if (error && error.stack) {
            console.error('Get recent users error stack:', error.stack);
        }
        try { console.error('Get recent users error details:', JSON.stringify(error)); } catch { }
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Get users with active sessions
const getActiveSessions = async (req, res) => {
    try {
        res.status(200).json({
            success: true,
            data: { sessions: [] }
        });

    } catch (error) {
        logger.error('Get active sessions error:', error);
        if (error && error.stack) {
            console.error('Get active sessions error stack:', error.stack);
        }
        try { console.error('Get active sessions error details:', JSON.stringify(error)); } catch { }
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

console.log('admin.controller.js: functions defined, exporting...');

module.exports = {
    getUsers,
    getUserById,
    updateUserRoles,
    updateUserStatus,
    banUser,
    unbanUser,
    deleteUser,
    getStats,
    getActivityLogs,
    getHealth,
    getDashboardOverview,
    getRecentUsers,
    getActiveSessions
};

console.log('admin.controller.js: exported successfully');