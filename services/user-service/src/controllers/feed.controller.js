const { StatusCodes } = require('http-status-codes');
const { prisma } = require('../config/database');
const axios = require('axios');
const logger = require('../utils/logger');

const REPUTATION_SERVICE_URL = process.env.REPUTATION_SERVICE_URL || 'http://localhost:4006';

/**
 * Get all users with advanced sorting and filtering for feed
 */
const getUsersFeed = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            sortBy = 'score', // score, date, relevance, alphabetical, activity
            sortOrder = 'desc', // asc, desc
            roles, // USER, INFLUENCER, BRAND, CREW
            location,
            verified,
            active = true,
            search,
            minScore,
            maxScore,
            tier // BRONZE, SILVER, GOLD, PLATINUM, DIAMOND, LEGEND
        } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const where = {};

        // Apply filters
        if (roles) {
            const rolesArray = Array.isArray(roles) ? roles : roles.split(',');
            where.roles = { hasSome: rolesArray.map(r => r.toUpperCase()) };
        }

        if (location) {
            where.location = { contains: location, mode: 'insensitive' };
        }

        if (verified !== undefined) {
            where.emailVerified = verified === 'true';
        }

        if (active !== undefined) {
            where.isActive = active === 'true';
        }

        if (search) {
            where.OR = [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { username: { contains: search, mode: 'insensitive' } },
                { bio: { contains: search, mode: 'insensitive' } }
            ];
        }

        // Get users from database
        let orderBy = {};

        // Handle sorting
        switch (sortBy) {
            case 'alphabetical':
                orderBy = { username: sortOrder };
                break;
            case 'date':
                orderBy = { createdAt: sortOrder };
                break;
            case 'activity':
                orderBy = { lastSeen: sortOrder };
                break;
            case 'relevance':
                // For relevance, we'll use a combination of factors
                orderBy = { updatedAt: sortOrder };
                break;
            case 'score':
            default:
                // We'll sort by score later after fetching reputation data
                orderBy = { createdAt: 'desc' };
                break;
        }

        const users = await prisma.user.findMany({
            where,
            skip,
            take: parseInt(limit),
            orderBy,
            select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                email: true,
                profilePicture: true,
                bio: true,
                location: true,
                roles: true,
                isActive: true,
                emailVerified: true,
                createdAt: true,
                lastActiveAt: true,
                _count: {
                    select: {
                        refreshTokens: true,
                        equipment: true
                    }
                }
            }
        });

        const total = await prisma.user.count({ where });

        // If sorting by score, fetch reputation data
        let enrichedUsers = users;
        if (sortBy === 'score' || minScore || maxScore || tier) {
            try {
                // Get reputation data for all users
                const userIds = users.map(user => user.id);
                const reputationPromises = userIds.map(async (userId) => {
                    try {
                        const response = await axios.get(`${REPUTATION_SERVICE_URL}/api/reputation/${userId}`);
                        return response.data.success ? response.data.data : null;
                    } catch (error) {
                        logger.warn(`Failed to fetch reputation for user ${userId}:`, error.message);
                        return null;
                    }
                });

                const reputationData = await Promise.all(reputationPromises);
                const reputationMap = {};

                reputationData.forEach((rep, index) => {
                    if (rep) {
                        reputationMap[userIds[index]] = rep;
                    }
                });

                // Enrich users with reputation data
                enrichedUsers = users.map(user => ({
                    ...user,
                    reputation: reputationMap[user.id] || {
                        finalScore: 0,
                        tier: 'BRONZE',
                        badges: [],
                        ranking: { global: null, tier: null }
                    }
                }));

                // Apply reputation-based filters
                enrichedUsers = enrichedUsers.filter(user => {
                    if (minScore && user.reputation.finalScore < parseFloat(minScore)) return false;
                    if (maxScore && user.reputation.finalScore > parseFloat(maxScore)) return false;
                    if (tier && user.reputation.tier !== tier.toUpperCase()) return false;
                    return true;
                });

                // Sort by score if requested
                if (sortBy === 'score') {
                    enrichedUsers.sort((a, b) => {
                        const scoreA = a.reputation.finalScore || 0;
                        const scoreB = b.reputation.finalScore || 0;
                        return sortOrder === 'desc' ? scoreB - scoreA : scoreA - scoreB;
                    });
                }

            } catch (error) {
                logger.error('Error fetching reputation data:', error);
                // Continue without reputation data
            }
        }

        // Format response
        const formattedUsers = enrichedUsers.map(user => ({
            id: user.id,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: `${user.firstName} ${user.lastName}`.trim(),
            profilePicture: user.profilePicture,
            bio: user.bio,
            location: user.location,
            roles: user.roles,
            isActive: user.isActive,
            emailVerified: user.emailVerified,
            createdAt: user.createdAt,
            lastActiveAt: user.lastActiveAt,
            tokenCount: user._count?.refreshTokens || 0,
            equipmentCount: user._count?.equipment || 0,
            reputation: user.reputation || {
                finalScore: 0,
                tier: 'BRONZE',
                badges: [],
                ranking: { global: null, tier: null }
            }
        }));

        res.status(StatusCodes.OK).json({
            success: true,
            data: {
                users: formattedUsers,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit)),
                    hasNext: skip + parseInt(limit) < total,
                    hasPrev: parseInt(page) > 1
                },
                filters: {
                    sortBy,
                    sortOrder,
                    roles: roles?.split(',') || [],
                    location,
                    verified,
                    active,
                    search,
                    minScore,
                    maxScore,
                    tier
                }
            }
        });

    } catch (error) {
        logger.error('Error in getUsersFeed:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to fetch users feed',
            error: error.message
        });
    }
};

