const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger.utils');
const { clearUserCache } = require('../middleware/auth.middleware');

const prisma = new PrismaClient();

// User Management Operations
const getAllUsers = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            status,
            role,
            search,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            verified,
            banned
        } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        // Build filter conditions
        const where = {};
        if (status) where.status = status;
        if (role) where.roles = { has: role };
        if (verified !== undefined) where.emailVerified = verified === 'true';
        if (banned !== undefined) where.isBanned = banned === 'true';
        if (search) {
            where.OR = [
                { email: { contains: search, mode: 'insensitive' } },
                { username: { contains: search, mode: 'insensitive' } },
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } }
            ];
        }

        const [users, totalCount] = await Promise.all([
            prisma.user.findMany({
                where,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
                select: {
                    id: true,
                    email: true,
                    username: true,
                    firstName: true,
                    lastName: true,
                    roles: true,
                    status: true,
                    emailVerified: true,
                    isActive: true,
                    isBanned: true,
                    banReason: true,
                    bannedAt: true,
                    createdAt: true,
                    lastLoginAt: true,
                    lastActiveAt: true
                }
            }),
            prisma.user.count({ where })
        ]);

        // Log admin action
        await prisma.adminLog.create({
            data: {
                adminId: req.user.id,
                action: 'GET_ALL_USERS',
                details: { filters: where, pagination: { page, limit } },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            }
        });

        res.json({
            success: true,
            data: {
                users,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: totalCount,
                    pages: Math.ceil(totalCount / parseInt(limit))
                }
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.logError(error, req);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch users',
            code: 'FETCH_USERS_ERROR',
            timestamp: new Date().toISOString()
        });
    }
};

const getUserById = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                refreshTokens: {
                    select: {
                        id: true,
                        createdAt: true,
                        lastUsedAt: true,
                        ipAddress: true,
                        userAgent: true
                    }
                },
                adminLogs: {
                    where: { targetId: userId },
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                    include: {
                        admin: {
                            select: {
                                id: true,
                                username: true,
                                email: true
                            }
                        }
                    }
                }
            }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
                code: 'USER_NOT_FOUND',
                timestamp: new Date().toISOString()
            });
        }

        // Log admin action
        await prisma.adminLog.create({
            data: {
                adminId: req.user.id,
                targetId: userId,
                action: 'GET_USER_DETAILS',
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            }
        });

        res.json({
            success: true,
            data: { user },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.logError(error, req);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user details',
            code: 'FETCH_USER_ERROR',
            timestamp: new Date().toISOString()
        });
    }
};

const banUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { reason, duration } = req.body;

        if (!reason) {
            return res.status(400).json({
                success: false,
                error: 'Ban reason is required',
                code: 'VALIDATION_ERROR',
                timestamp: new Date().toISOString()
            });
        }

        // Check if user exists and is not already banned
        const existingUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, username: true, isBanned: true, roles: true }
        });

        if (!existingUser) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
                code: 'USER_NOT_FOUND',
                timestamp: new Date().toISOString()
            });
        }

        // Prevent banning other admins (unless super admin)
        if (existingUser.roles.includes('ADMIN') && !req.user.roles.includes('SUPER_ADMIN')) {
            return res.status(403).json({
                success: false,
                error: 'Cannot ban admin users',
                code: 'INSUFFICIENT_PERMISSIONS',
                timestamp: new Date().toISOString()
            });
        }

        if (existingUser.isBanned) {
            return res.status(400).json({
                success: false,
                error: 'User is already banned',
                code: 'USER_ALREADY_BANNED',
                timestamp: new Date().toISOString()
            });
        }

        // Calculate ban expiry if duration provided (in hours)
        let banExpiresAt = null;
        if (duration && duration > 0) {
            banExpiresAt = new Date(Date.now() + duration * 60 * 60 * 1000);
        }

        // Update user status
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                isBanned: true,
                banReason: reason,
                bannedAt: new Date(),
                bannedBy: req.user.id,
                banExpiresAt,
                status: 'BANNED'
            },
            select: {
                id: true,
                email: true,
                username: true,
                isBanned: true,
                banReason: true,
                bannedAt: true,
                banExpiresAt: true
            }
        });

        // Clear user cache
        await clearUserCache(userId);

        // Log admin action
        await prisma.adminLog.create({
            data: {
                adminId: req.user.id,
                targetId: userId,
                action: 'BAN_USER',
                details: { reason, duration, banExpiresAt },
                reason,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            }
        });

        res.json({
            success: true,
            message: 'User banned successfully',
            data: { user: updatedUser },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.logError(error, req);
        res.status(500).json({
            success: false,
            error: 'Failed to ban user',
            code: 'BAN_USER_ERROR',
            timestamp: new Date().toISOString()
        });
    }
};

const unbanUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { reason } = req.body;

        // Check if user exists and is banned
        const existingUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, username: true, isBanned: true }
        });

        if (!existingUser) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
                code: 'USER_NOT_FOUND',
                timestamp: new Date().toISOString()
            });
        }

        if (!existingUser.isBanned) {
            return res.status(400).json({
                success: false,
                error: 'User is not banned',
                code: 'USER_NOT_BANNED',
                timestamp: new Date().toISOString()
            });
        }

        // Update user status
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                isBanned: false,
                banReason: null,
                bannedAt: null,
                bannedBy: null,
                banExpiresAt: null,
                status: 'ACTIVE'
            },
            select: {
                id: true,
                email: true,
                username: true,
                isBanned: true,
                status: true
            }
        });

        // Clear user cache
        await clearUserCache(userId);

        // Log admin action
        await prisma.adminLog.create({
            data: {
                adminId: req.user.id,
                targetId: userId,
                action: 'UNBAN_USER',
                details: { reason: reason || 'No reason provided' },
                reason: reason || 'Admin unban',
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            }
        });

        res.json({
            success: true,
            message: 'User unbanned successfully',
            data: { user: updatedUser },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.logError(error, req);
        res.status(500).json({
            success: false,
            error: 'Failed to unban user',
            code: 'UNBAN_USER_ERROR',
            timestamp: new Date().toISOString()
        });
    }
};

const updateUserStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const { status, reason } = req.body;

        const validStatuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'BANNED', 'PENDING_VERIFICATION'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status',
                code: 'INVALID_STATUS',
                validStatuses,
                timestamp: new Date().toISOString()
            });
        }

        const existingUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, username: true, status: true, roles: true }
        });

        if (!existingUser) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
                code: 'USER_NOT_FOUND',
                timestamp: new Date().toISOString()
            });
        }

        // Prevent changing status of other admins (unless super admin)
        if (existingUser.roles.includes('ADMIN') && !req.user.roles.includes('SUPER_ADMIN')) {
            return res.status(403).json({
                success: false,
                error: 'Cannot modify admin user status',
                code: 'INSUFFICIENT_PERMISSIONS',
                timestamp: new Date().toISOString()
            });
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { status },
            select: {
                id: true,
                email: true,
                username: true,
                status: true
            }
        });

        // Clear user cache
        await clearUserCache(userId);

        // Log admin action
        await prisma.adminLog.create({
            data: {
                adminId: req.user.id,
                targetId: userId,
                action: 'UPDATE_USER_STATUS',
                details: { oldStatus: existingUser.status, newStatus: status, reason },
                reason: reason || 'Status updated by admin',
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            }
        });

        res.json({
            success: true,
            message: 'User status updated successfully',
            data: { user: updatedUser },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.logError(error, req);
        res.status(500).json({
            success: false,
            error: 'Failed to update user status',
            code: 'UPDATE_STATUS_ERROR',
            timestamp: new Date().toISOString()
        });
    }
};

