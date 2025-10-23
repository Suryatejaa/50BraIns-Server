const express = require('express');
const WorkHistoryService = require('../services/workHistory.service');
const ReputationIntegrationService = require('../services/reputationIntegration.service');
const RedisService = require('../services/redis.service');
const Logger = require('../utils/logger');

const router = express.Router();

// Replace the router.get('/user/:userId', ...) function:

/**
 * @route GET /api/summary/user/:userId
 * @desc Get comprehensive user summary
 * @access Public
 */
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        Logger.info(`Fetching user summary for ${userId}`);

        // Get work summary first (this is the core data)
        const workSummary = await WorkHistoryService.getUserWorkSummary(userId);

        // Initialize response data with work summary
        const summary = {
            userId,
            workSummary,
            reputation: null,
            recentAchievements: [],
            topSkills: [],
            recentWork: [],
            profileStrength: null,
            lastUpdated: new Date()
        };

        // Get reputation data with timeout and error handling
        try {
            const reputationPromise = ReputationIntegrationService.getUserReputationData(userId);
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Reputation service timeout')), 3000)
            );

            summary.reputation = await Promise.race([reputationPromise, timeoutPromise]);
        } catch (repError) {
            Logger.errorWithContext('Failed to fetch reputation data', repError, {
                userId,
                requestId: req.headers['x-request-id']
            });

            // Provide default reputation data
            summary.reputation = {
                totalScore: 0,
                level: 'NEWCOMER',
                totalReviews: 0,
                averageRating: 0,
                badges: [],
                trustLevel: 'new'
            };
        }

        // Get remaining data with error handling (non-blocking)
        try {
            const [achievements, skills, recentWork] = await Promise.allSettled([
                // Recent achievements
                WorkHistoryService.prisma.achievement.findMany({
                    where: {
                        userId: userId,
                        verified: true,
                        OR: [
                            { expiresAt: null },
                            { expiresAt: { gt: new Date() } }
                        ]
                    },
                    orderBy: { achievedAt: 'desc' },
                    take: 5
                }),

                // Top skills
                WorkHistoryService.prisma.skillProficiency.findMany({
                    where: { userId: userId },
                    orderBy: [
                        { score: 'desc' },
                        { projectCount: 'desc' }
                    ],
                    take: 10
                }),

                // Recent work
                WorkHistoryService.prisma.workRecord.findMany({
                    where: { userId },
                    orderBy: { completedAt: 'desc' },
                    take: 5,
                    select: {
                        id: true,
                        gigId: true,
                        title: true,
                        category: true,
                        completedAt: true,
                        clientRating: true,
                        verified: true,
                        actualBudget: true
                    }
                })
            ]);

            // Process results
            summary.recentAchievements = achievements.status === 'fulfilled' ? achievements.value : [];
            summary.topSkills = skills.status === 'fulfilled' ? skills.value : [];
            summary.recentWork = recentWork.status === 'fulfilled' ? recentWork.value : [];

            // Calculate profile strength
            summary.profileStrength = calculateProfileStrength(
                summary.workSummary,
                summary.recentAchievements,
                summary.topSkills
            );

        } catch (dataError) {
            Logger.errorWithContext('Error fetching additional user data', dataError, {
                userId,
                requestId: req.headers['x-request-id']
            });

            // Profile strength with just work summary
            summary.profileStrength = calculateProfileStrength(summary.workSummary, [], []);
        }

        Logger.info(`Successfully fetched user summary for ${userId}`);

        res.status(200).json({
            success: true,
            data: summary
        });

    } catch (error) {
        Logger.errorWithContext('Error fetching user summary', error, {
            userId: req.params.userId,
            requestId: req.headers['x-request-id']
        });

        res.status(500).json({
            success: false,
            message: 'Failed to fetch user summary',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

/**
 * @route GET /api/summary/leaderboards
 * @desc Get various leaderboards
 * @access Public
 */
router.get('/leaderboards', async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        const limitNum = parseInt(limit);

        Logger.info(`Fetching leaderboards with limit ${limitNum}`);

        // Initialize default leaderboard data
        let ratingLeaderboard = [];
        let projectsLeaderboard = [];
        let deliveryLeaderboard = [];

        // Try to get leaderboards from Redis (cached) with fallback
        try {
            const leaderboardPromises = [
                RedisService.getLeaderboard('rating', limitNum),
                RedisService.getLeaderboard('projects', limitNum),
                RedisService.getLeaderboard('delivery', limitNum)
            ];

            const results = await Promise.allSettled(leaderboardPromises);

            ratingLeaderboard = results[0].status === 'fulfilled' ? results[0].value : [];
            projectsLeaderboard = results[1].status === 'fulfilled' ? results[1].value : [];
            deliveryLeaderboard = results[2].status === 'fulfilled' ? results[2].value : [];

            // If Redis data is empty or failed, fallback to database
            if (ratingLeaderboard.length === 0 || projectsLeaderboard.length === 0 || deliveryLeaderboard.length === 0) {
                Logger.info('Redis leaderboards empty or failed, falling back to database');

                // Get leaderboards from database as fallback
                const [ratingDb, projectsDb, deliveryDb] = await Promise.allSettled([
                    WorkHistoryService.prisma.workSummary.findMany({
                        where: {
                            averageRating: { gt: 0 },
                            totalRatings: { gte: 3 }
                        },
                        orderBy: { averageRating: 'desc' },
                        take: limitNum,
                        select: { userId: true, averageRating: true }
                    }),

                    WorkHistoryService.prisma.workSummary.findMany({
                        where: { completedProjects: { gt: 0 } },
                        orderBy: { completedProjects: 'desc' },
                        take: limitNum,
                        select: { userId: true, completedProjects: true }
                    }),

                    WorkHistoryService.prisma.workSummary.findMany({
                        where: {
                            onTimeDeliveryRate: { gt: 0 },
                            completedProjects: { gte: 5 }
                        },
                        orderBy: { onTimeDeliveryRate: 'desc' },
                        take: limitNum,
                        select: { userId: true, onTimeDeliveryRate: true }
                    })
                ]);

                // Convert database results to leaderboard format
                if (ratingLeaderboard.length === 0 && ratingDb.status === 'fulfilled') {
                    ratingLeaderboard = ratingDb.value.map((item, index) => ({
                        score: item.averageRating,
                        value: item.userId
                    }));
                }

                if (projectsLeaderboard.length === 0 && projectsDb.status === 'fulfilled') {
                    projectsLeaderboard = projectsDb.value.map((item, index) => ({
                        score: item.completedProjects,
                        value: item.userId
                    }));
                }

                if (deliveryLeaderboard.length === 0 && deliveryDb.status === 'fulfilled') {
                    deliveryLeaderboard = deliveryDb.value.map((item, index) => ({
                        score: item.onTimeDeliveryRate,
                        value: item.userId
                    }));
                }
            }

        } catch (redisError) {
            Logger.errorWithContext('Redis leaderboards failed, using database fallback', redisError, {
                requestId: req.headers['x-request-id']
            });

            // Database fallback for all leaderboards
            try {
                const [ratingDb, projectsDb, deliveryDb] = await Promise.all([
                    WorkHistoryService.prisma.workSummary.findMany({
                        where: {
                            averageRating: { gt: 0 },
                            totalRatings: { gte: 3 }
                        },
                        orderBy: { averageRating: 'desc' },
                        take: limitNum,
                        select: { userId: true, averageRating: true }
                    }),

                    WorkHistoryService.prisma.workSummary.findMany({
                        where: { completedProjects: { gt: 0 } },
                        orderBy: { completedProjects: 'desc' },
                        take: limitNum,
                        select: { userId: true, completedProjects: true }
                    }),

                    WorkHistoryService.prisma.workSummary.findMany({
                        where: {
                            onTimeDeliveryRate: { gt: 0 },
                            completedProjects: { gte: 5 }
                        },
                        orderBy: { onTimeDeliveryRate: 'desc' },
                        take: limitNum,
                        select: { userId: true, onTimeDeliveryRate: true }
                    })
                ]);

                ratingLeaderboard = ratingDb.map(item => ({ score: item.averageRating, value: item.userId }));
                projectsLeaderboard = projectsDb.map(item => ({ score: item.completedProjects, value: item.userId }));
                deliveryLeaderboard = deliveryDb.map(item => ({ score: item.onTimeDeliveryRate, value: item.userId }));

            } catch (dbError) {
                Logger.errorWithContext('Database leaderboard fallback also failed', dbError, {
                    requestId: req.headers['x-request-id']
                });
                // Return empty leaderboards if everything fails
            }
        }

        // Get top achievers (most achievements) - always from database
        let achievementLeaderboard = [];
        try {
            const achievementData = await WorkHistoryService.prisma.achievement.groupBy({
                by: ['userId'],
                where: {
                    verified: true,
                    OR: [
                        { expiresAt: null },
                        { expiresAt: { gt: new Date() } }
                    ]
                },
                _count: {
                    id: true
                },
                orderBy: {
                    _count: {
                        id: 'desc'
                    }
                },
                take: limitNum
            });

            achievementLeaderboard = achievementData.map((entry, index) => ({
                rank: index + 1,
                userId: entry.userId,
                score: entry._count.id,
                type: 'achievements'
            }));

        } catch (achievementError) {
            Logger.errorWithContext('Error fetching achievement leaderboard', achievementError, {
                requestId: req.headers['x-request-id']
            });
        }

        res.status(200).json({
            success: true,
            data: {
                rating: formatLeaderboard(ratingLeaderboard, 'rating'),
                projects: formatLeaderboard(projectsLeaderboard, 'projects'),
                delivery: formatLeaderboard(deliveryLeaderboard, 'delivery'),
                achievements: achievementLeaderboard
            },
            meta: {
                limit: limitNum,
                generatedAt: new Date()
            }
        });

    } catch (error) {
        Logger.errorWithContext('Error fetching leaderboards', error, {
            requestId: req.headers['x-request-id']
        });

        res.status(500).json({
            success: false,
            message: 'Failed to fetch leaderboards',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

/**
 * @route GET /api/summary/platform-stats
 * @desc Get platform-wide statistics
 * @access Public
 */
router.get('/platform-stats', async (req, res) => {
    try {
        // Get overall platform statistics
        const [
            totalUsers,
            totalProjects,
            totalAchievements,
            avgRating,
            topCategories,
            topSkills
        ] = await Promise.all([
            // Total unique users with work history
            WorkHistoryService.prisma.workSummary.count(),

            // Total completed projects
            WorkHistoryService.prisma.workRecord.count(),

            // Total active achievements
            WorkHistoryService.prisma.achievement.count({
                where: {
                    verified: true,
                    OR: [
                        { expiresAt: null },
                        { expiresAt: { gt: new Date() } }
                    ]
                }
            }),

            // Platform average rating
            WorkHistoryService.prisma.workRecord.aggregate({
                where: { clientRating: { not: null } },
                _avg: { clientRating: true }
            }),

            // Top project categories
            WorkHistoryService.prisma.workRecord.groupBy({
                by: ['category'],
                _count: { id: true },
                orderBy: { _count: { id: 'desc' } },
                take: 10
            }),

            // Top skills
            WorkHistoryService.prisma.skillProficiency.groupBy({
                by: ['skill'],
                _count: { id: true },
                _avg: { score: true },
                orderBy: { _count: { id: 'desc' } },
                take: 15
            })
        ]);

        // Get recent activity (last 30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const recentActivity = await WorkHistoryService.prisma.workRecord.count({
            where: {
                completedAt: { gte: thirtyDaysAgo }
            }
        });

        const stats = {
            overview: {
                totalUsers,
                totalProjects,
                totalAchievements,
                averageRating: avgRating._avg.clientRating || 0,
                recentActivity
            },
            categories: topCategories.map(cat => ({
                category: cat.category,
                count: cat._count.id
            })),
            skills: topSkills.map(skill => ({
                skill: skill.skill,
                userCount: skill._count.id,
                averageScore: Math.round(skill._avg.score * 100) / 100
            })),
            generatedAt: new Date()
        };

        res.status(200).json({
            success: true,
            data: stats
        });

    } catch (error) {
        Logger.errorWithContext('Error fetching platform stats', error, {
            requestId: req.headers['x-request-id']
        });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch platform statistics'
        });
    }
});

/**
 * @route GET /api/summary/trending
 * @desc Get trending skills, categories, and achievements
 * @access Public
 */
router.get('/trending', async (req, res) => {
    try {
        const { period = '30' } = req.query;
        const daysAgo = parseInt(period);
        const startDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

        // Trending skills (most used in recent work)
        const trendingSkills = await WorkHistoryService.prisma.workRecord.findMany({
            where: {
                completedAt: { gte: startDate }
            },
            select: { skills: true }
        });

        const skillCounts = {};
        trendingSkills.forEach(record => {
            record.skills.forEach(skill => {
                skillCounts[skill] = (skillCounts[skill] || 0) + 1;
            });
        });

        const topTrendingSkills = Object.entries(skillCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([skill, count]) => ({ skill, count }));

        // Trending categories
        const trendingCategories = await WorkHistoryService.prisma.workRecord.groupBy({
            by: ['category'],
            where: {
                completedAt: { gte: startDate }
            },
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 8
        });

        // Recent achievements (trending achievement types)
        const recentAchievements = await WorkHistoryService.prisma.achievement.groupBy({
            by: ['type'],
            where: {
                achievedAt: { gte: startDate },
                verified: true
            },
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } }
        });

        res.status(200).json({
            success: true,
            data: {
                period: `${daysAgo} days`,
                skills: topTrendingSkills,
                categories: trendingCategories.map(cat => ({
                    category: cat.category,
                    count: cat._count.id
                })),
                achievements: recentAchievements.map(ach => ({
                    type: ach.type,
                    count: ach._count.id
                })),
                generatedAt: new Date()
            }
        });

    } catch (error) {
        Logger.errorWithContext('Error fetching trending data', error, {
            requestId: req.headers['x-request-id']
        });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch trending data'
        });
    }
});

