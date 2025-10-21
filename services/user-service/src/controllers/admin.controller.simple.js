// src/controllers/admin.controller.simple.js
const { StatusCodes } = require('http-status-codes');
const { prisma } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Get admin statistics
 */
const getStats = async (req, res) => {
    try {
        const totalUsers = await prisma.user.count();
        const activeUsers = await prisma.user.count({ where: { isActive: true } });
        const verifiedUsers = await prisma.user.count({ where: { emailVerified: true } });
        const bannedUsers = await prisma.user.count({ where: { isBanned: true } });

        const usersByRole = await prisma.user.groupBy({
            by: ['roles'],
            _count: { id: true }
        });

        const recentUsers = await prisma.user.count({
            where: {
                createdAt: {
                    gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
                }
            }
        });

        res.status(StatusCodes.OK).json({
            success: true,
            data: {
                totalUsers,
                activeUsers,
                verifiedUsers,
                bannedUsers,
                recentUsers,
                usersByRole,
                generatedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        logger.error('Error getting admin stats:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: 'Failed to fetch admin statistics'
        });
    }
};

/**
 * Get all users with basic filtering
 */
const getUsers = async (req, res) => {
    try {
        const { limit = 10, offset = 0, roles, status } = req.query;

        const whereClause = {};

        if (roles) {
            whereClause.roles = { hasSome: roles.split(',') };
        }

        if (status) {
            whereClause.status = status;
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
            orderBy: { createdAt: 'desc' },
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

/**
 * Get user by ID
 */
const getUserById = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await prisma.user.findUnique({
            where: { id: userId },
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
                updatedAt: true,
                lastLoginAt: true,
                isBanned: true,
                banReason: true
            }
        });

        if (!user) {
            return res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                error: 'User not found'
            });
        }

        res.status(StatusCodes.OK).json({
            success: true,
            data: { user }
        });
    } catch (error) {
        logger.error('Error getting user by ID:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: 'Failed to get user'
        });
    }
};

module.exports = {
    getStats,
    getUsers,
    getUserById
};