const updateUserRoles = async (req, res) => {
    try {
        const { userId } = req.params;
        const { roles, reason } = req.body;

        if (!Array.isArray(roles) || roles.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Roles must be a non-empty array',
                code: 'INVALID_ROLES',
                timestamp: new Date().toISOString()
            });
        }

        const validRoles = ['USER', 'INFLUENCER', 'BRAND', 'CREW', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN'];
        const invalidRoles = roles.filter(role => !validRoles.includes(role));
        if (invalidRoles.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid roles provided',
                code: 'INVALID_ROLES',
                invalidRoles,
                validRoles,
                timestamp: new Date().toISOString()
            });
        }

        // Only super admins can assign ADMIN or SUPER_ADMIN roles
        if ((roles.includes('ADMIN') || roles.includes('SUPER_ADMIN')) && !req.user.roles.includes('SUPER_ADMIN')) {
            return res.status(403).json({
                success: false,
                error: 'Only super admins can assign admin roles',
                code: 'INSUFFICIENT_PERMISSIONS',
                timestamp: new Date().toISOString()
            });
        }

        const existingUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, username: true, roles: true }
        });

        if (!existingUser) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
                code: 'USER_NOT_FOUND',
                timestamp: new Date().toISOString()
            });
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { roles },
            select: {
                id: true,
                email: true,
                username: true,
                roles: true
            }
        });

        // Clear user cache
        await clearUserCache(userId);

        // Log admin action
        await prisma.adminLog.create({
            data: {
                adminId: req.user.id,
                targetId: userId,
                action: 'UPDATE_USER_ROLES',
                details: { oldRoles: existingUser.roles, newRoles: roles, reason },
                reason: reason || 'Roles updated by admin',
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            }
        });

        res.json({
            success: true,
            message: 'User roles updated successfully',
            data: { user: updatedUser },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.logError(error, req);
        res.status(500).json({
            success: false,
            error: 'Failed to update user roles',
            code: 'UPDATE_ROLES_ERROR',
            timestamp: new Date().toISOString()
        });
    }
};

// Analytics Operations
const getUserAnalytics = async (req, res) => {
    try {
        const { period = '30d' } = req.query;

        // Calculate date range
        let startDate;
        switch (period) {
            case '7d':
                startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                break;
            case '90d':
                startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
                break;
            case '1y':
                startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        }

        const [
            totalUsers,
            activeUsers,
            newUsers,
            verifiedUsers,
            bannedUsers,
            usersByRole,
            usersByStatus,
            recentRegistrations
        ] = await Promise.all([
            // Total users
            prisma.user.count(),

            // Active users (logged in within period)
            prisma.user.count({
                where: {
                    lastLoginAt: { gte: startDate }
                }
            }),

            // New users in period
            prisma.user.count({
                where: {
                    createdAt: { gte: startDate }
                }
            }),

            // Verified users
            prisma.user.count({
                where: { emailVerified: true }
            }),

            // Banned users
            prisma.user.count({
                where: { isBanned: true }
            }),

            // Users by role
            prisma.user.groupBy({
                by: ['roles'],
                _count: { id: true }
            }),

            // Users by status
            prisma.user.groupBy({
                by: ['status'],
                _count: { id: true }
            }),

            // Recent registrations (daily breakdown)
            prisma.$queryRaw`
                SELECT 
                    DATE("createdAt") as date,
                    COUNT(*) as count
                FROM "authUsers"
                WHERE "createdAt" >= ${startDate}
                GROUP BY DATE("createdAt")
                ORDER BY date DESC
                LIMIT 30
            `
        ]);

        // Process role counts
        const roleStats = {};
        usersByRole.forEach(group => {
            group.roles.forEach(role => {
                roleStats[role] = (roleStats[role] || 0) + group._count.id;
            });
        });

        // Process status counts
        const statusStats = {};
        usersByStatus.forEach(group => {
            statusStats[group.status] = group._count.id;
        });

        // Log admin action
        await prisma.adminLog.create({
            data: {
                adminId: req.user.id,
                action: 'GET_USER_ANALYTICS',
                details: { period },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            }
        });

        res.json({
            success: true,
            data: {
                overview: {
                    totalUsers,
                    activeUsers,
                    newUsers,
                    verifiedUsers,
                    bannedUsers,
                    verificationRate: totalUsers > 0 ? (verifiedUsers / totalUsers * 100).toFixed(2) : 0,
                    activityRate: totalUsers > 0 ? (activeUsers / totalUsers * 100).toFixed(2) : 0
                },
                roleDistribution: roleStats,
                statusDistribution: statusStats,
                registrationTrend: recentRegistrations,
                period
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.logError(error, req);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user analytics',
            code: 'ANALYTICS_ERROR',
            timestamp: new Date().toISOString()
        });
    }
};

const getAdminLogs = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            action,
            adminId,
            targetId,
            startDate,
            endDate
        } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        // Build filter conditions
        const where = {};
        if (action) where.action = action;
        if (adminId) where.adminId = adminId;
        if (targetId) where.targetId = targetId;
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) where.createdAt.lte = new Date(endDate);
        }

        const [logs, totalCount] = await Promise.all([
            prisma.adminLog.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                include: {
                    admin: {
                        select: {
                            id: true,
                            username: true,
                            email: true
                        }
                    },
                    target: {
                        select: {
                            id: true,
                            username: true,
                            email: true
                        }
                    }
                }
            }),
            prisma.adminLog.count({ where })
        ]);

        res.json({
            success: true,
            data: {
                logs,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: totalCount,
                    pages: Math.ceil(totalCount / parseInt(limit))
                }
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.logError(error, req);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch admin logs',
            code: 'FETCH_LOGS_ERROR',
            timestamp: new Date().toISOString()
        });
    }
};

const deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { reason, confirmDelete } = req.body;

        if (!confirmDelete) {
            return res.status(400).json({
                success: false,
                error: 'Delete confirmation required',
                code: 'CONFIRMATION_REQUIRED',
                timestamp: new Date().toISOString()
            });
        }

        const existingUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, username: true, roles: true }
        });

        if (!existingUser) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
                code: 'USER_NOT_FOUND',
                timestamp: new Date().toISOString()
            });
        }

        // Prevent deleting other admins (unless super admin)
        if (existingUser.roles.includes('ADMIN') && !req.user.roles.includes('SUPER_ADMIN')) {
            return res.status(403).json({
                success: false,
                error: 'Cannot delete admin users',
                code: 'INSUFFICIENT_PERMISSIONS',
                timestamp: new Date().toISOString()
            });
        }

        // Log admin action before deletion
        await prisma.adminLog.create({
            data: {
                adminId: req.user.id,
                targetId: userId,
                action: 'DELETE_USER',
                details: {
                    deletedUser: {
                        email: existingUser.email,
                        username: existingUser.username,
                        roles: existingUser.roles
                    },
                    reason
                },
                reason: reason || 'User deleted by admin',
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            }
        });

        // Delete user (cascade will handle related records)
        await prisma.user.delete({
            where: { id: userId }
        });

        // Clear user cache
        await clearUserCache(userId);

        res.json({
            success: true,
            message: 'User deleted successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.logError(error, req);
        res.status(500).json({
            success: false,
            error: 'Failed to delete user',
            code: 'DELETE_USER_ERROR',
            timestamp: new Date().toISOString()
        });
    }
};

// System Operations
const getSystemStats = async (req, res) => {
    try {
        const [
            totalUsers,
            activeUsers24h,
            verifiedUsers,
            bannedUsers,
            totalRefreshTokens,
            recentActivity
        ] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({
                where: {
                    lastActiveAt: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                    }
                }
            }),
            prisma.user.count({
                where: { emailVerified: true }
            }),
            prisma.user.count({
                where: { isBanned: true }
            }),
            prisma.refreshToken.count(),
            prisma.adminLog.count({
                where: {
                    createdAt: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                    }
                }
            })
        ]);

        res.json({
            success: true,
            data: {
                users: {
                    total: totalUsers,
                    active24h: activeUsers24h,
                    verified: verifiedUsers,
                    banned: bannedUsers,
                    verificationRate: totalUsers > 0 ? (verifiedUsers / totalUsers * 100).toFixed(2) : 0
                },
                tokens: {
                    activeRefreshTokens: totalRefreshTokens
                },
                activity: {
                    adminActions24h: recentActivity
                },
                uptime: process.uptime(),
                timestamp: new Date().toISOString()
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.logError(error, req);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch system stats',
            code: 'SYSTEM_STATS_ERROR',
            timestamp: new Date().toISOString()
        });
    }
};

module.exports = {
    // User Management
    getAllUsers,
    getUserById,
    banUser,
    unbanUser,
    updateUserStatus,
    updateUserRoles,
    deleteUser,

    // Analytics
    getUserAnalytics,
    getAdminLogs,

    // System
    getSystemStats
};