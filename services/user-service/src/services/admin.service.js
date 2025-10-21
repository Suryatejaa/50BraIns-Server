const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger.utils');
const { ValidationError, NotFoundError, ForbiddenError } = require('../utils/errors.utils');
const { prisma } = require('../config/database');
const {
    getFromCache,
    setToCache,
    deleteFromCache,
    deletePattern,
    isConnected
} = require('../config/redis');

class AdminService {
    /**
     * Log admin action
     */
    async logAdminAction(adminId, action, targetId = null, details = null) {
        try {
            await prisma.adminLog.create({
                data: {
                    id: uuidv4(),
                    adminId,
                    action,
                    targetId,
                    details
                }
            });
        } catch (error) {
            logger.error('Error logging admin action:', error);
        }
    }

    /**
     * Get all users with pagination and filtering
     */
    async getUsers(adminId, { page = 1, limit = 20, search, roles, isActive, sortBy = 'createdAt', sortOrder = 'desc' }) {
        try {
            const skip = (page - 1) * limit;
            const where = {};

            // Apply filters
            if (search) {
                where.OR = [
                    { email: { contains: search, mode: 'insensitive' } },
                    { username: { contains: search, mode: 'insensitive' } }
                ];
            }

            if (roles) {
                where.roles = roles;
            }

            if (isActive !== undefined) {
                where.isActive = isActive;
            }

            const [users, total] = await Promise.all([
                prisma.user.findMany({
                    where,
                    select: {
                        id: true,
                        email: true,
                        username: true,
                        roles: true,
                        isActive: true,
                        emailVerified: true,
                        createdAt: true,
                        updatedAt: true,
                        lastLoginAt: true,
                        _count: {
                            select: {
                                refreshTokens: {
                                    where: { expiresAt: { gt: new Date() } }
                                }
                            }
                        }
                    },
                    orderBy: { [sortBy]: sortOrder },
                    skip,
                    take: limit
                }),
                prisma.user.count({ where })
            ]);

            await this.logAdminAction(adminId, 'VIEW_USERS', null, `Viewed users list (page ${page})`);

            return {
                users: users.map(user => ({
                    ...user,
                    activeSessions: user._count.refreshTokens
                })),
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error('Error getting users:', error);
            throw error;
        }
    }

    /**
     * Get user details by ID
     */
    async getUserById(adminId, userId) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                include: {
                    refreshTokens: {
                        where: { expiresAt: { gt: new Date() } },
                        select: {
                            id: true,
                            createdAt: true,
                            expiresAt: true
                        }
                    }
                }
            });

            if (!user) {
                throw new NotFoundError(`User not found for id: ${userId}`);
            }

            await this.logAdminAction(adminId, 'VIEW_USER', userId, `Viewed user details: ${user.email}`);

            return {
                ...user,
                password: undefined, // Never return password
                activeSessions: user.refreshTokens
            };
        } catch (error) {
            logger.error('Error getting user by ID:', error);
            throw error;
        }
    }

    /**
     * Create a new user
     */
    async createUser(adminId, userData) {
        try {
            let { email, password, username, roles = ['USER'] } = userData;

            // Normalize roles to always be an array
            if (typeof roles === 'string') {
                roles = [roles];
            }
            if (!Array.isArray(roles) || roles.length === 0) {
                roles = ['USER'];
            }

            // Check if user already exists
            const existingUser = await prisma.user.findUnique({
                where: { email: email.toLowerCase() }
            });

            if (existingUser) {
                throw new ValidationError('User with this email already exists');
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 12);

            const user = await prisma.user.create({
                data: {
                    id: uuidv4(),
                    email: email.toLowerCase(),
                    username,
                    password: hashedPassword,
                    roles,
                    isActive: true,
                    emailVerified: false,
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                select: {
                    id: true,
                    email: true,
                    username: true,
                    roles: true,
                    isActive: true,
                    emailVerified: true,
                    createdAt: true,
                    updatedAt: true
                }
            });

            await this.logAdminAction(adminId, 'CREATE_USER', user.id, `Created user: ${user.email}`);
            logger.info(`Admin ${adminId} created user: ${user.email}`);

            return user;
        } catch (error) {
            logger.error('Error creating user:', error);
            throw error;
        }
    }

    /**
     * Update user
     */
    async updateUser(adminId, userId, updates) {
        try {
            const allowedUpdates = ['roles', 'isActive', 'emailVerified'];
            const filteredUpdates = {};

            // Filter allowed updates
            for (const key of allowedUpdates) {
                if (updates[key] !== undefined) {
                    filteredUpdates[key] = updates[key];
                }
            }

            // Normalize roles to always be an array if present
            if (filteredUpdates.roles) {
                if (typeof filteredUpdates.roles === 'string') {
                    filteredUpdates.roles = [filteredUpdates.roles];
                }
                if (!Array.isArray(filteredUpdates.roles) || filteredUpdates.roles.length === 0) {
                    filteredUpdates.roles = ['USER'];
                }
            }

            if (Object.keys(filteredUpdates).length === 0) {
                throw new ValidationError('No valid fields to update');
            }

            const user = await prisma.user.update({
                where: { id: userId },
                data: {
                    ...filteredUpdates,
                    updatedAt: new Date()
                },
                select: {
                    id: true,
                    email: true,
                    username: true,
                    roles: true,
                    isActive: true,
                    emailVerified: true,
                    updatedAt: true
                }
            });

            await this.logAdminAction(adminId, 'UPDATE_USER', userId, `Updated user: ${user.email}`);
            logger.info(`Admin ${adminId} updated user: ${userId}`);

            return user;
        } catch (error) {
            logger.error('Error updating user:', error);
            throw error;
        }
    }

    /**
     * Delete user
     */
    async deleteUser(adminId, userId) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { email: true, roles: true }
            });

            if (!user) {
                throw new NotFoundError('User not found');
            }

            // Prevent deletion of other admins (only super admin can delete admins)
            const adminUser = await prisma.user.findUnique({
                where: { id: adminId },
                select: { roles: true }
            });

            if (user.roles === 'ADMIN' && adminUser.roles !== 'SUPER_ADMIN') {
                throw new ForbiddenError('Only super admins can delete admin users');
            }

            // Start transaction to delete user and related data
            await prisma.$transaction(async (tx) => {
                // Delete refresh tokens
                await tx.refreshToken.deleteMany({
                    where: { userId }
                });

                // Delete user
                await tx.user.delete({
                    where: { id: userId }
                });
            });

            await this.logAdminAction(adminId, 'DELETE_USER', userId, `Deleted user: ${user.email}`);
            logger.info(`Admin ${adminId} deleted user: ${userId}`);

            return { success: true, message: 'User deleted successfully' };
        } catch (error) {
            logger.error('Error deleting user:', error);
            throw error;
        }
    }

    /**
     * Deactivate/Activate user
     */
    async toggleUserStatus(adminId, userId, isActive) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { email: true, roles: true, isActive: true }
            });

            if (!user) {
                throw new NotFoundError('User not found');
            }

            // Prevent deactivation of other admins (only super admin can deactivate admins)
            const adminUser = await prisma.user.findUnique({
                where: { id: adminId },
                select: { roles: true }
            });

            if (user.roles === 'ADMIN' && adminUser.roles !== 'SUPER_ADMIN') {
                throw new ForbiddenError('Only super admins can deactivate admin users');
            }

            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: {
                    isActive,
                    updatedAt: new Date()
                },
                select: {
                    id: true,
                    email: true,
                    username: true,
                    roles: true,
                    isActive: true,
                    emailVerified: true,
                    updatedAt: true
                }
            });

            // If deactivating, invalidate all sessions
            if (!isActive) {
                await prisma.refreshToken.deleteMany({
                    where: { userId }
                });

                // Clear cache
                if (isConnected()) {
                    await deletePattern(`user_*:${userId}*`);
                }
            }

            const action = isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER';
            await this.logAdminAction(adminId, action, userId, `${isActive ? 'Activated' : 'Deactivated'} user: ${user.email}`);
            logger.info(`Admin ${adminId} ${isActive ? 'activated' : 'deactivated'} user: ${userId}`);

            return updatedUser;
        } catch (error) {
            logger.error('Error toggling user status:', error);
            throw error;
        }
    }

    /**
     * Reset user password
     */
    async resetUserPassword(adminId, userId, newPassword) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { email: true }
            });

            if (!user) {
                throw new NotFoundError('User not found');
            }

            // Hash new password
            const hashedPassword = await bcrypt.hash(newPassword, 12);

            await prisma.user.update({
                where: { id: userId },
                data: {
                    password: hashedPassword,
                    updatedAt: new Date()
                }
            });

            // Invalidate all user sessions
            await prisma.refreshToken.deleteMany({
                where: { userId }
            });

            await this.logAdminAction(adminId, 'RESET_PASSWORD', userId, `Reset password for user: ${user.email}`);
            logger.info(`Admin ${adminId} reset password for user: ${userId}`);

            return { success: true, message: 'Password reset successfully' };
        } catch (error) {
            logger.error('Error resetting user password:', error);
            throw error;
        }
    }

    /**
     * Get admin logs with pagination
     */
    async getAdminLogs(adminId, { page = 1, limit = 50, adminFilter, action, startDate, endDate }) {
        try {
            const skip = (page - 1) * limit;
            const where = {};

            // Apply filters
            if (adminFilter) {
                where.adminId = adminFilter;
            }

            if (action) {
                where.action = action;
            }

            if (startDate || endDate) {
                where.createdAt = {};
                if (startDate) {
                    where.createdAt.gte = new Date(startDate);
                }
                if (endDate) {
                    where.createdAt.lte = new Date(endDate);
                }
            }

            const [logs, total] = await Promise.all([
                prisma.adminLog.findMany({
                    where,
                    include: {
                        admin: {
                            select: {
                                email: true,
                                firstName: true,
                                lastName: true
                            }
                        }
                    },
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take: limit
                }),
                prisma.adminLog.count({ where })
            ]);

            await this.logAdminAction(adminId, 'VIEW_ADMIN_LOGS', null, `Viewed admin logs (page ${page})`);

            return {
                logs,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error('Error getting admin logs:', error);
            throw error;
        }
    }

    /**
     * Get system statistics
     */
    async getSystemStats(adminId) {
        try {
            const [
                totalUsers,
                activeUsers,
                adminUsers,
                totalSessions,
                activeSessions,
                recentRegistrations
            ] = await Promise.all([
                prisma.user.count(),
                prisma.user.count({ where: { isActive: true } }),
                prisma.user.count({ where: { roles: { in: ['ADMIN', 'SUPER_ADMIN'] } } }),
                prisma.refreshToken.count(),
                prisma.refreshToken.count({
                    where: {
                        expiresAt: { gt: new Date() }
                    }
                }),
                prisma.user.count({
                    where: {
                        createdAt: {
                            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
                        }
                    }
                })
            ]);

            await this.logAdminAction(adminId, 'VIEW_SYSTEM_STATS', null, 'Viewed system statistics');

            return {
                totalUsers,
                activeUsers,
                inactiveUsers: totalUsers - activeUsers,
                adminUsers,
                newUsersToday: recentRegistrations,
                totalSessions,
                activeSessions,
                expiredSessions: totalSessions - activeSessions,
                systemUptime: process.uptime(),
                nodeVersion: process.version,
                environment: process.env.NODE_ENV || 'development'
            };
        } catch (error) {
            logger.error('Error getting system stats:', error);
            throw error;
        }
    }

    /**
     * Promote user to admin (super admin only)
     */
    async promoteToAdmin(adminId, userId) {
        try {
            // Check if requesting admin is super admin
            const adminUser = await prisma.user.findUnique({
                where: { id: adminId },
                select: { roles: true }
            });

            if (adminUser.roles !== 'SUPER_ADMIN') {
                throw new ForbiddenError('Only super admins can promote users to admin');
            }

            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { email: true, roles: true }
            });

            if (!user) {
                throw new NotFoundError('User not found');
            }

            if (user.roles !== 'USER') {
                throw new ValidationError('User is already an admin');
            }

            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: {
                    roles: 'ADMIN',
                    updatedAt: new Date()
                },
                select: {
                    id: true,
                    email: true,
                    username: true,
                    roles: true,
                    isActive: true,
                    emailVerified: true,
                    updatedAt: true
                }
            });

            await this.logAdminAction(adminId, 'PROMOTE_TO_ADMIN', userId, `Promoted user to admin: ${user.email}`);
            logger.info(`Super admin ${adminId} promoted user ${userId} to admin`);

            return updatedUser;
        } catch (error) {
            logger.error('Error promoting user to admin:', error);
            throw error;
        }
    }

    /**
     * Demote admin to user (super admin only)
     */
    async demoteAdmin(adminId, userId) {
        try {
            // Check if requesting admin is super admin
            const adminUser = await prisma.user.findUnique({
                where: { id: adminId },
                select: { roles: true }
            });

            if (adminUser.roles !== 'SUPER_ADMIN') {
                throw new ForbiddenError('Only super admins can demote admin users');
            }

            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { email: true, roles: true }
            });

            if (!user) {
                throw new NotFoundError('User not found');
            }

            if (user.roles === 'SUPER_ADMIN') {
                throw new ForbiddenError('Cannot demote super admin');
            }

            if (user.roles !== 'ADMIN') {
                throw new ValidationError('User is not an admin');
            }

            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: {
                    roles: 'USER',
                    updatedAt: new Date()
                },
                select: {
                    id: true,
                    email: true,
                    username: true,
                    roles: true,
                    isActive: true,
                    emailVerified: true,
                    updatedAt: true
                }
            });

            await this.logAdminAction(adminId, 'DEMOTE_ADMIN', userId, `Demoted admin to user: ${user.email}`);
            logger.info(`Super admin ${adminId} demoted admin ${userId} to user`);

            return updatedUser;
        } catch (error) {
            logger.error('Error demoting admin:', error);
            throw error;
        }
    }

    /**
     * Update user status (active/inactive)
     */
    async updateUserStatus(adminId, userId, status, reason) {
        try {
            // Validate status
            const validStatuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'BANNED'];
            if (!validStatuses.includes(status)) {
                throw new ValidationError('Invalid status specified');
            }

            // Prevent self-modification
            if (adminId === userId) {
                throw new ValidationError('Cannot modify your own status');
            }

            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { email: true, status: true }
            });

            if (!user) {
                throw new NotFoundError('User not found');
            }

            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: {
                    status: status,
                    isActive: status === 'ACTIVE',
                    updatedAt: new Date()
                },
                select: {
                    id: true,
                    email: true,
                    username: true,
                    roles: true,
                    status: true,
                    isActive: true,
                    updatedAt: true
                }
            });

            await this.logAdminAction(adminId, 'UPDATE_STATUS', userId,
                `Changed status from ${user.status} to ${status}: ${reason}`);
            logger.info(`Admin ${adminId} updated user ${userId} status to ${status}`);

            return updatedUser;
        } catch (error) {
            logger.error('Error updating user status:', error);
            throw error;
        }
    }

    /**
     * Ban user
     */
    async banUser(adminId, userId, { reason, duration, permanent = false }) {
        try {
            // Prevent self-ban
            if (adminId === userId) {
                throw new ValidationError('Cannot ban yourself');
            }

            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { email: true, roles: true, isActive: true }
            });

            if (!user) {
                throw new NotFoundError('User not found');
            }

            // Calculate ban expiry
            let banExpiresAt = null;
            if (!permanent && duration) {
                const now = new Date();
                banExpiresAt = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000); // duration in days
            }

            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: {
                    status: 'BANNED',
                    isBanned: true,
                    bannedAt: new Date(),
                    bannedBy: adminId,
                    banReason: reason,
                    banExpiresAt,
                    updatedAt: new Date()
                },
                select: {
                    id: true,
                    email: true,
                    username: true,
                    roles: true,
                    status: true,
                    isBanned: true,
                    bannedAt: true,
                    banReason: true,
                    banExpiresAt: true,
                    updatedAt: true
                }
            });

            // Invalidate all user's refresh tokens
            await prisma.refreshToken.deleteMany({
                where: { userId }
            });

            await this.logAdminAction(adminId, 'BAN_USER', userId,
                `Banned user${permanent ? ' permanently' : ` until ${banExpiresAt}`}: ${reason}`);
            logger.info(`Admin ${adminId} banned user ${userId}`);

            return updatedUser;
        } catch (error) {
            logger.error('Error banning user:', error);
            throw error;
        }
    }

    /**
     * Unban user
     */
    async unbanUser(adminId, userId, reason) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { email: true, isBanned: true, bannedAt: true }
            });

            if (!user) {
                throw new NotFoundError('User not found');
            }

            if (!user.isBanned) {
                throw new ValidationError('User is not banned');
            }

            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: {
                    status: 'ACTIVE',
                    isBanned: false,
                    bannedAt: null,
                    bannedBy: null,
                    banReason: null,
                    banExpiresAt: null,
                    updatedAt: new Date()
                },
                select: {
                    id: true,
                    email: true,
                    username: true,
                    roles: true,
                    status: true,
                    isBanned: true,
                    updatedAt: true
                }
            });

            await this.logAdminAction(adminId, 'UNBAN_USER', userId,
                `Unbanned user: ${reason}`);
            logger.info(`Admin ${adminId} unbanned user ${userId}`);

            return updatedUser;
        } catch (error) {
            logger.error('Error unbanning user:', error);
            throw error;
        }
    }

    /**
     * Update user roles (multi-roles, super admin only)
     */
    async updateUserRoles(adminId, userId, newRoles, reason) {
        try {
            // Check if requesting admin is super admin
            const adminUser = await prisma.user.findUnique({
                where: { id: adminId },
                select: { roles: true }
            });

            if (!adminUser.roles || !adminUser.roles.includes('SUPER_ADMIN')) {
                throw new ForbiddenError('Only super admins can change user roles');
            }

            // Prevent self-modification
            if (adminId === userId) {
                throw new ValidationError('Cannot modify your own roles');
            }

            // Validate roles
            const validRoles = ['USER', 'INFLUENCER', 'BRAND', 'CREW', 'ADMIN', 'SUPER_ADMIN', 'MODERATOR', 'WRITER', 'EDITOR'];
            for (const role of newRoles) {
                if (!validRoles.includes(role)) {
                    throw new ValidationError(`Invalid role: ${role}`);
                }
            }

            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { email: true, roles: true }
            });

            if (!user) {
                throw new NotFoundError('User not found');
            }

            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: {
                    roles: newRoles,
                    updatedAt: new Date()
                },
                select: {
                    id: true,
                    email: true,
                    username: true,
                    roles: true,
                    isActive: true,
                    emailVerified: true,
                    updatedAt: true
                }
            });

            await this.logAdminAction(adminId, 'UPDATE_ROLES', userId,
                `Changed roles from ${user.roles} to ${newRoles}: ${reason}`);
            logger.info(`Super admin ${adminId} updated user ${userId} roles to ${newRoles}`);

            return updatedUser;
        } catch (error) {
            logger.error('Error updating user roles:', error);
            throw error;
        }
    }
}

module.exports = new AdminService();