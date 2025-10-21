const express = require('express');
const { PrismaClient } = require('@prisma/client');
const ScoringEngine = require('../services/scoringEngine');
const LeaderboardService = require('../services/leaderboardService');

const router = express.Router();
const prisma = new PrismaClient();
const scoringEngine = new ScoringEngine();
const leaderboardService = new LeaderboardService();

/**
 * GET /api/reputation/:userId
 * Get reputation score for a specific user
 */
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const reputation = await prisma.reputationScore.findUnique({
            where: { userId }
        });

        if (!reputation) {
            // Create default reputation record for new user
            const newReputation = await prisma.reputationScore.create({
                data: {
                    userId,
                    totalScore: 0,
                    reliabilityScore: 0,
                    qualityScore: 0,
                    communicationScore: 0,
                    timelinessScore: 0,
                    overallRating: 0,
                    totalGigs: 0,
                    completedGigs: 0,
                    cancelledGigs: 0,
                    avgDeliveryTime: 0,
                    onTimeDeliveryRate: 0,
                    clientSatisfactionRate: 0,
                    responseTime: 0,
                    level: 'NEWCOMER',
                    rank: 0,
                    badges: []
                }
            });

            // Get user's rank (will be last)
            const globalRank = await leaderboardService.getUserRank(userId, 'global');
            const tierRank = await leaderboardService.getUserRank(userId, 'tier');

            return res.json({
                success: true,
                data: {
                    userId: newReputation.userId,
                    totalScore: newReputation.totalScore,
                    reliabilityScore: newReputation.reliabilityScore,
                    qualityScore: newReputation.qualityScore,
                    communicationScore: newReputation.communicationScore,
                    timelinessScore: newReputation.timelinessScore,
                    overallRating: newReputation.overallRating,
                    level: newReputation.level,
                    rank: newReputation.rank,
                    badges: newReputation.badges,
                    metrics: {
                        totalGigs: newReputation.totalGigs,
                        completedGigs: newReputation.completedGigs,
                        cancelledGigs: newReputation.cancelledGigs,
                        avgDeliveryTime: newReputation.avgDeliveryTime,
                        onTimeDeliveryRate: newReputation.onTimeDeliveryRate,
                        clientSatisfactionRate: newReputation.clientSatisfactionRate,
                        responseTime: newReputation.responseTime
                    },
                    ranking: {
                        global: globalRank,
                        tier: tierRank
                    },
                    lastUpdated: newReputation.lastUpdated,
                    createdAt: newReputation.createdAt
                }
            });
        }

        // Get user's rank
        const globalRank = await leaderboardService.getUserRank(userId, 'global');
        const tierRank = await leaderboardService.getUserRank(userId, 'tier');

        res.json({
            success: true,
            data: {
                userId: reputation.userId,
                totalScore: reputation.totalScore,
                reliabilityScore: reputation.reliabilityScore,
                qualityScore: reputation.qualityScore,
                communicationScore: reputation.communicationScore,
                timelinessScore: reputation.timelinessScore,
                overallRating: reputation.overallRating,
                level: reputation.level,
                rank: reputation.rank,
                badges: reputation.badges,
                metrics: {
                    totalGigs: reputation.totalGigs,
                    completedGigs: reputation.completedGigs,
                    cancelledGigs: reputation.cancelledGigs,
                    avgDeliveryTime: reputation.avgDeliveryTime,
                    onTimeDeliveryRate: reputation.onTimeDeliveryRate,
                    clientSatisfactionRate: reputation.clientSatisfactionRate,
                    responseTime: reputation.responseTime
                },
                ranking: {
                    global: globalRank,
                    tier: tierRank
                },
                lastUpdated: reputation.lastUpdated,
                createdAt: reputation.createdAt
            }
        });

    } catch (error) {
        console.error('❌ [Reputation API] Get reputation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get reputation',
            error: error.message
        });
    }
});

/**
 * POST /api/reputation/:userId/recalculate
 * Manually recalculate user's reputation score
 */