/**
 * Helper function to calculate profile strength
 */
function calculateProfileStrength(workSummary, achievements, skills) {
    let strength = 0;
    let maxStrength = 100;

    // Work completion strength (40 points max)
    if (workSummary.completedProjects > 0) {
        strength += Math.min(workSummary.completedProjects * 2, 20); // Up to 20 points
        strength += Math.min(workSummary.averageRating * 4, 20); // Up to 20 points
    }

    // Achievement strength (30 points max)
    if (achievements.length > 0) {
        strength += Math.min(achievements.length * 3, 30);
    }

    // Skill diversity strength (20 points max)
    if (skills.length > 0) {
        strength += Math.min(skills.length * 2, 20);
    }

    // Verification strength (10 points max)
    if (workSummary.verificationLevel !== 'unverified') {
        strength += 10;
    }

    return {
        score: Math.min(strength, maxStrength),
        maxScore: maxStrength,
        percentage: Math.round((Math.min(strength, maxStrength) / maxStrength) * 100),
        level: getStrengthLevel(Math.min(strength, maxStrength))
    };
}

/**
 * Helper function to get strength level
 */
function getStrengthLevel(score) {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Strong';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Developing';
}

/**
 * Helper function to format leaderboard data
 */
function formatLeaderboard(leaderboardData, type) {
    if (!Array.isArray(leaderboardData)) return [];

    return leaderboardData.map((entry, index) => ({
        rank: index + 1,
        userId: typeof entry === 'object' ? entry.value : entry,
        score: typeof entry === 'object' ? entry.score : 0,
        type
    }));
}

module.exports = router;