/**
 * Get top users by various criteria
 */
const getTopUsers = async (req, res) => {
    try {
        const {
            criteria = 'score', // score, connections, activity, gigs
            limit = 10,
            timeframe = 'all', // all, month, week, today
            roles
        } = req.query;

        let where = { isActive: true };

        if (roles) {
            const rolesArray = Array.isArray(roles) ? roles : roles.split(',');
            where.roles = { hasSome: rolesArray.map(r => r.toUpperCase()) };
        }

        // Apply timeframe filter
        if (timeframe !== 'all') {
            const now = new Date();
            let dateFilter;

            switch (timeframe) {
                case 'today':
                    dateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    break;
                case 'week':
                    dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case 'month':
                    dateFilter = new Date(now.getFullYear(), now.getMonth(), 1);
                    break;
            }

            if (dateFilter) {
                where.lastActiveAt = { gte: dateFilter };
            }
        }

        let orderBy = {};
        switch (criteria) {
            case 'connections':
                orderBy = { connectionsCount: 'desc' };
                break;
            case 'activity':
                orderBy = { lastActiveAt: 'desc' };
                break;
            case 'gigs':
                // This would need integration with gig service
                orderBy = { createdAt: 'desc' };
                break;
            case 'score':
            default:
                orderBy = { createdAt: 'desc' }; // Will sort by reputation later
                break;
        }

        const users = await prisma.user.findMany({
            where,
            take: parseInt(limit),
            orderBy,
            select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                profilePicture: true,
                bio: true,
                location: true,
                roles: true,
                isActive: true,
                emailVerified: true,
                createdAt: true,
                lastActiveAt: true,
                _count: {
                    select: {
                        refreshTokens: true,
                        equipment: true
                    }
                }
            }
        });

        // Fetch reputation data if needed
        let enrichedUsers = users;
        if (criteria === 'score') {
            try {
                const response = await axios.get(`${REPUTATION_SERVICE_URL}/api/reputation/leaderboard/global?limit=${limit}`, {
                    timeout: 5000,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (response.data && response.data.success) {
                    const leaderboard = response.data.data?.users || [];

                    // Match users with leaderboard data
                    enrichedUsers = leaderboard
                        .map(entry => {
                            const user = users.find(u => u.id === entry.userId);
                            if (user) {
                                return {
                                    ...user,
                                    reputation: {
                                        finalScore: entry.finalScore || 0,
                                        tier: entry.tier || 'BRONZE',
                                        badges: entry.badges || [],
                                        ranking: { global: { rank: entry.rank || 0 } }
                                    }
                                };
                            }
                            return null;
                        })
                        .filter(Boolean)
                        .slice(0, parseInt(limit));
                }
            } catch (error) {
                logger.error('Error fetching leaderboard:', error.message);
                // Continue with original users if reputation service is unavailable
                enrichedUsers = users;
            }
        }

        // Format response
        const formattedUsers = enrichedUsers.map((user, index) => ({
            rank: index + 1,
            id: user.id,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: `${user.firstName} ${user.lastName}`.trim(),
            profilePicture: user.profilePicture,
            bio: user.bio,
            location: user.location,
            roles: user.roles,
            isActive: user.isActive,
            emailVerified: user.emailVerified,
            lastActiveAt: user.lastActiveAt,
            tokenCount: user._count?.refreshTokens || 0,
            equipmentCount: user._count?.equipment || 0,
            reputation: user.reputation || {
                finalScore: 0,
                tier: 'BRONZE',
                badges: [],
                ranking: { global: null }
            }
        }));

        res.status(StatusCodes.OK).json({
            success: true,
            data: {
                users: formattedUsers,
                criteria,
                timeframe,
                limit: parseInt(limit)
            }
        });

    } catch (error) {
        logger.error('Error in getTopUsers:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to fetch top users',
            error: error.message
        });
    }
};

/**
 * Get user statistics for admin dashboard
 */
const getUserStats = async (req, res) => {
    try {
        // Basic user counts
        const totalUsers = await prisma.user.count();
        const activeUsers = await prisma.user.count({ where: { isActive: true } });
        const verifiedUsers = await prisma.user.count({ where: { emailVerified: true } });

        // Role distribution
        const roleStats = await prisma.user.groupBy({
            by: ['roles'],
            _count: true
        });

        // Recent registrations (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentUsers = await prisma.user.count({
            where: {
                createdAt: { gte: thirtyDaysAgo }
            }
        });

        // Active users (logged in last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const weeklyActiveUsers = await prisma.user.count({
            where: {
                lastSeen: { gte: sevenDaysAgo }
            }
        });

        res.status(StatusCodes.OK).json({
            success: true,
            data: {
                overview: {
                    totalUsers,
                    activeUsers,
                    verifiedUsers,
                    recentUsers,
                    weeklyActiveUsers,
                    inactiveUsers: totalUsers - activeUsers
                },
                roleDistribution: roleStats.reduce((acc, stat) => {
                    stat.roles.forEach(role => {
                        acc[role] = (acc[role] || 0) + stat._count;
                    });
                    return acc;
                }, {}),
                growthMetrics: {
                    last30Days: recentUsers,
                    weeklyActive: weeklyActiveUsers,
                    verificationRate: totalUsers > 0 ? (verifiedUsers / totalUsers * 100).toFixed(2) : 0,
                    activationRate: totalUsers > 0 ? (activeUsers / totalUsers * 100).toFixed(2) : 0
                }
            }
        });

    } catch (error) {
        logger.error('Error in getUserStats:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to fetch user statistics',
            error: error.message
        });
    }
};

module.exports = {
    getUsersFeed,
    getTopUsers,
    getUserStats
};