router.post('/:userId/recalculate', async (req, res) => {
    try {
        const { userId } = req.params;
        const { reason = 'manual_recalculation' } = req.body;

        // Check if user exists
        const user = await prisma.reputationScore.findUnique({
            where: { userId }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Recalculate reputation
        const updatedReputation = await scoringEngine.updateUserReputation(userId, {
            reason,
            manual: true
        });

        res.json({
            success: true,
            message: 'Reputation recalculated successfully',
            data: {
                userId: updatedReputation.userId,
                totalScore: updatedReputation.totalScore,
                level: updatedReputation.level,
                lastUpdated: updatedReputation.lastUpdated
            }
        });

    } catch (error) {
        console.error('❌ [Reputation API] Recalculate error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to recalculate reputation',
            error: error.message
        });
    }
});

/**
 * GET /api/reputation/:userId/history
 * Get reputation score history for a user
 */
router.get('/:userId/history', async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 50, offset = 0 } = req.query;

        const history = await prisma.scoreHistory.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            skip: parseInt(offset),
            take: parseInt(limit)
        });

        const total = await prisma.scoreHistory.count({
            where: { userId }
        });

        res.json({
            success: true,
            data: {
                history,
                pagination: {
                    total,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    hasMore: (parseInt(offset) + parseInt(limit)) < total
                }
            }
        });

    } catch (error) {
        console.error('❌ [Reputation API] Get history error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get reputation history',
            error: error.message
        });
    }
});

/**
 * GET /api/reputation/:userId/activity
 * Get activity log for a user
 */
router.get('/:userId/activity', async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 50, offset = 0, activityType } = req.query;

        let whereClause = { userId };
        if (activityType) {
            whereClause.activityType = activityType;
        }

        const activities = await prisma.activityLog.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            skip: parseInt(offset),
            take: parseInt(limit)
        });

        const total = await prisma.activityLog.count({
            where: whereClause
        });

        res.json({
            success: true,
            data: {
                activities,
                pagination: {
                    total,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    hasMore: (parseInt(offset) + parseInt(limit)) < total
                }
            }
        });

    } catch (error) {
        console.error('❌ [Reputation API] Get activity error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user activity',
            error: error.message
        });
    }
});

/**
 * GET /api/reputation/leaderboard/:type
 * Get leaderboard by type (global, tier, creators, clients, rising, clans)
 */
router.get('/leaderboard/:type', async (req, res) => {
    try {
        const { type } = req.params;
        const {
            limit = 100,
            offset = 0,
            tier,
            minScore,
            verified
        } = req.query;

        const filters = {};
        if (tier) filters.tier = tier;
        if (minScore) filters.minScore = parseFloat(minScore);
        if (verified === 'true') filters.verified = true;

        const leaderboard = await leaderboardService.getLeaderboard(
            type,
            parseInt(limit),
            parseInt(offset),
            filters
        );

        res.json({
            success: true,
            data: leaderboard
        });

    } catch (error) {
        console.error('❌ [Reputation API] Get leaderboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get leaderboard',
            error: error.message
        });
    }
});

/**
 * GET /api/reputation/stats/overview
 * Get overall reputation system statistics
 */
router.get('/stats/overview', async (req, res) => {
    try {
        // Get tier distribution
        const tierStats = await prisma.reputationScore.groupBy({
            by: ['level'],
            _count: {
                level: true
            },
            _avg: {
                totalScore: true
            }
        });

        // Get total users
        const totalUsers = await prisma.reputationScore.count();

        // Get top performers
        const topPerformers = await prisma.reputationScore.findMany({
            orderBy: { totalScore: 'desc' },
            take: 10,
            select: {
                userId: true,
                totalScore: true,
                level: true
            }
        });

        // Get activity stats
        const recentDate = new Date();
        recentDate.setDate(recentDate.getDate() - 7); // Last 7 days

        const recentActivity = await prisma.activityLog.count({
            where: {
                createdAt: { gte: recentDate }
            }
        });

        // Get score ranges
        const scoreStats = await prisma.reputationScore.aggregate({
            _avg: { totalScore: true },
            _max: { totalScore: true },
            _min: { totalScore: true }
        });

        res.json({
            success: true,
            data: {
                overview: {
                    totalUsers,
                    avgScore: scoreStats._avg.totalScore || 0,
                    maxScore: scoreStats._max.totalScore || 0,
                    minScore: scoreStats._min.totalScore || 0,
                    recentActivity
                },
                levelDistribution: tierStats.reduce((acc, level) => {
                    acc[level.level] = {
                        count: level._count.level,
                        avgScore: level._avg.totalScore
                    };
                    return acc;
                }, {}),
                topPerformers
            }
        });

    } catch (error) {
        console.error('❌ [Reputation API] Get stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get reputation statistics',
            error: error.message
        });
    }
});

/**
 * POST /api/reputation/leaderboard/refresh
 * Manually refresh leaderboard cache
 */
router.post('/leaderboard/refresh', async (req, res) => {
    try {
        await leaderboardService.updateLeaderboardCache();

        res.json({
            success: true,
            message: 'Leaderboard cache refreshed successfully'
        });

    } catch (error) {
        console.error('❌ [Reputation API] Refresh cache error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to refresh leaderboard cache',
            error: error.message
        });
    }
});

/**
 * GET /api/reputation/badges/available
 * Get list of all available badges and their requirements
 */
router.get('/badges/available', async (req, res) => {
    try {
        const badges = [
            {
                id: 'CENTURY_CREATOR',
                name: 'Century Creator',
                description: 'Complete 100 gigs',
                requirement: 'gigsCompleted >= 100',
                icon: '🏆',
                rarity: 'RARE'
            },
            {
                id: 'LEGENDARY_CREATOR',
                name: 'Legendary Creator',
                description: 'Complete 500 gigs',
                requirement: 'gigsCompleted >= 500',
                icon: '👑',
                rarity: 'LEGENDARY'
            },
            {
                id: 'EXCELLENCE_MASTER',
                name: 'Excellence Master',
                description: 'Maintain 4.8+ average rating',
                requirement: 'averageRating >= 4.8',
                icon: '⭐',
                rarity: 'EPIC'
            },
            {
                id: 'QUALITY_PROFESSIONAL',
                name: 'Quality Professional',
                description: 'Maintain 4.5+ average rating',
                requirement: 'averageRating >= 4.5',
                icon: '💎',
                rarity: 'RARE'
            },
            {
                id: 'COMMUNITY_FAVORITE',
                name: 'Community Favorite',
                description: 'Receive 50+ boosts',
                requirement: 'boostsReceived >= 50',
                icon: '❤️',
                rarity: 'UNCOMMON'
            },
            {
                id: 'RELIABLE_PARTNER',
                name: 'Reliable Partner',
                description: '90%+ application success rate',
                requirement: 'applicationSuccess >= 0.9',
                icon: '🤝',
                rarity: 'RARE'
            },
            {
                id: 'DEADLINE_CHAMPION',
                name: 'Deadline Champion',
                description: '98%+ on-time completion rate',
                requirement: 'completionRate >= 0.98',
                icon: '⏰',
                rarity: 'EPIC'
            },
            {
                id: 'LIGHTNING_RESPONDER',
                name: 'Lightning Responder',
                description: 'Average response time under 2 hours',
                requirement: 'responseTime <= 2',
                icon: '⚡',
                rarity: 'UNCOMMON'
            },
            {
                id: 'VERIFIED_CREATOR',
                name: 'Verified Creator',
                description: 'Complete verification process',
                requirement: 'isVerified === true',
                icon: '✅',
                rarity: 'COMMON'
            }
        ];

        res.json({
            success: true,
            data: { badges }
        });

    } catch (error) {
        console.error('❌ [Reputation API] Get badges error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get available badges',
            error: error.message
        });
    }
});

module.exports = router;
